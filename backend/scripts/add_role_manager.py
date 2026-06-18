"""
Ajoute le rôle 'manager' à une base EXISTANTE, sans toucher au reste.

Le Manager a les mêmes permissions que le réceptionniste, PLUS la gestion
des programmes sportifs et du planning des coachs.

Permissions : modules [clients, abonnements, seances_journalieres, cartes_membres,
presences, paiements, programmes_sportifs, planning]
actions [lecture, creation, modification, validation]

Usage :
    python -m scripts.add_role_manager
"""
from app.core.database import SessionLocal
from app.models.permission import Permission
from app.models.role import Role

MODULES_MANAGER = [
    "clients", "abonnements", "seances_journalieres", "cartes_membres",
    "presences", "paiements", "programmes_sportifs", "planning",
]
ACTIONS_MANAGER = ["lecture", "creation", "modification", "validation"]


def main():
    db = SessionLocal()
    try:
        # 1. Créer le rôle s'il n'existe pas
        role = db.query(Role).filter_by(nom="manager").first()
        if role is None:
            role = Role(nom="manager", libelle="Manager", systeme=False)
            db.add(role)
            db.commit()
            db.refresh(role)
            print("✅ Rôle 'manager' créé.")
        else:
            print("= Rôle 'manager' déjà existant.")

        # 2. Récupérer les permissions correspondantes
        perms = (
            db.query(Permission)
            .filter(
                Permission.module.in_(MODULES_MANAGER),
                Permission.action.in_(ACTIONS_MANAGER),
            )
            .all()
        )
        if not perms:
            print("❌ Aucune permission trouvée. La base a-t-elle été seedée ?")
            return

        # 3. Attribuer (sans doublon)
        existantes = {p.id for p in role.permissions}
        ajoutees = 0
        for p in perms:
            if p.id not in existantes:
                role.permissions.append(p)
                ajoutees += 1
        db.commit()

        print(f"✅ Manager : {len(role.permissions)} permissions au total ({ajoutees} ajoutées).")
        print(f"   Modules : {', '.join(MODULES_MANAGER)}")
        print(f"   Actions : {', '.join(ACTIONS_MANAGER)}")
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
