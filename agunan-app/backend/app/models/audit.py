from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), index=True, nullable=False)  # e.g., "ANALISA_VALUASI", "OVERRIDE_PEMBANDING"
    entity_type = Column(String(50), nullable=True)  # e.g., "valuasi", "parameter", "pembanding"
    entity_id = Column(Integer, nullable=True)
    ip_address = Column(String(50), nullable=True)
    rincian_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
