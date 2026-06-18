"""
Crée un utilisateur réceptionniste pour les tests.

Usage :
    python -m scripts.create_receptionniste
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Role, Utilisateur

# Compte réceptionniste à créer
RECEPTIONNISTE = {
    "nom": "Reception",
    "prenom": "Test",
    "email": "reception@totalfitness.mr",
    "password": "Reception@2025",
    "telephone": "22200000000",
}


def main():
    db = SessionLocal()
    try:
        role = db.query(Role).filter_by(nom="receptionniste").first()
        if role is None:
            print("❌ Rôle 'receptionniste' introuvable. Lance d'abord le seed.")
            return

        existant = db.query(Utilisateur).filter_by(email=RECEPTIONNISTE["email"]).first()
        if existant:
            print(f"= Utilisateur déjà existant : {RECEPTIONNISTE['email']}")
            return

        user = Utilisateur(
            role_id=role.id,
            nom=RECEPTIONNISTE["nom"],
            prenom=RECEPTIONNISTE["prenom"],
            email=RECEPTIONNISTE["email"],
            telephone=RECEPTIONNISTE["telephone"],
            password_hash=hash_password(RECEPTIONNISTE["password"]),
            actif=True,
        )
        db.add(user)
        db.commit()
        print("✅ Réceptionniste créé !")
        print(f"   Email : {RECEPTIONNISTE['email']}")
        print("   Mot de passe : celui défini dans le script (à changer après la 1ère connexion)")
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()