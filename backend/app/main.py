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
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# ── Routers ─────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ── Endpoints de base ───────────────────────────────────────
@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} — API opérationnelle"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}
