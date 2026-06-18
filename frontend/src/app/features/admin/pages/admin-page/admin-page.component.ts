import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PaginationMeta } from '@core/models/api-response.model';
import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { Employe, fonctionAvecRole } from '@features/admin/models/employe.model';
import {
  Permission,
  Role,
  RoleDetail,
  Utilisateur,
} from '@features/admin/models/utilisateur.model';
import { AdminService } from '@features/admin/services/admin.service';
import { Tarifs } from '@features/admin/models/tarif.model';

type AdminTab = 'utilisateurs' | 'employes' | 'roles' | 'tarifs';
type FormMode = 'create' | 'edit' | 'view';

const USER_FORM_ROLES_SUPER_ADMIN = ['super_admin', 'pdg', 'manager', 'receptionniste'];
const USER_FORM_ROLES_PDG = ['pdg', 'manager', 'receptionniste'];
const ASSIGNABLE_ROLES = [
  'receptionniste',
  'coach',
  'pdg',
  'manager',
  'responsable_rh',
  'comptable',
];
const SYSTEM_ROLES = ['super_admin'];
const PRIVILEGE_MANAGERS = ['super_admin', 'pdg'];
const PDG_EDITABLE_ROLES = ['receptionniste', 'coach', 'manager', 'responsable_rh', 'comptable'];

const PERMISSION_ACTIONS = [
  'lecture',
  'creation',
  'modification',
  'suppression',
  'validation',
  'export',
] as const;

const MODULE_LABELS: Record<string, string> = {
  utilisateurs: 'Comptes utilisateurs',
  employes: 'Employés',
  roles: 'Rôles & privilèges',
  salaires: 'Salaires',
  clients: 'Clients',
  abonnements: 'Abonnements',
  seances_journalieres: 'Séances journalières',
  cartes_membres: 'Cartes membres',
  presences: 'Présences',
  paiements: 'Paiements',
  finances: 'Finances',
  programmes_sportifs: 'Programmes sportifs',
  planning: 'Planning',
  notifications: 'Notifications',
  rapports: 'Rapports',
  audit: 'Audit',
  parametres: 'Paramètres',
};

const ADMIN_MODULE_KEYS = ['utilisateurs', 'employes', 'roles', 'salaires'];

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, DatePipe, DecimalPipe, TranslatePipe, AppIconComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(DialogService);

  readonly permissionActions = PERMISSION_ACTIONS;

  readonly activeTab = signal<AdminTab>('utilisateurs');
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly formSuccess = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formMode = signal<FormMode>('create');

  // Utilisateurs
  readonly utilisateurs = signal<Utilisateur[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly editingUser = signal<Utilisateur | null>(null);
  readonly viewingUser = signal<Utilisateur | null>(null);

  readonly userFilters = this.fb.nonNullable.group({
    search: [''],
    role: [''],
    actif: [''],
  });

  readonly userForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    password: [''],
    role_nom: ['receptionniste', [Validators.required]],
    actif: [true],
  });

  readonly filteredUsers = computed(() => {
    const search = this.userFilters.getRawValue().search.trim().toLowerCase();
    const role = this.userFilters.getRawValue().role;
    const actif = this.userFilters.getRawValue().actif;
    return this.utilisateurs().filter((u) => {
      if (search) {
        const hay = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (role && u.role.nom !== role) return false;
      if (actif === 'true' && !u.actif) return false;
      if (actif === 'false' && u.actif) return false;
      return true;
    });
  });

  readonly actifsUsersCount = computed(() => this.utilisateurs().filter((u) => u.actif).length);

  // Employés
  readonly employes = signal<Employe[]>([]);
  readonly employesMeta = signal<PaginationMeta | null>(null);
  readonly editingEmploye = signal<Employe | null>(null);
  readonly viewingEmploye = signal<Employe | null>(null);
  readonly employePerPage = 15;

  // Tarifs
  readonly tarifsLoading = signal(false);
  readonly tarifs = signal<Tarifs | null>(null);

  readonly tarifsForm = this.fb.nonNullable.group({
    tarif_seance_journaliere: [0, [Validators.required, Validators.min(1)]],
    homme_montant: [0, [Validators.required, Validators.min(1)]],
    homme_montant_inscription: [0, [Validators.required, Validators.min(1)]],
    femme_montant: [0, [Validators.required, Validators.min(1)]],
    femme_montant_inscription: [0, [Validators.required, Validators.min(1)]],
  });

  readonly employeFilters = this.fb.nonNullable.group({
    search: [''],
    statut: [''],
    fonction: [''],
  });

  readonly employeForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    fonction: ['', [Validators.required]],
    telephone: [''],
    email: [''],
    adresse: [''],
    date_embauche: ['', [Validators.required]],
    type_contrat: [''],
    salaire_base: [0, [Validators.required, Validators.min(0)]],
    statut: ['Actif'],
  });

  readonly fonctionOptions = [
    'Réceptionniste',
    'Coach',
    'Manager',
    'Responsable de salle',
    'Responsable RH',
    'Directeur adjoint',
    'Comptable',
    'Responsable commercial',
    'Agent d\'entretien',
    'Gardien',
    'Autre',
  ];

  readonly statutEmployeOptions = ['Actif', 'Inactif', 'Congé', 'Suspendu'];

  // Rôles & permissions
  readonly permissions = signal<Permission[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly selectedRole = signal<RoleDetail | null>(null);
  readonly selectedPermissionIds = signal<Set<string>>(new Set());
  readonly rolesLoading = signal(false);

  readonly permissionsByModule = computed(() => {
    const grouped = new Map<string, Permission[]>();
    for (const perm of this.permissions()) {
      const list = grouped.get(perm.module) ?? [];
      list.push(perm);
      grouped.set(perm.module, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  });

  readonly adminModulesMatrix = computed(() =>
    ADMIN_MODULE_KEYS.filter((key) => this.permissions().some((p) => p.module === key)).map(
      (key) => ({ key, label: this.formatModuleLabel(key) }),
    ),
  );

  readonly otherModulesMatrix = computed(() =>
    this.permissionsByModule()
      .filter(([module]) => !ADMIN_MODULE_KEYS.includes(module))
      .map(([key]) => ({ key, label: this.formatModuleLabel(key) })),
  );

  readonly canViewFullPrivilegesCatalog = computed(() =>
    PRIVILEGE_MANAGERS.includes(this.authService.roleName() ?? ''),
  );

  readonly selectedRoleGrantedCount = computed(() => {
    const role = this.selectedRole();
    if (!role) return 0;
    if (role.nom === 'super_admin') return this.permissions().length;
    return role.permissions.length;
  });

  readonly assignableRoles = computed(() => {
    const viewer = this.authService.roleName();
    const allowed =
      viewer === 'super_admin'
        ? USER_FORM_ROLES_SUPER_ADMIN
        : viewer === 'pdg'
          ? USER_FORM_ROLES_PDG
          : ASSIGNABLE_ROLES;
    return this.roles().filter((r) => allowed.includes(r.nom));
  });

  readonly editableRoles = computed(() =>
    this.roles().filter((r) => !SYSTEM_ROLES.includes(r.nom)),
  );

  readonly systemRolesList = computed(() =>
    this.roles().filter((r) => r.systeme === true || r.nom === 'super_admin' || r.nom === 'pdg'),
  );

  readonly operationalRolesList = computed(() =>
    this.roles().filter((r) => r.systeme !== true && r.nom !== 'super_admin' && r.nom !== 'pdg'),
  );

  ngOnInit(): void {
    this.loadRoles();
    this.loadUtilisateurs();
    this.loadPermissions();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.clearMessages();
    if (tab === 'employes' && this.employes().length === 0) {
      this.loadEmployes(1);
    }
    if (tab === 'roles' && !this.selectedRoleId() && this.roles().length > 0) {
      this.selectRole(this.roles()[0].id);
    }
    if (tab === 'tarifs' && !this.tarifs()) {
      this.loadTarifs();
    }
  }

  // ── Utilisateurs ──────────────────────────────────────────
  applyUserFilters(): void {
    // Filtres réactifs via computed
  }

  resetUserFilters(): void {
    this.userFilters.reset({ search: '', role: '', actif: '' });
  }

  startCreateUser(): void {
    this.formMode.set('create');
    this.editingUser.set(null);
    this.viewingUser.set(null);
    this.clearMessages();
    this.userForm.reset({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      password: '',
      role_nom: 'receptionniste',
      actif: true,
    });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(1)]);
    this.userForm.controls.password.updateValueAndValidity();
  }

  startEditUser(user: Utilisateur): void {
    if (SYSTEM_ROLES.includes(user.role.nom)) return;
    this.formMode.set('edit');
    this.viewingUser.set(null);
    this.editingUser.set(user);
    this.clearMessages();
    this.adminService.getUtilisateur(user.id).subscribe({
      next: (full) => {
        this.editingUser.set(full);
        this.userForm.reset({
          nom: full.nom,
          prenom: full.prenom,
          email: full.email,
          telephone: full.telephone ?? '',
          password: '',
          role_nom: full.role.nom,
          actif: full.actif,
        });
        this.userForm.controls.password.clearValidators();
        this.userForm.controls.password.updateValueAndValidity();
      },
      error: () => this.formError.set('Impossible de charger l\'utilisateur.'),
    });
  }

  viewUser(user: Utilisateur): void {
    this.formMode.set('view');
    this.editingUser.set(null);
    this.viewingUser.set(user);
    this.clearMessages();
  }

  submitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.clearMessages();
    const raw = this.userForm.getRawValue();
    const mode = this.formMode();

    if (mode === 'create') {
      this.adminService
        .createUtilisateur({
          nom: raw.nom,
          prenom: raw.prenom,
          email: raw.email,
          password: raw.password,
          role_nom: raw.role_nom,
          telephone: raw.telephone || undefined,
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.formSuccess.set('Compte créé avec succès.');
            this.startCreateUser();
            this.loadUtilisateurs();
          },
          error: (err) => this.handleError(err),
        });
      return;
    }

    if (mode === 'edit' && this.editingUser()) {
      const payload: Record<string, unknown> = {
        nom: raw.nom,
        prenom: raw.prenom,
        email: raw.email,
        role_nom: raw.role_nom,
        actif: raw.actif,
        telephone: raw.telephone || undefined,
      };
      if (raw.password) payload['password'] = raw.password;

      this.adminService.updateUtilisateur(this.editingUser()!.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.formSuccess.set('Utilisateur modifié.');
          this.loadUtilisateurs();
        },
        error: (err) => this.handleError(err),
      });
    }
  }

  deactivateUser(user: Utilisateur): void {
    if (SYSTEM_ROLES.includes(user.role.nom)) return;

    this.dialog
      .confirm({
        title: 'Désactiver le compte',
        message: `Désactiver le compte de ${user.prenom} ${user.nom} ?`,
        variant: 'warning',
        confirmLabel: 'Désactiver',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.adminService.deactivateUtilisateur(user.id).subscribe({
          next: () => {
            this.formSuccess.set('Compte désactivé.');
            this.loadUtilisateurs();
          },
          error: (err) => this.handleError(err),
        });
      });
  }

  isSystemUser(user: Utilisateur): boolean {
    return SYSTEM_ROLES.includes(user.role.nom);
  }

  // ── Employés ──────────────────────────────────────────────
  applyEmployeFilters(): void {
    this.loadEmployes(1);
  }

  resetEmployeFilters(): void {
    this.employeFilters.reset({ search: '', statut: '', fonction: '' });
    this.loadEmployes(1);
  }

  goToEmployePage(page: number): void {
    const meta = this.employesMeta();
    if (!meta || page < 1 || page > meta.last_page) return;
    this.loadEmployes(page);
  }

  startCreateEmploye(): void {
    this.formMode.set('create');
    this.editingEmploye.set(null);
    this.viewingEmploye.set(null);
    this.clearMessages();
    this.employeForm.reset({
      nom: '',
      prenom: '',
      fonction: '',
      telephone: '',
      email: '',
      adresse: '',
      date_embauche: new Date().toISOString().slice(0, 10),
      type_contrat: '',
      salaire_base: 0,
      statut: 'Actif',
    });
  }

  startEditEmploye(employe: Employe): void {
    this.formMode.set('edit');
    this.viewingEmploye.set(null);
    this.editingEmploye.set(employe);
    this.clearMessages();
    this.adminService.getEmploye(employe.id).subscribe({
      next: (full) => {
        this.editingEmploye.set(full);
        this.employeForm.reset({
          nom: full.nom,
          prenom: full.prenom,
          fonction: full.fonction,
          telephone: full.telephone ?? '',
          email: full.email ?? '',
          adresse: full.adresse ?? '',
          date_embauche: full.date_embauche,
          type_contrat: full.type_contrat ?? '',
          salaire_base: full.salaire_base,
          statut: full.statut,
        });
      },
      error: () => this.formError.set('Impossible de charger l\'employé.'),
    });
  }

  viewEmploye(employe: Employe): void {
    this.formMode.set('view');
    this.editingEmploye.set(null);
    this.viewingEmploye.set(null);
    this.clearMessages();
    this.adminService.getEmploye(employe.id).subscribe({
      next: (full) => this.viewingEmploye.set(full),
      error: () => this.formError.set('Impossible de charger l\'employé.'),
    });
  }

  employeNeedsEmail(fonction: string): boolean {
    return fonctionAvecRole(fonction);
  }

  submitEmploye(): void {
    if (this.employeForm.invalid) {
      this.employeForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.clearMessages();
    const raw = this.employeForm.getRawValue();
    const mode = this.formMode();

    if (this.employeNeedsEmail(raw.fonction) && !raw.email?.trim()) {
      this.submitting.set(false);
      this.formError.set('Un email est requis pour les fonctions associées à un rôle système.');
      return;
    }

    if (mode === 'create') {
      this.adminService
        .createEmploye({
          nom: raw.nom,
          prenom: raw.prenom,
          fonction: raw.fonction,
          date_embauche: raw.date_embauche,
          salaire_base: raw.salaire_base,
          telephone: raw.telephone || undefined,
          email: raw.email || undefined,
          adresse: raw.adresse || undefined,
          type_contrat: raw.type_contrat || undefined,
        })
        .subscribe({
          next: (created) => {
            this.submitting.set(false);
            this.formSuccess.set(
              created.compte_utilisateur
                ? 'Employé créé. Un compte utilisateur inactif a été généré automatiquement.'
                : 'Employé créé.',
            );
            this.startCreateEmploye();
            this.loadEmployes(1);
          },
          error: (err) => this.handleError(err),
        });
      return;
    }

    if (mode === 'edit' && this.editingEmploye()) {
      this.adminService
        .updateEmploye(this.editingEmploye()!.id, {
          nom: raw.nom,
          prenom: raw.prenom,
          fonction: raw.fonction,
          telephone: raw.telephone || undefined,
          email: raw.email || undefined,
          adresse: raw.adresse || undefined,
          type_contrat: raw.type_contrat || undefined,
          salaire_base: raw.salaire_base,
          statut: raw.statut,
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.formSuccess.set('Employé modifié.');
            this.loadEmployes(this.employesMeta()?.current_page ?? 1);
          },
          error: (err) => this.handleError(err),
        });
    }
  }

  deleteEmploye(employe: Employe): void {
    this.dialog
      .confirm({
        title: 'Supprimer l\'employé',
        message: `Supprimer ${employe.prenom} ${employe.nom} ?`,
        variant: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.adminService.deleteEmploye(employe.id).subscribe({
          next: () => {
            this.formSuccess.set('Employé supprimé.');
            this.loadEmployes(this.employesMeta()?.current_page ?? 1);
          },
          error: (err) => this.handleError(err),
        });
      });
  }

  // ── Rôles & permissions ───────────────────────────────────
  selectRole(roleId: string): void {
    this.selectedRoleId.set(roleId);
    this.rolesLoading.set(true);
    this.clearMessages();
    this.adminService.getRole(roleId).subscribe({
      next: (role) => {
        this.selectedRole.set(role);
        this.selectedPermissionIds.set(new Set(role.permissions.map((p) => p.id)));
        this.rolesLoading.set(false);
      },
      error: () => {
        this.formError.set('Impossible de charger le rôle.');
        this.rolesLoading.set(false);
      },
    });
  }

  togglePermission(permId: string, checked: boolean): void {
    const next = new Set(this.selectedPermissionIds());
    if (checked) next.add(permId);
    else next.delete(permId);
    this.selectedPermissionIds.set(next);
  }

  isPermissionChecked(permId: string): boolean {
    return this.selectedPermissionIds().has(permId);
  }

  getPermission(module: string, action: string): Permission | undefined {
    return this.permissions().find((p) => p.module === module && p.action === action);
  }

  isActionAvailable(module: string, action: string): boolean {
    return !!this.getPermission(module, action);
  }

  isPermissionGranted(module: string, action: string): boolean {
    const role = this.selectedRole();
    if (!role) return false;
    if (role.nom === 'super_admin') return this.isActionAvailable(module, action);
    const perm = this.getPermission(module, action);
    return perm ? this.selectedPermissionIds().has(perm.id) : false;
  }

  togglePermissionCell(module: string, action: string, checked: boolean): void {
    if (!this.canEditRolePermissions()) return;
    const perm = this.getPermission(module, action);
    if (!perm) return;
    this.togglePermission(perm.id, checked);
  }

  toggleModuleRow(module: string, checked: boolean): void {
    if (!this.canEditRolePermissions()) return;
    this.toggleModulePermissions(module, checked);
  }

  isModuleRowFullyGranted(module: string): boolean {
    const modulePerms = this.permissions().filter((p) => p.module === module);
    return (
      modulePerms.length > 0 &&
      modulePerms.every((p) => this.isPermissionGranted(module, p.action))
    );
  }

  grantedActionsForModule(module: string): string[] {
    return PERMISSION_ACTIONS.filter((action) =>
      this.isPermissionGranted(module, action),
    ).map((action) => this.formatActionLabel(action));
  }

  toggleModulePermissions(module: string, checked: boolean): void {
    const next = new Set(this.selectedPermissionIds());
    const modulePerms = this.permissions().filter((p) => p.module === module);
    for (const p of modulePerms) {
      if (checked) next.add(p.id);
      else next.delete(p.id);
    }
    this.selectedPermissionIds.set(next);
  }

  isModuleFullyChecked(module: string): boolean {
    const modulePerms = this.permissions().filter((p) => p.module === module);
    return modulePerms.length > 0 && modulePerms.every((p) => this.selectedPermissionIds().has(p.id));
  }

  saveRolePermissions(): void {
    const roleId = this.selectedRoleId();
    if (!roleId || !this.canEditRolePermissions()) return;

    this.submitting.set(true);
    this.clearMessages();
    this.adminService
      .updateRolePermissions(roleId, Array.from(this.selectedPermissionIds()))
      .subscribe({
        next: (role) => {
          this.submitting.set(false);
          this.selectedRole.set(role);
          this.formSuccess.set('Permissions enregistrées.');
        },
        error: (err) => this.handleError(err),
      });
  }

  isRoleEditable(): boolean {
    return this.canEditRolePermissions();
  }

  canEditRolePermissions(): boolean {
    const role = this.selectedRole();
    if (!role || role.nom === 'super_admin') return false;

    const viewerRole = this.authService.roleName();
    if (viewerRole === 'super_admin') return true;
    if (viewerRole === 'pdg') return PDG_EDITABLE_ROLES.includes(role.nom);
    return false;
  }

  formatModuleLabel(module: string): string {
    return MODULE_LABELS[module] ?? module.replace(/_/g, ' ');
  }

  formatActionLabel(action: string): string {
    const labels: Record<string, string> = {
      lecture: 'Lecture',
      creation: 'Création',
      modification: 'Modification',
      suppression: 'Suppression',
      validation: 'Validation',
      export: 'Export',
    };
    return labels[action] ?? action;
  }

  // ── Tarifs ────────────────────────────────────────────────
  submitTarifs(): void {
    if (this.tarifsForm.invalid) {
      this.tarifsForm.markAllAsTouched();
      return;
    }
    const v = this.tarifsForm.getRawValue();
    this.submitting.set(true);
    this.clearMessages();
    this.adminService
      .updateTarifs({
        tarif_seance_journaliere: v.tarif_seance_journaliere,
        abonnement_homme: {
          montant: v.homme_montant,
          montant_inscription: v.homme_montant_inscription,
        },
        abonnement_femme: {
          montant: v.femme_montant,
          montant_inscription: v.femme_montant_inscription,
        },
      })
      .subscribe({
        next: (tarifs) => {
          this.tarifs.set(tarifs);
          this.patchTarifsForm(tarifs);
          this.submitting.set(false);
          this.formSuccess.set('Tarifs enregistrés avec succès.');
        },
        error: (err) => this.handleError(err),
      });
  }

  private loadTarifs(): void {
    this.tarifsLoading.set(true);
    this.clearMessages();
    this.adminService.getTarifs().subscribe({
      next: (tarifs) => {
        this.tarifs.set(tarifs);
        this.patchTarifsForm(tarifs);
        this.tarifsLoading.set(false);
      },
      error: () => {
        this.formError.set('Impossible de charger les tarifs.');
        this.tarifsLoading.set(false);
      },
    });
  }

  private patchTarifsForm(tarifs: Tarifs): void {
    this.tarifsForm.reset({
      tarif_seance_journaliere: tarifs.tarif_seance_journaliere,
      homme_montant: tarifs.abonnement_homme.montant,
      homme_montant_inscription: tarifs.abonnement_homme.montant_inscription,
      femme_montant: tarifs.abonnement_femme.montant,
      femme_montant_inscription: tarifs.abonnement_femme.montant_inscription,
    });
  }

  // ── Chargement ────────────────────────────────────────────
  private loadUtilisateurs(): void {
    this.loading.set(true);
    this.adminService.listUtilisateurs().subscribe({
      next: (users) => {
        this.utilisateurs.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.formError.set('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      },
    });
  }

  private loadRoles(): void {
    this.adminService.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
    });
  }

  private loadPermissions(): void {
    this.adminService.listPermissions().subscribe({
      next: (perms) => this.permissions.set(perms),
    });
  }

  private loadEmployes(page: number): void {
    this.loading.set(true);
    const f = this.employeFilters.getRawValue();
    this.adminService
      .listEmployes({
        page,
        per_page: this.employePerPage,
        search: f.search || undefined,
        statut: f.statut || undefined,
        fonction: f.fonction || undefined,
      })
      .subscribe({
        next: ({ data, meta }) => {
          this.employes.set(data);
          this.employesMeta.set(meta);
          this.loading.set(false);
        },
        error: () => {
          this.formError.set('Impossible de charger les employés.');
          this.loading.set(false);
        },
      });
  }

  private clearMessages(): void {
    this.formSuccess.set(null);
    this.formError.set(null);
  }

  private handleError(err: { error?: { message?: string; detail?: string } }): void {
    this.submitting.set(false);
    const msg = err.error?.message ?? err.error?.detail ?? 'Une erreur est survenue.';
    this.formError.set(typeof msg === 'string' ? msg : 'Une erreur est survenue.');
  }
}
