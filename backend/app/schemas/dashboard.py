"""Schémas Pydantic pour les dashboards (3 rôles)."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class PointGraphe(BaseModel):
    label: str
    valeur: Decimal | int


class AlerteItem(BaseModel):
    """Alerte métier affichée dans le centre de notifications."""
    id: str
    type: str
    severity: str  # info | warning | danger
    titre: str
    message: str
    route: str | None = None
    entity_id: str | None = None
    created_at: datetime


class AlertesDashboard(BaseModel):
    total: int
    items: list[AlerteItem]


class DashboardAdmin(BaseModel):
    """KPIs Super Admin / PDG — vue décisionnelle globale."""
    # Revenus
    revenus_jour: Decimal
    revenus_mois: Decimal
    total_abonnements_mois: Decimal
    total_seances_mois: Decimal
    total_depenses_mois: Decimal
    benefice_mois: Decimal
    # Membres
    clients_actifs: int
    abonnements_actifs: int
    abonnements_expirant_7j: int
    nouvelles_inscriptions_mois: int
    # Présences
    presences_jour: int
    # Graphes
    revenus_7_derniers_jours: list[PointGraphe]
    repartition_abonnements_sexe: list[PointGraphe]


class DashboardReception(BaseModel):
    """KPIs Réceptionniste / Manager — vue opérationnelle du jour."""
    revenus_jour: Decimal
    nombre_paiements_jour: int
    presences_jour: int
    presents_actuellement: int  # entrés sans sortie
    seances_jour: int
    abonnements_souscrits_jour: int
    abonnements_expirant_7j: int
    # Coach / Planning / Programmes
    programmes_actifs: int
    seances_planifiees_jour: int
    seances_planifiees_semaine: int
    clients_suivis: int
    # Graphes
    activite_7_jours: list[PointGraphe]
    presences_7_jours: list[PointGraphe]
    planning_semaine: list[PointGraphe]
    planning_par_statut: list[PointGraphe]
    programmes_par_statut: list[PointGraphe]


class DashboardCoach(BaseModel):
    """KPIs Coach — vue de son activité."""
    programmes_actifs: int
    seances_planifiees_jour: int
    seances_planifiees_semaine: int
    clients_suivis: int
