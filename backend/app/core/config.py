"""Configuration centralisée de l'application (lecture du .env)."""
from pydantic import model_validator
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h

    # ── Métier ───────────────────────────────────────────────
    DEVISE: str = "MRU"
    TARIF_SEANCE_JOURNALIERE: float = 50.0

    # ── CORS (frontend autorisé) ─────────────────────────────
    CORS_ORIGINS: str = "http://localhost:4200"
    # Dev multi-postes : autorise http://192.168.x.x:port (ignoré en production)
    CORS_ALLOW_LAN: bool = False

    # ── Service de notifications ─────────────────────────────
    NOTIFICATION_SERVICE_URL: str = "http://localhost:3001"
    NOTIFICATION_API_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.APP_ENV != "production":
            return self

        weak_markers = ("changez-moi", "changeme", "change_me", "example", "your-secret")
        if len(self.SECRET_KEY) < 32 or any(m in self.SECRET_KEY.lower() for m in weak_markers):
            raise ValueError(
                "SECRET_KEY doit faire au moins 32 caractères aléatoires en production."
            )
        if not self.NOTIFICATION_API_SECRET or len(self.NOTIFICATION_API_SECRET) < 16:
            raise ValueError("NOTIFICATION_API_SECRET est obligatoire en production (min. 16 car.).")
        return self


settings = Settings()
