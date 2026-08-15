"""
auth.py – JWT authentication and role-based access control.
Manages user creation, login, and route-protection decorators.
Users are stored in MongoDB (or fallback in-memory store if Mongo is unavailable).
"""

import bcrypt
from datetime import datetime, timezone
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt


# ---------------------------------------------------------------------------
# Role definitions
# ---------------------------------------------------------------------------

ROLES = {
    "admin":            {"label": "System Administrator",  "color": "#ff6b6b", "level": 5},
    "investigator":     {"label": "Investigator",          "color": "#00d4ff", "level": 4},
    "forensic_analyst": {"label": "Forensic Analyst",      "color": "#a78bfa", "level": 3},
    "court_viewer":     {"label": "Court Viewer",          "color": "#ffd700", "level": 2},
    "law_firm":         {"label": "Law Firm",              "color": "#4ade80", "level": 1},
}

# Role permissions map: which roles can perform which actions
PERMISSIONS = {
    "upload_evidence":    ["admin", "investigator", "forensic_analyst"],
    "view_evidence":      ["admin", "investigator", "forensic_analyst", "court_viewer", "law_firm"],
    "delete_evidence":    ["admin"],
    "view_ledger":        ["admin", "investigator", "forensic_analyst", "court_viewer", "law_firm"],
    "verify_evidence":    ["admin", "investigator", "forensic_analyst", "court_viewer", "law_firm"],
    "view_access_logs":   ["admin", "investigator"],
    "manage_users":       ["admin"],
    "court_verify":       ["admin", "investigator", "forensic_analyst", "court_viewer", "law_firm"],
}


# ---------------------------------------------------------------------------
# Default seeded users (used when MongoDB is unavailable)
# ---------------------------------------------------------------------------

def _make_user(username, password, role, name, badge=""):
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return {
        "username": username,
        "password_hash": pw_hash,
        "role": role,
        "name": name,
        "badge_id": badge,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "active": True,
    }


SEED_USERS = [
    _make_user("admin",    "admin123",     "admin",            "System Admin",          "ADM-001"),
    _make_user("inv001",   "invest123",    "investigator",     "Det. Priya Sharma",     "INV-001"),
    _make_user("forensic", "forensic123",  "forensic_analyst", "Dr. Arjun Mehta",       "FOR-001"),
    _make_user("court",    "court123",     "court_viewer",     "Hon. Judge R. Verma",   "CRT-001"),
    _make_user("lawfirm",  "lawfirm123",   "law_firm",         "Adv. Kavya Nair",       "LAW-001"),
]

# In-memory fallback store
_fallback_users: dict[str, dict] = {u["username"]: u for u in SEED_USERS}


# ---------------------------------------------------------------------------
# User lookup (MongoDB-first, fallback to in-memory)
# ---------------------------------------------------------------------------

def _get_users_collection():
    """Return MongoDB users collection or None."""
    try:
        from app import mongo_db
        if mongo_db is not None:
            return mongo_db["users"]
    except Exception:
        pass
    return None


def find_user(username: str) -> dict | None:
    col = _get_users_collection()
    if col is not None:
        user = col.find_one({"username": username}, {"_id": 0})
        return user
    return _fallback_users.get(username)


def seed_users_to_db(db) -> None:
    """Seed default users into MongoDB if collection is empty."""
    col = db["users"]
    if col.count_documents({}) == 0:
        col.insert_many(SEED_USERS)
        print("[AUTH] Seeded default users into MongoDB.")


def update_last_login(username: str) -> None:
    col = _get_users_collection()
    now = datetime.now(timezone.utc).isoformat()
    if col is not None:
        col.update_one({"username": username}, {"$set": {"last_login": now}})
    elif username in _fallback_users:
        _fallback_users[username]["last_login"] = now


def get_all_users() -> list[dict]:
    col = _get_users_collection()
    if col is not None:
        return list(col.find({}, {"_id": 0, "password_hash": 0}))
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in _fallback_users.values()]


# ---------------------------------------------------------------------------
# Decorators
# ---------------------------------------------------------------------------

def roles_required(*required_roles):
    """Decorator: allow only users with one of the specified roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "")
            if user_role not in required_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Role '{user_role}' is not authorized for this action.",
                    "required_roles": list(required_roles),
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def permission_required(permission: str):
    """Decorator: allow only users who have the given permission."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "")
            allowed = PERMISSIONS.get(permission, [])
            if user_role not in allowed:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Permission '{permission}' required.",
                    "your_role": user_role,
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user_info() -> dict:
    """Return current user's JWT claims as a dict."""
    try:
        claims = get_jwt()
        return {
            "username": get_jwt_identity(),
            "role": claims.get("role"),
            "name": claims.get("name"),
            "badge_id": claims.get("badge_id"),
        }
    except Exception:
        return {}
