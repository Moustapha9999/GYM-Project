import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PaginationMeta } from '@core/models/api-response.model';
import { AuthService } from '@core/services/auth.service';
import {
  BilanFinancier,
  CategorieDepense,
  Depense,
} from '@features/finances/models/finance.model';
import { FinancesService } from '@features/finances/services/finances.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-finances-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, MruCurrencyPipe, DatePipe, TranslatePipe],
  templateUrl: './finances-list-page.component.html',
  styleUrl: './finances-list-page.component.scss',
})
export class FinancesListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly financesService = inject(FinancesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(DialogService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly depenses = signal<Depense[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly categories = signal<CategorieDepense[]>([]);
  readonly bilan = signal<BilanFinancier | null>(null);
  readonly chartDepenses = signal<Depense[]>([]);
  readonly error = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formMode = signal<FormMode>('create');
  readonly editingDepense = signal<Depense | null>(null);
  readonly viewingDepense = signal<Depense | null>(null);

  readonly perPage = 15;

  readonly canCreate = computed(() => this.auth.hasPermission('finances.creation'));
  readonly canEdit = computed(() => this.auth.hasPermission('finances.modification'));
  readonly canDelete = computed(() => this.auth.hasPermission('finances.suppression'));

  readonly totalFiltered = computed(() =>
    this.depenses().reduce((sum, d) => sum + Number(d.montant), 0),
  );

  readonly comparisonChart = computed(() => {
    const b = this.bilan();
    if (!b) return [];

    const items = [
      {
        labelKey: 'modules.finances.kpi.revenue',
        value: Number(b.total_revenus),
        tone: 'revenue' as const,
      },
      {
        labelKey: 'modules.finances.kpi.expenses',
        value: Number(b.total_depenses),
        tone: 'expense' as const,
      },
      {
        labelKey: 'modules.finances.kpi.profit',
        value: Number(b.benefice),
        tone: 'profit' as const,
      },
    ];

    const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);
    return items.map((item) => ({
      ...item,
      height: (Math.abs(item.value) / max) * 100,
      negative: item.value < 0,
    }));
  });

  readonly categoryDonutSegments = computed(() => {
    const items = this.bilan()?.depenses_par_categorie ?? [];
    const total = items.reduce((sum, item) => sum + Number(item.total), 0) || 1;
    const colors = ['#3b82f6', '#fb923c', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];
    let offset = 0;

    return items.map((item, index) => {
      const pct = (Number(item.total) / total) * 100;
      const segment = {
        label: item.categorie,
        value: Number(item.total),
        pct,
        color: colors[index % colors.length],
        offset,
      };
      offset += pct;
      return segment;
    });
  });

  readonly categoryDonutGradient = computed(() => {
    const segments = this.categoryDonutSegments();
    if (!segments.length) return 'var(--color-border)';

    let gradient = 'conic-gradient(';
    segments.forEach((segment, index) => {
      const start = segment.offset;
      const end = segment.offset + segment.pct;
      gradient += `${segment.color} ${start}% ${end}%`;
      if (index < segments.length - 1) gradient += ', ';
    });
    gradient += ')';
    return gradient;
  });

  readonly expenseTrend = computed(() => {
    const items = this.chartDepenses();
    const byDate = new Map<string, number>();

    items.forEach((depense) => {
      byDate.set(
        depense.date_depense,
        (byDate.get(depense.date_depense) ?? 0) + Number(depense.montant),
      );
    });

    const points = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        label: date.slice(8, 10) + '/' + date.slice(5, 7),
        value,
      }));

    const values = points.map((point) => point.value);
    const max = Math.max(...values, 1);
    const width = 100;
    const height = 60;
    const step = points.length > 1 ? width / (points.length - 1) : width;

    const coords = points.map((point, index) => {
      const x = index * step;
      const y = height - (point.value / max) * height;
      return `${x},${y}`;
    });

    return {
      points,
      line: coords.join(' '),
      area: coords.length ? `0,${height} ${coords.join(' ')} ${width},${height}` : '',
      labels: points.map((point) => point.label),
      total: values.reduce((sum, value) => sum + value, 0),
      hasData: points.length > 0,
    };
  });

  readonly filters = this.fb.nonNullable.group({
    date_debut: [this.startOfMonth()],
    date_fin: [this.todayIso()],
    categorie_id: [''],
  });

  readonly depenseForm = this.fb.nonNullable.group({
    categorie_id: ['', [Validators.required]],
    libelle: ['', [Validators.required, Validators.minLength(2)]],
    montant: ['', [Validators.required, Validators.min(0.01)]],
    date_depense: [this.todayIso(), [Validators.required]],
    justificatif_url: [''],
  });

  ngOnInit(): void {
    this.financesService.listCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });
    this.loadData(1);
  }

  applyFilters(): void {
    this.loadData(1);
  }

  resetFilters(): void {
    this.filters.reset({
      date_debut: this.startOfMonth(),
      date_fin: this.todayIso(),
      categorie_id: '',
    });
    this.loadData(1);
  }

  goToPage(page: number): void {
    const pagination = this.meta();
    if (!pagination || page < 1 || page > pagination.last_page) return;
    this.loadData(page);
  }

  categoryLabel(categorieId: string): string {
    return this.categories().find((c) => c.id === categorieId)?.nom ?? '—';
  }

  startCreate(): void {
    this.formMode.set('create');
    this.editingDepense.set(null);
    this.viewingDepense.set(null);
    this.formSuccess.set(null);
    this.formError.set(null);
    this.depenseForm.reset({
      categorie_id: '',
      libelle: '',
      montant: '',
      date_depense: this.todayIso(),
      justificatif_url: '',
    });
    this.depenseForm.enable();
  }

  viewDepense(depense: Depense): void {
    this.formMode.set('view');
    this.viewingDepense.set(depense);
    this.editingDepense.set(null);
    this.formSuccess.set(null);
    this.formError.set(null);
  }

  startEdit(depense: Depense): void {
    this.formMode.set('edit');
    this.editingDepense.set(depense);
    this.viewingDepense.set(null);
    this.formSuccess.set(null);
    this.formError.set(null);
    this.depenseForm.reset({
      categorie_id: depense.categorie_id,
      libelle: depense.libelle,
      montant: String(depense.montant),
      date_depense: depense.date_depense,
      justificatif_url: depense.justificatif_url ?? '',
    });
    this.depenseForm.enable();
  }

  submitDepense(): void {
    if (this.formMode() === 'view') return;

    this.formSuccess.set(null);
    this.formError.set(null);

    if (this.depenseForm.invalid) {
      this.depenseForm.markAllAsTouched();
      return;
    }

    const raw = this.depenseForm.getRawValue();
    const payload = {
      categorie_id: raw.categorie_id,
      libelle: raw.libelle.trim(),
      montant: Number(raw.montant),
      date_depense: raw.date_depense,
      justificatif_url: raw.justificatif_url.trim() || undefined,
    };

    this.submitting.set(true);

    if (this.formMode() === 'create') {
      this.financesService.createDepense(payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.formSuccess.set('Dépense enregistrée.');
          this.loadData(1);
          this.startCreate();
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(err?.error?.detail ?? 'Erreur lors de l\'enregistrement.');
        },
      });
      return;
    }

    if (this.editingDepense()) {
      this.financesService.updateDepense(this.editingDepense()!.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.formSuccess.set('Dépense modifiée.');
          this.loadData(this.meta()?.current_page ?? 1);
          this.startCreate();
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(err?.error?.detail ?? 'Erreur lors de la modification.');
        },
      });
    }
  }

  deleteDepense(depense: Depense): void {
    if (!this.canDelete()) return;

    this.dialog
      .confirm({
        title: 'Supprimer la dépense',
        message: `Supprimer la dépense « ${depense.reference} » ?`,
        variant: 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.financesService.deleteDepense(depense.id).subscribe({
          next: () => this.loadData(this.meta()?.current_page ?? 1),
          error: (err) => {
            this.error.set(err?.error?.detail ?? 'Erreur lors de la suppression.');
          },
        });
      });
  }

  private loadData(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const raw = this.filters.getRawValue();
    const dateDebut = raw.date_debut || this.startOfMonth();
    const dateFin = raw.date_fin || this.todayIso();

    this.financesService.getBilan(dateDebut, dateFin).subscribe({
      next: (data) => this.bilan.set(data),
      error: () => this.bilan.set(null),
    });

    this.financesService
      .listDepenses({
        date_debut: dateDebut,
        date_fin: dateFin,
        categorie_id: raw.categorie_id || undefined,
        page: 1,
        per_page: 100,
      })
      .subscribe({
        next: (response) => this.chartDepenses.set(response.data),
        error: () => this.chartDepenses.set([]),
      });

    this.financesService
      .listDepenses({
        date_debut: dateDebut,
        date_fin: dateFin,
        categorie_id: raw.categorie_id || undefined,
        page,
        per_page: this.perPage,
      })
      .subscribe({
        next: (response) => {
          this.depenses.set(response.data);
          this.meta.set(response.meta);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Impossible de charger les finances.');
        },
      });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private startOfMonth(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
}
