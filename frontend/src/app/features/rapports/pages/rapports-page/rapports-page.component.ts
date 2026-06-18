import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '@core/services/auth.service';
import { Employe } from '@features/admin/models/employe.model';
import { AdminService } from '@features/admin/services/admin.service';
import {
  FichePaieRapport,
  JournalAuditRapport,
  JournalCaisseRapport,
  JournalClientRapport,
  JournalDepenseRapport,
  MasseSalarialeRapport,
  RapportFilters,
} from '@features/rapports/models/rapport.model';
import { RapportsService } from '@features/rapports/services/rapports.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

type RapportTab = 'fiches' | 'depenses' | 'audit' | 'caisse' | 'clients';

interface RapportTabConfig {
  id: RapportTab;
  labelKey: string;
  readPerms: string[];
  exportPerms: string[];
  listEndpoint: string;
  exportEndpoint: string;
}

const REPORT_TABS: RapportTabConfig[] = [
  {
    id: 'fiches',
    labelKey: 'modules.rapports.tabs.payroll',
    readPerms: ['rapports.lecture', 'salaires.lecture'],
    exportPerms: ['rapports.export', 'salaires.export'],
    listEndpoint: 'rapports/fiches-paie',
    exportEndpoint: 'rapports/fiches-paie/export',
  },
  {
    id: 'depenses',
    labelKey: 'modules.rapports.tabs.expenses',
    readPerms: ['rapports.lecture', 'finances.lecture'],
    exportPerms: ['rapports.export', 'finances.export'],
    listEndpoint: 'rapports/journal-depenses',
    exportEndpoint: 'rapports/journal-depenses/export',
  },
  {
    id: 'audit',
    labelKey: 'modules.rapports.tabs.audit',
    readPerms: ['rapports.lecture', 'audit.lecture'],
    exportPerms: ['rapports.export', 'audit.export'],
    listEndpoint: 'rapports/journal-audit',
    exportEndpoint: 'rapports/journal-audit/export',
  },
  {
    id: 'caisse',
    labelKey: 'modules.rapports.tabs.cash',
    readPerms: ['rapports.lecture', 'finances.lecture'],
    exportPerms: ['rapports.export', 'finances.export'],
    listEndpoint: 'rapports/journal-caisse',
    exportEndpoint: 'rapports/journal-caisse/export',
  },
  {
    id: 'clients',
    labelKey: 'modules.rapports.tabs.clients',
    readPerms: ['rapports.lecture', 'clients.lecture'],
    exportPerms: ['rapports.export', 'clients.export'],
    listEndpoint: 'rapports/journal-clients',
    exportEndpoint: 'rapports/journal-clients/export',
  },
];

const AUDIT_MODULES = [
  'clients',
  'paiements',
  'abonnements',
  'utilisateurs',
  'employes',
  'finances',
  'auth',
  'roles',
  'parametres',
];

const PAYROLL_STATUSES = ['En attente', 'Payé'] as const;

const PAYMENT_TYPES = [
  'Abonnement',
  'Séance journalière',
  'Service supplémentaire',
  'Autre',
] as const;

@Component({
  selector: 'app-rapports-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, DatePipe, MruCurrencyPipe, TranslatePipe],
  templateUrl: './rapports-page.component.html',
  styleUrl: './rapports-page.component.scss',
})
export class RapportsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rapportsService = inject(RapportsService);
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(DialogService);

  readonly auditModules = AUDIT_MODULES;
  readonly payrollStatuses = PAYROLL_STATUSES;
  readonly paymentTypes = PAYMENT_TYPES;
  readonly monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly yearOptions = this.buildYearOptions();

  readonly activeTab = signal<RapportTab>('fiches');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly generating = signal(false);
  readonly markingPaidId = signal<string | null>(null);
  readonly downloadingPdfId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showGeneratePanel = signal(false);

  readonly fiches = signal<FichePaieRapport[]>([]);
  readonly masseSalariale = signal<MasseSalarialeRapport | null>(null);
  readonly employes = signal<Employe[]>([]);
  readonly depenses = signal<JournalDepenseRapport[]>([]);
  readonly categories = signal<{ id: string; nom: string }[]>([]);
  readonly audits = signal<JournalAuditRapport[]>([]);
  readonly caisses = signal<JournalCaisseRapport[]>([]);
  readonly clients = signal<JournalClientRapport[]>([]);

  readonly filters = this.fb.nonNullable.group({
    date_debut: [''],
    date_fin: [''],
    mois: [''],
    annee: [''],
    statut: [''],
    employe_id: [''],
    module: [''],
    categorie_id: [''],
    type_paiement: [''],
  });

  readonly generateForm = this.fb.nonNullable.group({
    employe_id: ['', Validators.required],
    mois: [0, [Validators.required, Validators.min(1), Validators.max(12)]],
    annee: [0, [Validators.required, Validators.min(2000)]],
    primes: [0, [Validators.min(0)]],
    bonus: [0, [Validators.min(0)]],
    retenues: [0, [Validators.min(0)]],
  });

  readonly visibleTabs = computed(() =>
    REPORT_TABS.filter((tab) => this.auth.hasAnyPermission(tab.readPerms)),
  );

  readonly currentTabConfig = computed(() =>
    REPORT_TABS.find((tab) => tab.id === this.activeTab()) ?? null,
  );

  readonly canExportCurrent = computed(() => {
    const tab = this.currentTabConfig();
    return tab ? this.auth.hasAnyPermission(tab.exportPerms) : false;
  });

  readonly canCreatePayroll = computed(() => this.auth.hasPermission('salaires.creation'));
  readonly canValidatePayroll = computed(() => this.auth.hasPermission('salaires.validation'));

  readonly selectedEmployeForGenerate = computed(() => {
    const id = this.generateForm.controls.employe_id.value;
    return this.employes().find((e) => e.id === id) ?? null;
  });

  readonly previewNetSalary = computed(() => {
    const emp = this.selectedEmployeForGenerate();
    if (!emp) return 0;
    const { primes, bonus, retenues } = this.generateForm.getRawValue();
    return Number(emp.salaire_base) + Number(primes) + Number(bonus) - Number(retenues);
  });

  readonly rowCount = computed(() => {
    switch (this.activeTab()) {
      case 'fiches':
        return this.fiches().length;
      case 'depenses':
        return this.depenses().length;
      case 'audit':
        return this.audits().length;
      case 'caisse':
        return this.caisses().length;
      case 'clients':
        return this.clients().length;
      default:
        return 0;
    }
  });

  readonly totalPayrollNet = computed(() =>
    this.fiches().reduce((sum, row) => sum + Number(row.salaire_final ?? 0), 0),
  );

  readonly totalPayrollBrut = computed(() =>
    this.fiches().reduce(
      (sum, row) => sum + Number(row.salaire_base) + Number(row.primes) + Number(row.bonus),
      0,
    ),
  );

  readonly payrollPaidCount = computed(
    () => this.fiches().filter((r) => r.statut_paiement === 'Payé').length,
  );

  readonly payrollPendingCount = computed(
    () => this.fiches().filter((r) => r.statut_paiement !== 'Payé').length,
  );

  readonly totalExpenses = computed(() =>
    this.depenses().reduce((sum, row) => sum + Number(row.montant), 0),
  );

  readonly totalCashIn = computed(() =>
    this.caisses().reduce((sum, row) => sum + Number(row.montant), 0),
  );

  readonly cashSubscriptionCount = computed(
    () => this.caisses().filter((r) => r.type_paiement === 'Abonnement').length,
  );

  readonly cashOtherPaymentsCount = computed(
    () => this.caisses().filter((r) => r.type_paiement !== 'Abonnement').length,
  );

  readonly activeClientsCount = computed(() => this.clients().filter((c) => c.actif).length);

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.setDefaultPayrollPeriod();

    if (this.auth.hasAnyPermission(['rapports.lecture', 'finances.lecture'])) {
      this.rapportsService.listCategories().subscribe({
        next: (cats) => this.categories.set(cats),
        error: () => this.categories.set([]),
      });
    }

    if (this.auth.hasAnyPermission(['rapports.lecture', 'salaires.lecture', 'salaires.creation'])) {
      this.adminService.listEmployes({ statut: 'Actif', per_page: 100 }).subscribe({
        next: ({ data }) => this.employes.set(data),
        error: () => this.employes.set([]),
      });
    }

    const tabs = this.visibleTabs();
    if (tabs.length > 0) {
      this.activeTab.set(tabs[0].id);
      this.loadCurrentTab();
    } else {
      this.error.set('Aucun rapport accessible avec vos permissions.');
    }
  }

  setTab(tab: RapportTab): void {
    if (!this.visibleTabs().some((t) => t.id === tab)) return;
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
    this.loadCurrentTab();
  }

  applyFilters(): void {
    this.loadCurrentTab();
  }

  resetFilters(): void {
    if (this.activeTab() === 'fiches') {
      this.setDefaultPayrollPeriod();
      this.filters.patchValue({ statut: '', employe_id: '' });
    } else {
      this.setDefaultDateRange();
    }
    this.filters.patchValue({ module: '', categorie_id: '', type_paiement: '' });
    this.loadCurrentTab();
  }

  toggleGeneratePanel(): void {
    this.showGeneratePanel.update((v) => !v);
    if (this.showGeneratePanel()) {
      this.syncGenerateFormPeriod();
    }
  }

  generatePayroll(): void {
    if (!this.canCreatePayroll() || this.generateForm.invalid) {
      this.generateForm.markAllAsTouched();
      return;
    }

    const payload = this.generateForm.getRawValue();
    this.generating.set(true);
    this.error.set(null);
    this.success.set(null);

    this.rapportsService
      .genererFichePaie({
        employe_id: payload.employe_id,
        mois: payload.mois,
        annee: payload.annee,
        primes: Number(payload.primes),
        bonus: Number(payload.bonus),
        retenues: Number(payload.retenues),
      })
      .subscribe({
        next: (fiche) => {
          this.generating.set(false);
          this.success.set(
            `Bulletin généré — salaire net ${Number(fiche.salaire_final ?? 0).toLocaleString('fr-FR')} MRU`,
          );
          this.showGeneratePanel.set(false);
          this.generateForm.patchValue({ primes: 0, bonus: 0, retenues: 0 });
          this.filters.patchValue({
            mois: String(payload.mois),
            annee: String(payload.annee),
          });
          this.loadCurrentTab();
        },
        error: (err) => {
          this.generating.set(false);
          this.error.set(err?.error?.detail ?? 'Impossible de générer le bulletin.');
        },
      });
  }

  markAsPaid(fiche: FichePaieRapport): void {
    if (!this.canValidatePayroll() || fiche.statut_paiement === 'Payé') return;

    this.dialog
      .confirm({
        title: 'Marquer comme payé',
        message: `Confirmer le paiement de ${fiche.employe_nom} pour ${fiche.mois}/${fiche.annee} ?`,
        confirmLabel: 'Marquer payé',
        variant: 'default',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.markingPaidId.set(fiche.id);
        this.rapportsService.marquerFichePayee(fiche.id).subscribe({
          next: () => {
            this.markingPaidId.set(null);
            this.success.set('Bulletin marqué comme payé.');
            this.loadCurrentTab();
          },
          error: () => {
            this.markingPaidId.set(null);
            this.error.set('Impossible de marquer le bulletin comme payé.');
          },
        });
      });
  }

  downloadFichePdf(fiche: FichePaieRapport): void {
    if (!this.canExportCurrent()) return;

    this.downloadingPdfId.set(fiche.id);
    this.rapportsService.downloadFichePdf(fiche.id).subscribe({
      next: (blob) => {
        this.downloadingPdfId.set(null);
        const file = `fiche_paie_${fiche.employe_nom.replace(/\s+/g, '_')}_${fiche.mois}_${fiche.annee}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingPdfId.set(null);
        this.error.set('Impossible de télécharger le PDF du bulletin.');
      },
    });
  }

  exportCurrent(format: 'excel' | 'pdf'): void {
    const tab = this.currentTabConfig();
    if (!tab || !this.canExportCurrent()) return;

    this.exporting.set(true);
    this.error.set(null);
    this.rapportsService.download(`${tab.exportEndpoint}/${format}`, this.buildFilterParams()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const file = `rapport_${tab.id}_${new Date().toISOString().slice(0, 10)}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting.set(false);
        this.error.set("Erreur lors de l'export. Vérifiez vos permissions ou réessayez.");
      },
    });
  }

  private buildFilterParams(): RapportFilters & { module?: string } {
    const payload = this.filters.getRawValue();
    const tab = this.activeTab();

    if (tab === 'fiches') {
      return {
        mois: payload.mois || undefined,
        annee: payload.annee || undefined,
        statut: payload.statut || undefined,
        employe_id: payload.employe_id || undefined,
      };
    }

    const common = {
      date_debut: payload.date_debut || undefined,
      date_fin: payload.date_fin || undefined,
    };

    if (tab === 'audit') {
      return { ...common, module: payload.module || undefined };
    }
    if (tab === 'depenses') {
      return { ...common, categorie_id: payload.categorie_id || undefined };
    }
    if (tab === 'caisse') {
      return { ...common, type_paiement: payload.type_paiement || undefined };
    }
    return common;
  }

  private setDefaultDateRange(): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filters.patchValue({
      date_debut: start.toISOString().slice(0, 10),
      date_fin: now.toISOString().slice(0, 10),
    });
  }

  private setDefaultPayrollPeriod(): void {
    const now = new Date();
    this.filters.patchValue({
      mois: String(now.getMonth() + 1),
      annee: String(now.getFullYear()),
    });
    this.syncGenerateFormPeriod();
  }

  private syncGenerateFormPeriod(): void {
    const { mois, annee } = this.filters.getRawValue();
    this.generateForm.patchValue({
      mois: Number(mois) || new Date().getMonth() + 1,
      annee: Number(annee) || new Date().getFullYear(),
    });
  }

  private buildYearOptions(): number[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - i);
  }

  private loadCurrentTab(): void {
    const tab = this.currentTabConfig();
    if (!tab) return;

    this.loading.set(true);
    this.error.set(null);
    const params = this.buildFilterParams();

    const onError = (err?: { status?: number }) => {
      this.loading.set(false);
      if (err?.status === 403) {
        this.error.set('Permission insuffisante pour ce rapport.');
      } else {
        this.error.set('Impossible de charger ce rapport.');
      }
    };

    if (tab.id === 'fiches') {
      const mois = Number(this.filters.getRawValue().mois);
      const annee = Number(this.filters.getRawValue().annee);

      this.rapportsService.listFichesPaie(params).subscribe({
        next: (rows) => {
          this.fiches.set(rows);
          this.loading.set(false);
        },
        error: onError,
      });

      if (mois >= 1 && mois <= 12 && annee > 0) {
        this.rapportsService.getMasseSalariale(mois, annee).subscribe({
          next: (data) => this.masseSalariale.set(data),
          error: () => this.masseSalariale.set(null),
        });
      } else {
        this.masseSalariale.set(null);
      }
      return;
    }

    if (tab.id === 'depenses') {
      this.rapportsService.listJournalDepenses(params).subscribe({
        next: (rows) => {
          this.depenses.set(rows);
          this.loading.set(false);
        },
        error: onError,
      });
      return;
    }

    if (tab.id === 'audit') {
      this.rapportsService.listJournalAudit(params).subscribe({
        next: (rows) => {
          this.audits.set(rows);
          this.loading.set(false);
        },
        error: onError,
      });
      return;
    }

    if (tab.id === 'caisse') {
      this.rapportsService.listJournalCaisse(params).subscribe({
        next: (rows) => {
          this.caisses.set(rows);
          this.loading.set(false);
        },
        error: onError,
      });
      return;
    }

    this.rapportsService.listJournalClients(params).subscribe({
      next: (rows) => {
        this.clients.set(rows);
        this.loading.set(false);
      },
      error: onError,
    });
  }
}
