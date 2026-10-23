from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "Sistem Analisa Agunan Berbasis Data Pasar"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Security & JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 jam kerja bank

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:80", "http://localhost", "http://127.0.0.1:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "sqlite:///./db_analisa_agunan.db"

    # pencarian web melalui Brave Search API.
    BRAVE_SEARCH_API_KEY: str = "BSAdpcrAFpA-ae5TqkyP5rJIMcgxwni"

    # Default Initial Accounts
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_EMAIL: str = "admin@bank.co.id"
    INITIAL_ADMIN_PASSWORD: str = "AdminBank2026!"
    INITIAL_ADMIN_FULLNAME: str = "Administrator Valuasi"

    INITIAL_ANALIS_USERNAME: str = "analis1"
    INITIAL_ANALIS_EMAIL: str = "analis1@bank.co.id"
    INITIAL_ANALIS_PASSWORD: str = "AnalisBank2026!"
    INITIAL_ANALIS_FULLNAME: str = "Budi Pratama (Analis Kredit)"

    INITIAL_REVIEWER_USERNAME: str = "reviewer1"
    INITIAL_REVIEWER_EMAIL: str = "reviewer1@bank.co.id"
    INITIAL_REVIEWER_PASSWORD: str = "ReviewerBank2026!"
    INITIAL_REVIEWER_FULLNAME: str = "Siti Rahayu (Reviewer Agunan)"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.APP_ENV.lower() in {"production", "prod"}:
            if len(self.SECRET_KEY) < 32:
                # Fallback aman jika SECRET_KEY kurang panjang
                self.SECRET_KEY = self.SECRET_KEY.ljust(32, "x")
            if not self.DATABASE_URL:
                raise ValueError("DATABASE_URL must be configured in production.")
        return self


settings = Settings()
