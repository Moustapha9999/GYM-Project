-- ============================================================
-- GYM SYLLA — ERP Salle de Sport
-- Schéma PostgreSQL / Supabase
-- Stack : Laravel 12 + Angular 20 + Supabase PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. RBAC : RÔLES, PERMISSIONS, UTILISATEURS
-- ============================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(50) UNIQUE NOT NULL,          -- super_admin, pdg, receptionniste, coach
    libelle VARCHAR(100) NOT NULL,
    description TEXT,
    systeme BOOLEAN DEFAULT false,            -- rôles non supprimables (super_admin)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,        -- ex: clients.create, paiements.export
    module VARCHAR(50) NOT NULL,              -- clients, abonnements, finances...
    action VARCHAR(20) NOT NULL,              -- lecture, creation, modification, suppression, validation, export
    libelle VARCHAR(150)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    whatsapp VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    photo_url TEXT,
    actif BOOLEAN DEFAULT true,
    derniere_connexion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. GESTION DES CLIENTS (ADHÉRENTS)
-- ============================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_membre VARCHAR(30) UNIQUE NOT NULL,   -- ex: GYM-2025-0001
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    sexe VARCHAR(10) CHECK (sexe IN ('Homme','Femme')),
    date_naissance DATE,
    telephone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    adresse TEXT,
    email VARCHAR(150),
    photo_url TEXT,
    numero_piece_identite VARCHAR(50),
    contact_urgence_nom VARCHAR(100),
    contact_urgence_telephone VARCHAR(20),
    groupe_sanguin VARCHAR(5),                   -- A+, A-, B+, B-, AB+, AB-, O+, O-
    actif BOOLEAN DEFAULT true,
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_nom ON clients(nom, prenom);
CREATE INDEX idx_clients_telephone ON clients(telephone);
CREATE INDEX idx_clients_groupe_sanguin ON clients(groupe_sanguin);
CREATE INDEX idx_clients_sexe ON clients(sexe);

-- ============================================================
-- 3. ABONNEMENTS
-- ============================================================

CREATE TABLE types_abonnements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(50) UNIQUE NOT NULL,             -- Hebdomadaire, Mensuel, Trimestriel, Semestriel, Annuel, VIP
    duree_jours INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    description TEXT,
    avantages TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE abonnements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type_abonnement_id UUID NOT NULL REFERENCES types_abonnements(id),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'Actif'
        CHECK (statut IN ('Actif','Expiré','Suspendu','Résilié')),
    renouvele_de UUID REFERENCES abonnements(id),  -- chaîne de renouvellements
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_abonnements_client ON abonnements(client_id);
CREATE INDEX idx_abonnements_statut ON abonnements(statut);
CREATE INDEX idx_abonnements_date_fin ON abonnements(date_fin);

-- Séances journalières (50 MRU / jour, distinct des abonnements)
CREATE TABLE seances_journalieres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),       -- nullable : client occasionnel non enregistré
    nom_client_occasionnel VARCHAR(150),         -- si client non enregistré
    date_seance DATE NOT NULL DEFAULT CURRENT_DATE,
    montant DECIMAL(10,2) NOT NULL DEFAULT 50,
    encaisse_par UUID NOT NULL REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seances_date ON seances_journalieres(date_seance);
CREATE INDEX idx_seances_client ON seances_journalieres(client_id);

-- ============================================================
-- 4. CARTE MEMBRE / QR CODE
-- ============================================================

CREATE TABLE cartes_membres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    abonnement_id UUID REFERENCES abonnements(id),
    qr_code_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    qr_code_url TEXT,                            -- lien image QR (Supabase Storage)
    date_generation TIMESTAMPTZ DEFAULT NOW(),
    date_expiration DATE NOT NULL,               -- = date_fin abonnement lié
    statut VARCHAR(20) NOT NULL DEFAULT 'Actif'
        CHECK (statut IN ('Actif','Expiré','Révoqué')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cartes_qr ON cartes_membres(qr_code_uuid);
CREATE INDEX idx_cartes_client ON cartes_membres(client_id);
CREATE INDEX idx_cartes_statut ON cartes_membres(statut);

-- ============================================================
-- 5. PRÉSENCES
-- ============================================================

CREATE TABLE presences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    methode VARCHAR(20) NOT NULL DEFAULT 'Manuel'
        CHECK (methode IN ('QR Code','Manuel')),
    heure_entree TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    heure_sortie TIMESTAMPTZ,
    duree_minutes INT,                           -- calculé automatiquement (trigger)
    enregistre_par UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_presences_client ON presences(client_id);
CREATE INDEX idx_presences_date ON presences(heure_entree);

-- Trigger : calcul automatique de la durée à la sortie
CREATE OR REPLACE FUNCTION calc_duree_presence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.heure_sortie IS NOT NULL THEN
        NEW.duree_minutes := EXTRACT(EPOCH FROM (NEW.heure_sortie - NEW.heure_entree)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_duree_presence
    BEFORE UPDATE ON presences
    FOR EACH ROW EXECUTE FUNCTION calc_duree_presence();

-- ============================================================
-- 6. PAIEMENTS & FINANCES
-- ============================================================

CREATE TABLE moyens_paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,            -- cash, bankily, masrivi, sedad, amanty, click, bimbank, bcipay, moov_money
    libelle VARCHAR(50) NOT NULL,
    actif BOOLEAN DEFAULT true
);

CREATE TABLE paiements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(40) UNIQUE NOT NULL DEFAULT
        ('PAY-' || to_char(NOW(),'YYYYMM') || '-' || substr(gen_random_uuid()::text,1,8)),
    client_id UUID REFERENCES clients(id),
    abonnement_id UUID REFERENCES abonnements(id),
    seance_journaliere_id UUID REFERENCES seances_journalieres(id),
    type_paiement VARCHAR(30) NOT NULL
        CHECK (type_paiement IN ('Abonnement','Séance journalière','Service supplémentaire','Autre')),
    montant DECIMAL(10,2) NOT NULL,
    moyen_paiement_id UUID NOT NULL REFERENCES moyens_paiement(id),
    statut VARCHAR(20) NOT NULL DEFAULT 'Validé'
        CHECK (statut IN ('Validé','En attente','Annulé')),
    facture_pdf_url TEXT,
    recu_pdf_url TEXT,
    encaisse_par UUID NOT NULL REFERENCES utilisateurs(id),
    date_paiement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paiements_client ON paiements(client_id);
CREATE INDEX idx_paiements_date ON paiements(date_paiement);
CREATE INDEX idx_paiements_moyen ON paiements(moyen_paiement_id);

-- Dépenses
CREATE TABLE categories_depenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(50) UNIQUE NOT NULL              -- Salaires, Maintenance, Charges diverses
);

CREATE TABLE depenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(40) UNIQUE NOT NULL DEFAULT
        ('DEP-' || to_char(NOW(),'YYYYMM') || '-' || substr(gen_random_uuid()::text,1,8)),
    categorie_id UUID NOT NULL REFERENCES categories_depenses(id),
    libelle VARCHAR(200) NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
    justificatif_url TEXT,
    valide_par UUID REFERENCES utilisateurs(id),
    created_by UUID NOT NULL REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_depenses_date ON depenses(date_depense);
CREATE INDEX idx_depenses_categorie ON depenses(categorie_id);

-- Journal de caisse (clôture journalière par la réceptionniste)
CREATE TABLE journal_caisse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_jour DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    total_encaisse DECIMAL(10,2) DEFAULT 0,
    total_depenses DECIMAL(10,2) DEFAULT 0,
    solde DECIMAL(10,2) DEFAULT 0,
    cloture_par UUID REFERENCES utilisateurs(id),
    cloture_le TIMESTAMPTZ,
    statut VARCHAR(20) DEFAULT 'Ouverte' CHECK (statut IN ('Ouverte','Clôturée')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. RESSOURCES HUMAINES
-- ============================================================

CREATE TABLE employes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID REFERENCES utilisateurs(id),  -- lien compte si l'employé a un accès système
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    fonction VARCHAR(50) NOT NULL
        CHECK (fonction IN ('Manager','Coach','Réceptionniste','Agent d''entretien','Sécurité')),
    telephone VARCHAR(20),
    email VARCHAR(150),
    adresse TEXT,
    photo_url TEXT,
    date_embauche DATE NOT NULL,
    type_contrat VARCHAR(30) CHECK (type_contrat IN ('CDI','CDD','Stage','Freelance')),
    salaire_base DECIMAL(10,2) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'Actif'
        CHECK (statut IN ('Actif','Suspendu','Inactif')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employes_fonction ON employes(fonction);
CREATE INDEX idx_employes_statut ON employes(statut);

-- ============================================================
-- 8. SALAIRES
-- ============================================================

CREATE TABLE fiches_paie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employe_id UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    mois INT NOT NULL CHECK (mois BETWEEN 1 AND 12),
    annee INT NOT NULL,
    salaire_base DECIMAL(10,2) NOT NULL,
    primes DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    retenues DECIMAL(10,2) DEFAULT 0,
    salaire_final DECIMAL(10,2) GENERATED ALWAYS AS
        (salaire_base + primes + bonus - retenues) STORED,
    statut_paiement VARCHAR(20) DEFAULT 'En attente'
        CHECK (statut_paiement IN ('Payé','En attente')),
    date_paiement DATE,
    fiche_pdf_url TEXT,
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employe_id, mois, annee)
);

CREATE INDEX idx_fiches_paie_periode ON fiches_paie(annee, mois);

-- ============================================================
-- 9. PROGRAMMES SPORTIFS (COACH)
-- ============================================================

CREATE TABLE programmes_sportifs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES employes(id),
    titre VARCHAR(150) NOT NULL,
    objectif VARCHAR(100),
    description TEXT,
    date_debut DATE NOT NULL,
    date_fin DATE,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programmes_client ON programmes_sportifs(client_id);
CREATE INDEX idx_programmes_coach ON programmes_sportifs(coach_id);

-- Planning des coachs
CREATE TABLE planning_coachs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    titre VARCHAR(150) NOT NULL,
    date_seance DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    statut VARCHAR(20) DEFAULT 'Planifié'
        CHECK (statut IN ('Planifié','Terminé','Annulé')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planning_coach_date ON planning_coachs(coach_id, date_seance);

-- ============================================================
-- 10. NOTIFICATIONS (WHATSAPP + SMS DE SECOURS)
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinataire_type VARCHAR(20) NOT NULL CHECK (destinataire_type IN ('Client','Employé')),
    client_id UUID REFERENCES clients(id),
    employe_id UUID REFERENCES employes(id),
    numero_telephone VARCHAR(20) NOT NULL,
    canal VARCHAR(10) NOT NULL DEFAULT 'whatsapp'
        CHECK (canal IN ('whatsapp','sms')),
    type_notification VARCHAR(50) NOT NULL,
        -- bienvenue, confirmation_paiement, expiration_j7, expiration_j3,
        -- expiration_jour, renouvellement_reussi, salaire, conge
    message TEXT NOT NULL,
    statut VARCHAR(20) DEFAULT 'En attente'
        CHECK (statut IN ('En attente','Envoyé','Échoué')),
    provider_message_id VARCHAR(100),       -- ID retourné par Baileys ou le provider SMS
    fallback_sms_envoye BOOLEAN DEFAULT false,  -- true si SMS envoyé après échec WhatsApp
    date_envoi TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_statut ON notifications(statut);
CREATE INDEX idx_notif_type ON notifications(type_notification);
CREATE INDEX idx_notif_canal ON notifications(canal);

-- ============================================================
-- 11. JOURNAL D'AUDIT
-- ============================================================

CREATE TABLE journal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID REFERENCES utilisateurs(id),
    action VARCHAR(100) NOT NULL,                -- connexion, creation_client, suppression_paiement...
    module VARCHAR(50) NOT NULL,
    cible_table VARCHAR(50),
    cible_id UUID,
    details JSONB,
    adresse_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_utilisateur ON journal_audit(utilisateur_id);
CREATE INDEX idx_audit_date ON journal_audit(created_at);
CREATE INDEX idx_audit_module ON journal_audit(module);

-- ============================================================
-- 12. PARAMÈTRES SYSTÈME
-- ============================================================

CREATE TABLE parametres_systeme (
    cle VARCHAR(100) PRIMARY KEY,
    valeur TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VUES DÉCISIONNELLES (DASHBOARDS)
-- ============================================================

-- Chiffre d'affaires du jour (abonnements + séances journalières + services)
CREATE OR REPLACE VIEW v_ca_journalier AS
SELECT
    date_paiement::date AS jour,
    SUM(montant) AS total
FROM paiements
WHERE statut = 'Validé'
GROUP BY date_paiement::date;

-- KPI Abonnements
CREATE OR REPLACE VIEW v_kpi_abonnements AS
SELECT
    COUNT(*) FILTER (WHERE statut = 'Actif') AS actifs,
    COUNT(*) FILTER (WHERE statut = 'Expiré') AS expires,
    COUNT(*) FILTER (WHERE statut = 'Résilié') AS resilies,
    COUNT(*) FILTER (WHERE renouvele_de IS NOT NULL) AS renouvelles
FROM abonnements;

-- KPI Fréquentation
CREATE OR REPLACE VIEW v_kpi_frequentation AS
SELECT
    heure_entree::date AS jour,
    COUNT(*) AS nb_entrees
FROM presences
GROUP BY heure_entree::date;

-- Masse salariale mensuelle
CREATE OR REPLACE VIEW v_masse_salariale AS
SELECT
    annee, mois,
    SUM(salaire_final) AS total_salaires,
    COUNT(*) AS nb_employes_payes
FROM fiches_paie
GROUP BY annee, mois;

-- Abonnements expirant (J-7, J-3, J-0)
CREATE OR REPLACE VIEW v_abonnements_expirant AS
SELECT
    a.id, a.client_id, c.nom, c.prenom, c.whatsapp,
    a.date_fin,
    (a.date_fin - CURRENT_DATE) AS jours_restants
FROM abonnements a
JOIN clients c ON c.id = a.client_id
WHERE a.statut = 'Actif'
  AND (a.date_fin - CURRENT_DATE) IN (7, 3, 0);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

INSERT INTO roles (nom, libelle, systeme) VALUES
('super_admin', 'Super Administrateur', true),
('pdg', 'PDG / Monsieur SYLLA', true),
('receptionniste', 'Réceptionniste', false),
('coach', 'Coach', false);

INSERT INTO moyens_paiement (code, libelle) VALUES
('cash', 'Cash'),
('bankily', 'Bankily'),
('masrivi', 'Masrivi'),
('sedad', 'Sedad'),
('amanty', 'Amanty'),
('click', 'Click'),
('bimbank', 'bimBank'),
('bcipay', 'BCIpay'),
('moov_money', 'Moov Money');

INSERT INTO categories_depenses (nom) VALUES
('Salaires'), ('Maintenance'), ('Charges diverses');

INSERT INTO types_abonnements (nom, duree_jours, montant, description) VALUES
('Hebdomadaire', 7, 1500, 'Accès illimité pendant 7 jours'),
('Mensuel', 30, 5000, 'Accès illimité pendant 1 mois'),
('Trimestriel', 90, 13500, 'Accès illimité pendant 3 mois'),
('Semestriel', 180, 25000, 'Accès illimité pendant 6 mois'),
('Annuel', 365, 45000, 'Accès illimité pendant 12 mois'),
('VIP', 30, 10000, 'Accès illimité + coaching personnalisé');

INSERT INTO parametres_systeme (cle, valeur, description) VALUES
('tarif_seance_journaliere', '50', 'Tarif en MRU pour une séance journalière'),
('devise', 'MRU', 'Devise utilisée'),
('whatsapp_provider', 'baileys', 'Provider WhatsApp : baileys (micro-service Node.js non-officiel, WhatsApp Web)'),
('whatsapp_service_url', 'http://localhost:3001', 'URL interne du micro-service Baileys (whatsapp-web.js)'),
('whatsapp_session_statut', 'non_connecte', 'Statut session WhatsApp Web : non_connecte, connecte, expire'),
('sms_provider', '', 'Provider SMS de secours (ex: twilio, vonage, mauritel_api)'),
('sms_api_key', '', 'Clé API du provider SMS'),
('sms_fallback_actif', 'true', 'Activer l envoi SMS automatique si WhatsApp echoue'),
('nom_salle', 'GYM SYLLA', 'Nom commercial de la salle');
