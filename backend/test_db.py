from app.core.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        print("✅ Connexion Supabase réussie !")
        print(result.scalar())
except Exception as e:
    print("❌ Erreur de connexion :")
    print(e)