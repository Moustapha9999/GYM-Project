"""
Point d'entrée des tâches cron.

Usage :
    python -m scripts.run_cron expirer          # expire abonnements + cartes
    python -m scripts.run_cron rappels           # envoie les rappels J-7/J-3/J-0
    python -m scripts.run_cron all               # tout

À planifier (ex. Render Cron Job ou cron système) :
    00:05  python -m scripts.run_cron expirer
    08:00  python -m scripts.run_cron rappels
"""
import sys

from app.core.database import SessionLocal
from app.tasks import jobs


def main():
    tache = sys.argv[1] if len(sys.argv) > 1 else "all"
    db = SessionLocal()
    try:
        if tache in ("expirer", "all"):
            n_abo = jobs.expirer_abonnements(db)
            n_carte = jobs.expirer_cartes(db)
            print(f"✅ Abonnements expirés : {n_abo} | Cartes révoquées : {n_carte}")
        if tache in ("rappels", "all"):
            res = jobs.rappels_expiration(db)
            print(f"✅ Rappels envoyés — J-7: {res['j7']} | J-3: {res['j3']} | J-0: {res['j0']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
