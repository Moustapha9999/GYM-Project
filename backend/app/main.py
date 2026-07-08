"""Point d'entrée de l'API GYM SYLLA / TOTAL FITNESS."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.middleware import SecurityHeadersMiddleware
from app.routers import api_router

_is_production = settings.APP_ENV == "production"

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="API de gestion de salle de sport — TOTAL FITNESS",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# ── Sécurité HTTP ───────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ────────────────────────────────────────────────────
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
cors_kwargs: dict = {
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "Accept", "X-Requested-With"],
}
if settings.CORS_ALLOW_LAN and not _is_production:
    cors_kwargs["allow_origin_regex"] = (
        r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?"
    )
    cors_kwargs["allow_origins"] = origins
else:
    cors_kwargs["allow_origins"] = origins

app.add_middleware(CORSMiddleware, **cors_kwargs)

# ── Routers ─────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ── Endpoints de base ───────────────────────────────────────
@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} — API opérationnelle"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
