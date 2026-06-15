"""
Script de seed — peuple la base avec les données de référence.

Usage :
    python -m scripts.seed

Idempotent : peut être relancé sans créer de doublons (vérifie l'existence avant insertion).
"""
from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    CategorieDepense,
    MoyenPaiement,
    ParametreSysteme,
    Permission,
    Role,
    TypeAbonnement,
    Utilisateur,
)

# ── Définitions ─────────────────────────────────────────────

ROLES = [
    {"nom": "super_admin", "libelle": "Super Administrateur", "systeme": True},
    {"nom": "pdg", "libelle": "PDG / Direction", "systeme": True},
    {"nom": "receptionniste", "libelle": "Réceptionniste", "systeme": False},
    {"nom": "coach", "libelle": "Coach", "systeme": False},
]

MODULES = [
    "clients", "abonnements", "seances_journalieres", "cartes_membres",
    "presences", "paiements", "finances", "employes", "salaires",
    "programmes_sportifs", "planning", "notifications", "rapports",
    "utilisateurs", "roles", "audit", "parametres",
]
ACTIONS = ["lecture", "creation", "modification", "suppression", "validation", "export"]

# Attribution des permissions par rôle (modules autorisés)
PERMISSIONS_PAR_ROLE = {
    "pdg": {
        "modules": ["clients", "abonnements", "finances", "employes", "salaires",
                    "rapports", "roles", "utilisateurs", "audit", "parametres"],
        "exclure_actions": ["suppression"],
    },
    "receptionniste": {
        "modules": ["clients", "abonnements", "seances_journalieres",
                    "cartes_membres", "presences", "paiements"],
        "actions": ["lecture", "creation", "modification", "validation"],
    },
    "coach": {
        "modules": ["clients", "programmes_sportifs", "planning"],
        "actions": ["lecture", "creation", "modification"],
    },
}

MOYENS_PAIEMENT = [
    ("cash", "Cash"),
    ("bankily", "Bankily"),
    ("masrivi", "Masrivi"),
    ("sedad", "Sedad"),
    ("amanty", "Amanty"),
    ("click", "Click"),
    ("bimbank", "bimBank"),
    ("bcipay", "BCIpay"),
    ("moov_money", "Moov Money"),
]

CATEGORIES_DEPENSES = ["Salaires", "Maintenance", "Charges diverses"]

# Tarifs TOTAL FITNESS (en MRU)
TYPES_ABONNEMENTS = [
    {
        "nom": "Mensuel Homme", "sexe": "Homme", "duree_jours": 30,
        "montant": Decimal("700"), "montant_inscription": Decimal("1000"),
        "description": "Abonnement mensuel homme (1er mois 1000 MRU, puis 700 MRU)",
    },
    {
        "nom": "Mensuel Femme", "sexe": "Femme", "duree_jours": 30,
        "montant": Decimal("500"), "montant_inscription": Decimal("700"),
        "description": "Abonnement mensuel femme (1er mois 700 MRU, puis 500 MRU)",
    },
]

PARAMETRES = [
    ("nom_salle", "TOTAL FITNESS", "Nom commercial de la salle"),
    ("numero_salle", "", "Numéro WhatsApp officiel de la salle (signature des messages)"),
    ("devise", "MRU", "Devise utilisée"),
    ("tarif_seance_journaliere", "50", "Tarif en MRU pour une séance journalière"),
    ("delai_grace_jours", "3", "Délai de grâce (jours) après expiration pour renouveler au tarif normal"),
    ("whatsapp_provider", "baileys", "Provider WhatsApp (micro-service Baileys)"),
    ("whatsapp_service_url", "http://localhost:3001", "URL interne du micro-service WhatsApp"),
    ("whatsapp_session_statut", "non_connecte", "Statut session WhatsApp Web"),
    ("sms_provider", "", "Provider SMS de secours"),
    ("sms_fallback_actif", "true", "Activer SMS si WhatsApp échoue"),
]

# Compte super admin initial
ADMIN = {
    "nom": "Admin",
    "prenom": "Super",
    "email": "admin@totalfitness.mr",
    "password": "Admin@2025",  # à changer après la 1ère connexion
}


def seed():
    db = SessionLocal()
    try:
        # ── 1. Rôles ────────────────────────────────────────
        roles = {}
        for r in ROLES:
            existing = db.query(Role).filter_by(nom=r["nom"]).first()
            if not existing:
                role = Role(**r)
                db.add(role)
                db.flush()
                roles[r["nom"]] = role
                print(f"  + Rôle créé : {r['nom']}")
            else:
                roles[r["nom"]] = existing
                print(f"  = Rôle existant : {r['nom']}")
        db.commit()

        # ── 2. Permissions ──────────────────────────────────
        permissions = {}
        for module in MODULES:
            for action in ACTIONS:
                code = f"{module}.{action}"
                existing = db.query(Permission).filter_by(code=code).first()
                if not existing:
                    perm = Permission(
                        code=code, module=module, action=action,
                        libelle=f"{action.capitalize()} {module.replace('_', ' ')}",
                    )
                    db.add(perm)
                    db.flush()
                    permissions[code] = perm
                else:
                    permissions[code] = existing
        db.commit()
        print(f"  + {len(permissions)} permissions")

        # ── 3. Attribution permissions par rôle ─────────────
        # super_admin : toutes
        super_admin = roles["super_admin"]
        super_admin.permissions = list(db.query(Permission).all())
        print("  + super_admin : toutes les permissions")

        for role_nom, regle in PERMISSIONS_PAR_ROLE.items():
            role = roles[role_nom]
            perms_role = []
            for code, perm in permissions.items():
                module, action = code.split(".")
                if module not in regle["modules"]:
                    continue
                if "actions" in regle and action not in regle["actions"]:
                    continue
                if "exclure_actions" in regle and action in regle["exclure_actions"]:
                    continue
                perms_role.append(perm)
            role.permissions = perms_role
            print(f"  + {role_nom} : {len(perms_role)} permissions")
        db.commit()

        # ── 4. Moyens de paiement ───────────────────────────
        for code, libelle in MOYENS_PAIEMENT:
            if not db.query(MoyenPaiement).filter_by(code=code).first():
                db.add(MoyenPaiement(code=code, libelle=libelle))
        db.commit()
        print(f"  + {len(MOYENS_PAIEMENT)} moyens de paiement")

        # ── 5. Catégories de dépenses ───────────────────────
        for nom in CATEGORIES_DEPENSES:
            if not db.query(CategorieDepense).filter_by(nom=nom).first():
                db.add(CategorieDepense(nom=nom))
        db.commit()
        print(f"  + {len(CATEGORIES_DEPENSES)} catégories de dépenses")

        # ── 6. Types d'abonnement ───────────────────────────
        for t in TYPES_ABONNEMENTS:
            if not db.query(TypeAbonnement).filter_by(nom=t["nom"]).first():
                db.add(TypeAbonnement(**t))
        db.commit()
        print(f"  + {len(TYPES_ABONNEMENTS)} types d'abonnement")

        # ── 7. Paramètres système ───────────────────────────
        for cle, valeur, desc in PARAMETRES:
            if not db.query(ParametreSysteme).filter_by(cle=cle).first():
                db.add(ParametreSysteme(cle=cle, valeur=valeur, description=desc))
        db.commit()
        print(f"  + {len(PARAMETRES)} paramètres système")

        # ── 8. Super admin ──────────────────────────────────
        if not db.query(Utilisateur).filter_by(email=ADMIN["email"]).first():
            admin = Utilisateur(
                role_id=roles["super_admin"].id,
                nom=ADMIN["nom"],
                prenom=ADMIN["prenom"],
                email=ADMIN["email"],
                password_hash=hash_password(ADMIN["password"]),
                actif=True,
            )
            db.add(admin)
            db.commit()
            print(f"  + Super admin créé : {ADMIN['email']} / {ADMIN['password']}")
        else:
            print(f"  = Super admin existant : {ADMIN['email']}")

        print("\n✅ Seed terminé avec succès !")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur durant le seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Démarrage du seed...\n")
    seed()
