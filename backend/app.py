# -*- coding: utf-8 -*-
import sys, io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
app.py – Main Flask application for the Evidence Chain of Custody System.
Provides REST API for evidence management, blockchain ledger, auth, and court verification.
"""

import hashlib
import os
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, get_jwt,
)

import blockchain
import auth as auth_module
from ai_summary import generate_evidence_summary, classify_evidence
from qr_generator import generate_evidence_qr

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__, static_folder="uploads")
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "cyberforensics-super-secret-2024-jwt")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=10)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------------------------------------------------------------------
# MongoDB setup (graceful fallback)
# ---------------------------------------------------------------------------

mongo_db = None
_evidence_store: list[dict] = []
_access_log_store: list[dict] = []
_users_store: dict = {}

try:
    from pymongo import MongoClient
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    client.server_info()
    mongo_db = client["evidence_chain_db"]
    auth_module.seed_users_to_db(mongo_db)
    print("[DB] Connected to MongoDB [OK]")
except Exception as e:
    print(f"[DB] MongoDB unavailable. Using in-memory fallback [OK]")


def _col(name):
    """Get MongoDB collection or None."""
    return mongo_db[name] if mongo_db is not None else None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha256_file(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _log_access(evidence_id: str, action: str, reason: str = "", user_info: dict = None):
    """Record an access event to MongoDB + blockchain."""
    if user_info is None:
        user_info = {}
    record = {
        "id":           str(uuid.uuid4()),
        "evidence_id":  evidence_id,
        "action":       action,
        "username":     user_info.get("username", "system"),
        "name":         user_info.get("name", "System"),
        "role":         user_info.get("role", "system"),
        "reason":       reason,
        "ip_address":   request.remote_addr,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }
    # Persist
    col = _col("access_logs")
    if col is not None:
        col.insert_one({**record, "_id": record["id"]})
    else:
        _access_log_store.append(record)

    # Write to blockchain
    blockchain.write_block({
        "type":        "ACCESS_LOG",
        "evidence_id": evidence_id,
        "action":      action,
        "username":    record["username"],
        "role":        record["role"],
        "reason":      reason,
        "ip":          record["ip_address"],
        "timestamp":   record["timestamp"],
    })
    return record


def _get_evidence_list() -> list[dict]:
    col = _col("evidence")
    if col is not None:
        return list(col.find({}, {"_id": 0}))
    return _evidence_store


def _get_evidence_by_id(eid: str) -> dict | None:
    col = _col("evidence")
    if col is not None:
        return col.find_one({"id": eid}, {"_id": 0})
    return next((e for e in _evidence_store if e["id"] == eid), None)


def _get_evidence_by_hash(sha: str) -> dict | None:
    col = _col("evidence")
    if col is not None:
        return col.find_one({"sha256_hash": sha}, {"_id": 0})
    return next((e for e in _evidence_store if e["sha256_hash"] == sha), None)


def _insert_evidence(record: dict):
    col = _col("evidence")
    if col is not None:
        col.insert_one({**record, "_id": record["id"]})
    else:
        _evidence_store.append(record)


def _get_access_logs(evidence_id: str = None) -> list[dict]:
    col = _col("access_logs")
    if col is not None:
        query = {"evidence_id": evidence_id} if evidence_id else {}
        return list(col.find(query, {"_id": 0}).sort("timestamp", -1).limit(500))
    logs = _access_log_store
    if evidence_id:
        logs = [l for l in logs if l.get("evidence_id") == evidence_id]
    return sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    password = data.get("password", "")

    user = auth_module.find_user(username)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    pw_ok = bcrypt.checkpw(password.encode(), user["password_hash"].encode())
    if not pw_ok:
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.get("active", True):
        return jsonify({"error": "Account is disabled"}), 403

    auth_module.update_last_login(username)

    additional_claims = {
        "role":     user["role"],
        "name":     user["name"],
        "badge_id": user.get("badge_id", ""),
    }
    access_token = create_access_token(identity=username, additional_claims=additional_claims)

    return jsonify({
        "access_token": access_token,
        "user": {
            "username": username,
            "name":     user["name"],
            "role":     user["role"],
            "badge_id": user.get("badge_id", ""),
            "role_info": auth_module.ROLES.get(user["role"], {}),
        },
    })


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({
        "username": get_jwt_identity(),
        "name":     claims.get("name"),
        "role":     claims.get("role"),
        "badge_id": claims.get("badge_id"),
        "role_info": auth_module.ROLES.get(claims.get("role", ""), {}),
    })


@app.route("/api/auth/users", methods=["GET"])
@jwt_required()
def list_users():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin only"}), 403
    return jsonify({"users": auth_module.get_all_users(), "roles": auth_module.ROLES})


# ---------------------------------------------------------------------------
# Evidence routes
# ---------------------------------------------------------------------------

@app.route("/api/evidence/upload", methods=["POST"])
@jwt_required()
def upload_evidence():
    claims = get_jwt()
    user_role = claims.get("role", "")
    allowed = ["admin", "investigator", "forensic_analyst"]
    if user_role not in allowed:
        return jsonify({"error": "Insufficient permissions to upload evidence"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    case_id        = request.form.get("case_id", "CASE-UNKNOWN")
    description    = request.form.get("description", "")
    access_reason  = request.form.get("access_reason", "Evidence upload")
    case_name      = request.form.get("case_name", "Untitled Case")

    # Save file
    evidence_id  = str(uuid.uuid4())
    safe_name    = f"{evidence_id}_{file.filename}"
    save_path    = os.path.join(UPLOAD_FOLDER, safe_name)
    file.save(save_path)

    # Compute hash
    sha256_hash = _sha256_file(save_path)
    filesize    = os.path.getsize(save_path)

    # Check for duplicate hash
    existing = _get_evidence_by_hash(sha256_hash)
    if existing:
        os.remove(save_path)
        return jsonify({
            "warning": "Duplicate evidence detected",
            "message": "A file with the same SHA-256 hash already exists on the blockchain.",
            "existing_id": existing["id"],
            "sha256_hash": sha256_hash,
        }), 409

    # AI summary
    user_info = {
        "username": get_jwt_identity(),
        "name": claims.get("name"),
        "role": user_role,
    }
    ai_data = generate_evidence_summary(
        file.filename, filesize, sha256_hash, claims.get("name", "Unknown")
    )

    # QR code
    qr_data = generate_evidence_qr(
        evidence_id, sha256_hash,
        base_url=request.host_url.rstrip("/")
    )

    # Build record
    now = datetime.now(timezone.utc).isoformat()
    evidence_record = {
        "id":            evidence_id,
        "case_id":       case_id,
        "case_name":     case_name,
        "original_name": file.filename,
        "stored_name":   safe_name,
        "sha256_hash":   sha256_hash,
        "filesize":      filesize,
        "mimetype":      file.content_type or "application/octet-stream",
        "description":   description,
        "uploader":      get_jwt_identity(),
        "uploader_name": claims.get("name"),
        "uploader_role": user_role,
        "uploaded_at":   now,
        "ai_summary":    ai_data,
        "qr_code":       qr_data,
        "status":        "ACTIVE",
        "verification_count": 0,
        "last_verified": None,
    }
    _insert_evidence(evidence_record)

    # Write to blockchain
    block = blockchain.write_block({
        "type":          "EVIDENCE_UPLOAD",
        "evidence_id":   evidence_id,
        "case_id":       case_id,
        "filename":      file.filename,
        "evidence_hash": sha256_hash,
        "filesize":      filesize,
        "evidence_type": ai_data["evidence_type"],
        "risk_level":    ai_data["risk_level"],
        "uploader":      get_jwt_identity(),
        "timestamp":     now,
    })

    # Log access
    _log_access(evidence_id, "UPLOAD", access_reason, user_info)

    return jsonify({
        "success":     True,
        "evidence_id": evidence_id,
        "sha256_hash": sha256_hash,
        "block_index": block["index"],
        "block_hash":  block["block_hash"],
        "ai_summary":  ai_data,
        "qr_code":     qr_data,
        "message":     "Evidence successfully recorded on blockchain ledger.",
    }), 201


@app.route("/api/evidence", methods=["GET"])
@jwt_required()
def list_evidence():
    claims = get_jwt()
    user_info = {
        "username": get_jwt_identity(),
        "name": claims.get("name"),
        "role": claims.get("role"),
    }
    items = _get_evidence_list()
    # Remove stored_name / file path from response for security
    safe_items = []
    for e in items:
        item = {k: v for k, v in e.items() if k not in ("stored_name", "qr_code")}
        safe_items.append(item)
    return jsonify({"evidence": safe_items, "total": len(safe_items)})


@app.route("/api/evidence/<evidence_id>", methods=["GET"])
@jwt_required()
def get_evidence(evidence_id):
    claims = get_jwt()
    user_info = {
        "username": get_jwt_identity(),
        "name": claims.get("name"),
        "role": claims.get("role"),
    }
    ev = _get_evidence_by_id(evidence_id)
    if not ev:
        return jsonify({"error": "Evidence not found"}), 404

    _log_access(evidence_id, "VIEW", "Evidence detail view", user_info)

    # Get blockchain blocks for this evidence
    blocks = blockchain.get_blocks_for_evidence(evidence_id)

    return jsonify({
        "evidence": {k: v for k, v in ev.items() if k != "stored_name"},
        "blockchain_blocks": blocks,
        "access_logs": _get_access_logs(evidence_id),
    })


@app.route("/api/evidence/<evidence_id>/verify", methods=["GET"])
@jwt_required()
def verify_evidence(evidence_id):
    claims = get_jwt()
    user_info = {
        "username": get_jwt_identity(),
        "name": claims.get("name"),
        "role": claims.get("role"),
    }
    ev = _get_evidence_by_id(evidence_id)
    if not ev:
        return jsonify({"error": "Evidence not found"}), 404

    reason = request.args.get("reason", "Integrity verification")
    _log_access(evidence_id, "VERIFY", reason, user_info)

    # Re-hash from stored file
    stored_path = os.path.join(UPLOAD_FOLDER, ev["stored_name"])
    if not os.path.exists(stored_path):
        return jsonify({"error": "Evidence file not found on disk"}), 500

    current_hash = _sha256_file(stored_path)
    original_hash = ev["sha256_hash"]
    is_intact = current_hash == original_hash

    # Find original blockchain block
    ledger_block = blockchain.find_evidence_block(original_hash)

    # Update verification count
    col = _col("evidence")
    if col is not None:
        col.update_one(
            {"id": evidence_id},
            {"$inc": {"verification_count": 1}, "$set": {"last_verified": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        for e in _evidence_store:
            if e["id"] == evidence_id:
                e["verification_count"] = e.get("verification_count", 0) + 1
                e["last_verified"] = datetime.now(timezone.utc).isoformat()

    # Write verification to blockchain
    blockchain.write_block({
        "type":          "VERIFICATION",
        "evidence_id":   evidence_id,
        "original_hash": original_hash,
        "current_hash":  current_hash,
        "is_intact":     is_intact,
        "verified_by":   get_jwt_identity(),
        "reason":        reason,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "evidence_id":   evidence_id,
        "original_hash": original_hash,
        "current_hash":  current_hash,
        "is_intact":     is_intact,
        "verdict":       "✅ EVIDENCE INTACT" if is_intact else "❌ EVIDENCE TAMPERED",
        "ledger_block":  ledger_block,
        "verified_by":   user_info.get("name"),
        "verified_at":   datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/evidence/<evidence_id>/qr", methods=["GET"])
@jwt_required()
def get_evidence_qr(evidence_id):
    ev = _get_evidence_by_id(evidence_id)
    if not ev:
        return jsonify({"error": "Evidence not found"}), 404

    qr_data = ev.get("qr_code") or generate_evidence_qr(
        evidence_id, ev["sha256_hash"],
        base_url=request.host_url.rstrip("/")
    )
    return jsonify({"evidence_id": evidence_id, "qr_code": qr_data})


# ---------------------------------------------------------------------------
# Blockchain ledger routes
# ---------------------------------------------------------------------------

@app.route("/api/blockchain/ledger", methods=["GET"])
@jwt_required()
def get_ledger():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    chain = blockchain.get_chain()

    # Reverse to show newest first
    chain_rev = list(reversed(chain))
    start = (page - 1) * limit
    end   = start + limit

    return jsonify({
        "blocks":      chain_rev[start:end],
        "total":       len(chain),
        "page":        page,
        "total_pages": max(1, (len(chain) + limit - 1) // limit),
        "stats":       blockchain.get_chain_stats(),
    })


@app.route("/api/blockchain/verify", methods=["GET"])
@jwt_required()
def verify_chain():
    result = blockchain.verify_chain()
    return jsonify(result)


@app.route("/api/blockchain/stats", methods=["GET"])
@jwt_required()
def chain_stats():
    return jsonify(blockchain.get_chain_stats())


# ---------------------------------------------------------------------------
# Access logs routes
# ---------------------------------------------------------------------------

@app.route("/api/access-logs", methods=["GET"])
@jwt_required()
def get_access_logs():
    claims = get_jwt()
    if claims.get("role") not in ["admin", "investigator"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    evidence_id = request.args.get("evidence_id")
    logs = _get_access_logs(evidence_id)
    return jsonify({"access_logs": logs, "total": len(logs)})


# ---------------------------------------------------------------------------
# Court verification (public endpoint)
# ---------------------------------------------------------------------------

@app.route("/api/court/verify/<sha256_hash>", methods=["GET"])
def court_verify(sha256_hash):
    """Public endpoint — no JWT required. Used by courts and law firms via QR code."""
    # Find in our store
    ev = _get_evidence_by_hash(sha256_hash)
    if not ev:
        # Try blockchain directly
        block = blockchain.find_evidence_block(sha256_hash)
        if block:
            return jsonify({
                "found": True,
                "source": "blockchain_only",
                "block": block,
                "warning": "Evidence metadata not in database. Blockchain record found.",
            })
        return jsonify({
            "found": False,
            "hash": sha256_hash,
            "message": "No evidence record found with this hash.",
        }), 404

    # Find blockchain block
    block = blockchain.find_evidence_block(sha256_hash)
    chain_integrity = blockchain.verify_chain()

    # Log court access
    col = _col("access_logs")
    log_record = {
        "id":          str(uuid.uuid4()),
        "evidence_id": ev["id"],
        "action":      "COURT_VERIFY",
        "username":    "court_public",
        "name":        "Public Court Portal",
        "role":        "court_viewer",
        "reason":      "Court verification via QR/hash lookup",
        "ip_address":  request.remote_addr,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }
    if col is not None:
        col.insert_one({**log_record, "_id": log_record["id"]})
    else:
        _access_log_store.append(log_record)

    return jsonify({
        "found":                True,
        "evidence_id":          ev["id"],
        "case_id":              ev["case_id"],
        "case_name":            ev.get("case_name", ""),
        "original_filename":    ev["original_name"],
        "sha256_hash":          sha256_hash,
        "filesize":             ev["filesize"],
        "evidence_type":        ev["ai_summary"]["evidence_type"],
        "risk_level":           ev["ai_summary"]["risk_level"],
        "uploaded_by":          ev["uploader_name"],
        "uploaded_at":          ev["uploaded_at"],
        "blockchain_block":     block,
        "chain_integrity":      chain_integrity["is_valid"],
        "verification_count":   ev.get("verification_count", 0),
        "last_verified":        ev.get("last_verified"),
        "status":               ev.get("status", "ACTIVE"),
        "verified_at":          datetime.now(timezone.utc).isoformat(),
        "certificate": {
            "issued_by":  "CyberForensics Evidence Chain v1.0",
            "standard":   "SHA-256 / Blockchain Immutable Ledger",
            "statement":  (
                "This digital evidence has been registered on an immutable blockchain ledger. "
                "The SHA-256 hash serves as a cryptographic fingerprint guaranteeing file integrity. "
                "Any modification to the original file will result in a different hash, "
                "detectable through the Verification Module."
            ),
        },
    })


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------

@app.route("/api/dashboard/stats", methods=["GET"])
@jwt_required()
def dashboard_stats():
    evidence_list = _get_evidence_list()
    chain_s = blockchain.get_chain_stats()
    access_logs = _get_access_logs()

    # Evidence by type
    by_type: dict[str, int] = {}
    by_risk: dict[str, int] = {}
    by_case: dict[str, int] = {}

    for ev in evidence_list:
        ai = ev.get("ai_summary", {})
        etype = ai.get("evidence_type", "Unknown")
        risk  = ai.get("risk_level", "UNKNOWN")
        case  = ev.get("case_id", "Unknown")

        by_type[etype] = by_type.get(etype, 0) + 1
        by_risk[risk]  = by_risk.get(risk, 0) + 1
        by_case[case]  = by_case.get(case, 0) + 1

    recent_uploads = sorted(
        evidence_list, key=lambda x: x.get("uploaded_at", ""), reverse=True
    )[:5]

    return jsonify({
        "totals": {
            "evidence_items": len(evidence_list),
            "blockchain_blocks": chain_s["total_blocks"],
            "access_events": len(access_logs),
            "active_cases": len(by_case),
        },
        "evidence_by_type": by_type,
        "evidence_by_risk": by_risk,
        "chain_stats": chain_s,
        "recent_uploads": [
            {k: v for k, v in e.items() if k not in ("stored_name", "qr_code", "ai_summary")}
            for e in recent_uploads
        ],
        "recent_access": access_logs[:10],
    })


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "online",
        "service":   "CyberForensics Evidence Chain API",
        "version":   "1.0.0",
        "db":        "mongodb" if mongo_db is not None else "in-memory",
        "blockchain": blockchain.get_chain_stats(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  CyberForensics Evidence Chain of Custody API")
    print("  Running at: http://localhost:5000")
    print("  Press Ctrl+C to stop")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
