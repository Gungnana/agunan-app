import logging
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")


def init_database():
    """Inisialisasi tabel dan data akun awal (seeding) sistem."""
    logger.info("Membuat struktur tabel database...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed Pengguna Awal
        admin = db.query(User).filter(User.username == settings.INITIAL_ADMIN_USERNAME).first()
        if not admin and settings.INITIAL_ADMIN_PASSWORD:
            admin = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                full_name=settings.INITIAL_ADMIN_FULLNAME,
                hashed_password=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                role=UserRole.ANALIS,
                is_active=True,
            )
            db.add(admin)

        analis = db.query(User).filter(User.username == settings.INITIAL_ANALIS_USERNAME).first()
        if not analis and settings.INITIAL_ANALIS_PASSWORD:
            analis = User(
                username=settings.INITIAL_ANALIS_USERNAME,
                email=settings.INITIAL_ANALIS_EMAIL,
                full_name=settings.INITIAL_ANALIS_FULLNAME,
                hashed_password=get_password_hash(settings.INITIAL_ANALIS_PASSWORD),
                role=UserRole.ANALIS,
                is_active=True,
            )
            db.add(analis)

        db.commit()
        logger.info("Inisialisasi database dan akun awal selesai.")
    except Exception as e:
        db.rollback()
        logger.error(f"Gagal saat inisialisasi database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
