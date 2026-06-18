"""Correspondance entre la fonction RH d'un employé et le rôle système."""

FONCTION_VERS_ROLE: dict[str, str] = {
    "Réceptionniste": "receptionniste",
    "Coach": "coach",
    "Manager": "manager",
    "Responsable de salle": "manager",
    "Responsable RH": "responsable_rh",
    "Comptable": "comptable",
    "Directeur adjoint": "pdg",
}


def fonction_vers_role(fonction: str) -> str | None:
    return FONCTION_VERS_ROLE.get(fonction.strip())
