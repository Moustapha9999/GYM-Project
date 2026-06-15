import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  DashboardService,
} from '@features/dashboard/services/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header
      [title]="'Tableau de bord'"
      [subtitle]="dashboardSubtitle()"
    />

    @if (loading()) {
      <app-loading-spinner />
    } @else if (error()) {
      <app-empty-state
        icon="alert-triangle"
        title="Impossible de charger le tableau de bord"
        [description]="error()!"
      />
    } @else if (kpis()) {
      <section class="kpi-grid">
        @for (entry of kpiEntries(); track entry.key) {
          <article class="kpi-card">
            <span class="kpi-card__label">{{ entry.key }}</span>
            <strong class="kpi-card__value">{{ entry.value }}</strong>
          </article>
        }
      </section>
    }
  `,
  styles: `
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }

    .kpi-card__label {
      display: block;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      text-transform: capitalize;
    }

    .kpi-card__value {
      display: block;
      margin-top: 0.5rem;
      font-size: 1.5rem;
      color: var(--color-text);
    }
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly kpis = signal<Record<string, number | string> | null>(null);

  readonly roleLabel = computed(() => this.auth.currentUser()?.role.libelle);
  readonly dashboardSubtitle = computed(() => `Vue d'ensemble — ${this.roleLabel() ?? ''}`);
  readonly kpiEntries = computed(() => {
    const data = this.kpis();
    if (!data) {
      return [];
    }

    return Object.entries(data).map(([key, value]) => ({
      key: key.replaceAll('_', ' '),
      value,
    }));
  });

  ngOnInit(): void {
    const role = this.auth.roleName();

    if (role === 'coach') {
      this.dashboardService.getCoachDashboard().subscribe({
        next: (data) => {
          this.kpis.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Vérifiez que l\'API backend est démarrée.');
          this.loading.set(false);
        },
      });
      return;
    }

    if (role === 'receptionniste') {
      this.dashboardService.getReceptionDashboard().subscribe({
        next: (data) => {
          this.kpis.set(data as unknown as Record<string, number | string>);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Vérifiez que l\'API backend est démarrée.');
          this.loading.set(false);
        },
      });
      return;
    }

    this.dashboardService.getAdminDashboard().subscribe({
      next: (data) => {
        this.kpis.set(data as unknown as Record<string, number | string>);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Vérifiez que l\'API backend est démarrée.');
        this.loading.set(false);
      },
    });
  }
}
