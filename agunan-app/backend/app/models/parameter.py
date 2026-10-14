from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, JSON
from app.core.database import Base


class ParameterValuasi(Base):
    __tablename__ = "parameter_valuasi"

    id = Column(Integer, primary_key=True, index=True)
    versi = Column(String(50), unique=True, index=True, nullable=False)  # Contoh: "v1.0-SPI-2026"
    judul = Column(String(150), nullable=False)
    berlaku_dari = Column(Date, default=date.today, nullable=False)
    aktif = Column(Boolean, default=True, nullable=False)
    parameter_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(String(50), default="SYSTEM", nullable=False)
