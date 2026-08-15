"""
qr_generator.py – QR code generation for evidence court verification.
Generates a QR code containing the verification URL and evidence hash.
Returns base64-encoded PNG for API response.
"""

import base64
import io
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer


def generate_evidence_qr(evidence_id: str, sha256_hash: str, base_url: str = "http://localhost:5000") -> str:
    """
    Generate a QR code for evidence verification.

    Args:
        evidence_id: The evidence UUID.
        sha256_hash: SHA-256 hash of the evidence file.
        base_url:    Base URL of the API server.

    Returns:
        Base64-encoded PNG string of the QR code.
    """
    verification_url = f"{base_url}/api/court/verify/{sha256_hash}"

    payload = (
        f"CYBERFORENSICS EVIDENCE VERIFICATION\n"
        f"Evidence ID: {evidence_id}\n"
        f"SHA-256: {sha256_hash}\n"
        f"Verify at: {verification_url}"
    )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=2,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    try:
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            back_color=(10, 14, 26),
            fill_color=(0, 212, 255),
        )
    except Exception:
        # Fallback to basic QR if styled version fails
        img = qr.make_image(back_color=(10, 14, 26), fill_color=(0, 212, 255))

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_verification_badge_qr(hash_value: str, case_id: str, court: str = "CyberCrime Court") -> str:
    """
    Generate a compact court badge QR for printable evidence labels.
    """
    payload = f"COURT EVIDENCE | {court} | Case: {case_id} | Hash: {hash_value[:32]}..."

    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=1)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")
