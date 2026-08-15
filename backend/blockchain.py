"""
blockchain.py – Cryptographically-chained append-only ledger
Simulates Hyperledger Fabric block structure with SHA-256 block hashing.
Each block mirrors Fabric's data model: index, timestamp, data, previous_hash, block_hash.
For production: replace write_block() / get_chain() with Fabric SDK gateway calls.
"""

import hashlib
import json
import os
import time
from datetime import datetime, timezone


LEDGER_PATH = os.path.join(os.path.dirname(__file__), "blockchain_ledger.json")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_chain() -> list[dict]:
    """Load the persisted chain from disk, creating genesis block if needed."""
    if not os.path.exists(LEDGER_PATH):
        genesis = _create_genesis_block()
        _save_chain([genesis])
        return [genesis]
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_chain(chain: list[dict]) -> None:
    with open(LEDGER_PATH, "w", encoding="utf-8") as f:
        json.dump(chain, f, indent=2, ensure_ascii=False)


def _hash_block(block: dict) -> str:
    """Compute SHA-256 of a block (excluding its own hash field)."""
    block_copy = {k: v for k, v in block.items() if k != "block_hash"}
    raw = json.dumps(block_copy, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(raw).hexdigest()


def _create_genesis_block() -> dict:
    genesis = {
        "index": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "type": "GENESIS",
            "message": "Evidence Chain of Custody – Genesis Block",
            "system": "CyberForensics Blockchain v1.0",
        },
        "previous_hash": "0" * 64,
        "nonce": 0,
        "block_hash": "",
    }
    genesis["block_hash"] = _hash_block(genesis)
    return genesis


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def write_block(data: dict) -> dict:
    """
    Append a new block to the chain.

    Args:
        data: Arbitrary dict payload (evidence metadata, access log, etc.)

    Returns:
        The newly created block dict.
    """
    chain = _load_chain()
    previous_block = chain[-1]

    new_block = {
        "index": len(chain),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data,
        "previous_hash": previous_block["block_hash"],
        "nonce": int(time.time() * 1000) % 100000,
        "block_hash": "",
    }
    new_block["block_hash"] = _hash_block(new_block)

    chain.append(new_block)
    _save_chain(chain)
    return new_block


def get_chain() -> list[dict]:
    """Return the full blockchain."""
    return _load_chain()


def get_block_by_index(index: int) -> dict | None:
    chain = _load_chain()
    if 0 <= index < len(chain):
        return chain[index]
    return None


def verify_chain() -> dict:
    """
    Validate full chain integrity.
    Returns dict with is_valid bool and any tampered block indices.
    """
    chain = _load_chain()
    errors = []

    for i in range(1, len(chain)):
        current = chain[i]
        previous = chain[i - 1]

        # Recompute hash
        expected_hash = _hash_block(current)
        if current["block_hash"] != expected_hash:
            errors.append({"block_index": i, "reason": "Block hash mismatch"})

        # Check linkage
        if current["previous_hash"] != previous["block_hash"]:
            errors.append({"block_index": i, "reason": "Previous hash linkage broken"})

    return {
        "is_valid": len(errors) == 0,
        "total_blocks": len(chain),
        "errors": errors,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


def find_evidence_block(evidence_hash: str) -> dict | None:
    """Search the chain for a block containing the given evidence SHA-256 hash."""
    chain = _load_chain()
    for block in chain:
        data = block.get("data", {})
        if data.get("evidence_hash") == evidence_hash:
            return block
        # Also check access log blocks
        if data.get("file_hash") == evidence_hash:
            return block
    return None


def get_blocks_for_evidence(evidence_id: str) -> list[dict]:
    """Return all blocks related to a given evidence ID (uploads + access events)."""
    chain = _load_chain()
    results = []
    for block in chain:
        data = block.get("data", {})
        if data.get("evidence_id") == evidence_id:
            results.append(block)
    return results


def get_chain_stats() -> dict:
    chain = _load_chain()
    evidence_blocks = [b for b in chain if b["data"].get("type") == "EVIDENCE_UPLOAD"]
    access_blocks = [b for b in chain if b["data"].get("type") == "ACCESS_LOG"]
    verification_blocks = [b for b in chain if b["data"].get("type") == "VERIFICATION"]

    return {
        "total_blocks": len(chain),
        "evidence_blocks": len(evidence_blocks),
        "access_log_blocks": len(access_blocks),
        "verification_blocks": len(verification_blocks),
        "chain_height": len(chain) - 1,
        "genesis_timestamp": chain[0]["timestamp"] if chain else None,
        "latest_timestamp": chain[-1]["timestamp"] if chain else None,
    }
