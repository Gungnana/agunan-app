from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

# Monkeypatch kompatibilitas passlib dengan bcrypt versi terbaru pada Python 3.12+
try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        class About:
            __version__ = getattr(bcrypt, "__version__", "4.0.1")
        bcrypt.__about__ = About()
except Exception:
    pass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikasi kecocokan password polos dengan hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Enkripsi password menggunakan algoritma bcrypt."""
    return pwd_context.hash(password)


def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Membuat JSON Web Token (JWT) dengan klaim subject, role, dan tanggal kedaluwarsa."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Mendekode token JWT dan mengembalikan payload jika valid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
