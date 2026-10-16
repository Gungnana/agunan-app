from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

import tempfile

db_url = settings.DATABASE_URL or ""
if not db_url or "sqlite" in db_url:
    # Pada Vercel/serverless, folder root bersifat read-only sehingga sqlite harus ditulis ke /tmp
    db_url = f"sqlite:///{tempfile.gettempdir()}/db_analisa_agunan.db"
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine_kwargs = {
    "pool_pre_ping": True,
}

if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency injector untuk sesi database SQLAlchemy."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
