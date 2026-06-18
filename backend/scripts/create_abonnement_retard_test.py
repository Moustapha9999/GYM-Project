"""
Crée un client + abonnement en retard pour tester l'UI (ligne rouge, bouton Alerte).

Usage :
    python -m scripts.create_abonnement_retard_test
    python -m scripts.create_abonnement_retard_test --jours 8
"""
import argparse
from datetime import date, timedelta
from decimal import Decimal

from app.core.database import SessionLocal
from app.models import Abonnement, Client, TypeAbonnement


CLIENT_TEST = {
    "numero_membre": "TF-TEST-RETARD",
    "nom": "Test",
    "prenom": "Retard",
    "sexe": "Homme",
    "telephone": "22248123456",
    "whatsapp": "22248123456",
}


def main():
    parser = argparse.ArgumentParser(description="Créer un abonnement en retard (test UI)")
    parser.add_argument(
        "--jours",
        type=int,
        default=5,
        help="Nombre de jours de retard après la date de fin (défaut: 5)",
    )
    args = parser.parse_args()

    if args.jours < 1:
        raise SystemExit("Le nombre de jours de retard doit être >= 1.")

    db = SessionLocal()
    try:
        type_abo = (
            db.query(TypeAbonnement)
            .filter(TypeAbonnement.sexe == "Homme", TypeAbonnement.actif == True)  # noqa: E712
            .first()
        )
        if type_abo is None:
            print("❌ Aucun type d'abonnement Homme actif. Lance d'abord : python -m scripts.seed")
            return

        client = db.query(Client).filter_by(numero_membre=CLIENT_TEST["numero_membre"]).first()
        if client is None:
            client = Client(**CLIENT_TEST, actif=True)
            db.add(client)
            db.flush()
            print(f"  + Client créé : {client.prenom} {client.nom} ({client.numero_membre})")
        else:
            print(f"  = Client existant : {client.prenom} {client.nom}")

        aujourdhui = date.today()
        date_fin = aujourdhui - timedelta(days=args.jours)
        date_debut = date_fin - timedelta(days=type_abo.duree_jours)

        abo_existant = (
            db.query(Abonnement)
            .filter(Abonnement.client_id == client.id, Abonnement.statut == "Actif")
            .first()
        )

        if abo_existant:
            abo_existant.date_debut = date_debut
            abo_existant.date_fin = date_fin
            abo_existant.type_abonnement_id = type_abo.id
            abo_existant.montant = type_abo.montant
            abo_existant.est_inscription = False
            abo = abo_existant
            print("  = Abonnement actif mis à jour avec des dates en retard")
        else:
            abo = Abonnement(
                client_id=client.id,
                type_abonnement_id=type_abo.id,
                date_debut=date_debut,
                date_fin=date_fin,
                montant=Decimal(str(type_abo.montant)),
                statut="Actif",
                est_inscription=False,
            )
            db.add(abo)
            print("  + Abonnement en retard créé")

        db.commit()

        print("\n✅ Données de test prêtes !")
        print(f"   Client      : {client.prenom} {client.nom} — {client.numero_membre}")
        print(f"   Téléphone   : {client.telephone}")
        print(f"   Période     : {date_debut.strftime('%d/%m/%Y')} → {date_fin.strftime('%d/%m/%Y')}")
        print(f"   Retard      : {args.jours} jour(s) — statut Actif")
        print(f"   Abonnement  : {abo.id}")
        print("\n→ Ouvrez la liste Abonnements : la ligne doit apparaître en rouge avec le bouton « Alerte ».")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🧪 Création abonnement en retard (test UI)...\n")
    main()
