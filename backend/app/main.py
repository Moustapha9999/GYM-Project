"""Point d'entrée de l'API GYM SYLLA / TOTAL FITNESS."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="API de gestion de salle de sport — TOTAL FITNESS",
)

# ── CORS ────────────────────────────────────────────────────
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
