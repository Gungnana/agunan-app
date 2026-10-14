from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit import AuditLog


# Daftar kata kunci data pribadi debitur (PII) yang wajib disensor
PII_KEYS = {
    "nama_debitur",
    "cif",
    "no_rekening",
    "nik",
    "npwp",
    "nomor_telepon",
    "email_debitur",
    "identitas",
}


def sanitize_pii(data: Any) -> Any:
    """
    Menyaring dan menyamarkan data pribadi debitur (PII) secara rekursif
    agar tidak tersimpan di log audit sesuai prinsip kepatuhan perbankan.
    """
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in PII_KEYS:
                sanitized[k] = "[REDACTED_PII]"
            else:
                sanitized[k] = sanitize_pii(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_pii(item) for item in data]
    return data


def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    rincian: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """
    Mencatat peristiwa audit ke tabel audit_log dengan penyaringan PII otomatis.
    """
    ip_addr = None
    if request:
        ip_addr = request.client.host if request.client else None
        # Periksa proxy forward header
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip_addr = forwarded.split(",")[0].strip()

    cleaned_rincian = sanitize_pii(rincian) if rincian else None

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_addr,
        rincian_json=cleaned_rincian,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
