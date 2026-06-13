"""
Import centralisé de tous les modèles ORM.
Indispensable pour qu'Alembic détecte automatiquement les tables.
"""
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.utilisateur import Utilisateur
from app.models.client import Client
from app.models.type_abonnement import TypeAbonnement
from app.models.abonnement import Abonnement
from app.models.seance_journaliere import SeanceJournaliere
from app.models.carte_membre import CarteMembre
from app.models.presence import Presence
from app.models.moyen_paiement import MoyenPaiement
from app.models.paiement import Paiement
from app.models.depense import CategorieDepense, Depense
from app.models.journal_caisse import JournalCaisse
from app.models.employe import Employe
from app.models.fiche_paie import FichePaie
from app.models.programme_sportif import ProgrammeSportif
from app.models.planning_coach import PlanningCoach
from app.models.notification import Notification
from app.models.journal_audit import JournalAudit
from app.models.parametre_systeme import ParametreSysteme

__all__ = [
    "Role",
    "Permission",
    "RolePermission",
    "Utilisateur",
    "Client",
    "TypeAbonnement",
    "Abonnement",
    "SeanceJournaliere",
    "CarteMembre",
    "Presence",
    "MoyenPaiement",
    "Paiement",
    "CategorieDepense",
    "Depense",
    "JournalCaisse",
    "Employe",
    "FichePaie",
    "ProgrammeSportif",
    "PlanningCoach",
    "Notification",
    "JournalAudit",
    "ParametreSysteme",
]
