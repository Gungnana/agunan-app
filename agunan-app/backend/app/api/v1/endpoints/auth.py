from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import Token, UserResponse, UserCreate, UserLogin

router = APIRouter()


@router.post("/login", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login menggunakan username & password untuk mendapatkan token JWT Bearer.
    Mendukung format x-www-form-urlencoded untuk kompatibilitas OpenAPI Swagger.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        log_audit_event(
            db,
            action="LOGIN_GAGAL",
            user_id=user.id if user else None,
            entity_type="user",
            rincian={"username_attempt": form_data.username, "alasan": "Password atau username salah"},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password yang Anda masukkan salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun pengguna Anda dinonaktifkan.",
        )

    access_token = create_access_token(subject=user.username, role=user.role.value)

    log_audit_event(
        db,
        action="LOGIN_BERHASIL",
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        rincian={"role": user.role.value},
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
    }


@router.post("/login-json", response_model=Token)
def login_json(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    """Login alternatif menerima JSON payload langsung dari antarmuka React."""
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit_event(
            db,
            action="LOGIN_GAGAL",
            user_id=user.id if user else None,
            entity_type="user",
            rincian={"username_attempt": login_data.username},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password yang Anda masukkan salah.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun pengguna Anda dinonaktifkan.",
        )

    access_token = create_access_token(subject=user.username, role=user.role.value)

    log_audit_event(
        db,
        action="LOGIN_BERHASIL",
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        rincian={"role": user.role.value},
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Mendapatkan profil informasi pengguna yang sedang login."""
    return current_user


@router.post("/register", response_model=UserResponse)
def register_new_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pendaftaran akun baru (Hanya dapat diakses oleh peran ADMIN)."""
    existing_user = db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau email telah digunakan di sistem.",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
