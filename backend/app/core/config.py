"""Configuration centralisée de l'application (lecture du .env)."""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────
    APP_NAME: str = "GYM SYLLA API"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # ── Base de données Supabase ─────────────────────────────
    DATABASE_URL: str

    # ── Sécurité / JWT ───────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # ── Métier ───────────────────────────────────────────────
    DEVISE: str = "MRU"
    TARIF_SEANCE_JOURNALIERE: float = 50.0

    # ── CORS (frontend autorisé) ─────────────────────────────
    CORS_ORIGINS: str = "http://localhost:4200"

    # ── Service de notifications ─────────────────────────────
    NOTIFICATION_SERVICE_URL: str = "http://localhost:3001"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()