"""Connexion à la base de données Supabase (PostgreSQL via SQLAlchemy)."""
from sqlalchemy import create_engine  # type: ignore[import]
from sqlalchemy.orm import sessionmaker, declarative_base  # type: ignore[import]

from app.core.config import settings

# Engine SQLAlchemy — pool_pre_ping vérifie la connexion avant chaque usage
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe de base pour tous les modèles ORM
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : fournit une session DB et la ferme après usage."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()