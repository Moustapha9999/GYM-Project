import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { ReceptionDashboardData } from '@features/dashboard/models/reception-dashboard.model';
import { DashboardService } from '@features/dashboard/services/dashboard.service';

@Component({
  selector: 'app-reception-dashboard-page',
  imports: [LoadingSpinnerComponent, MruCurrencyPipe],
  templateUrl: './reception-dashboard-page.component.html',
  styleUrl: './reception-dashboard-page.component.scss',
})
export class ReceptionDashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly mruPipe = new MruCurrencyPipe();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ReceptionDashboardData | null>(null);

  readonly greeting = computed(() => this.auth.currentUser()?.prenom ?? 'Réception');

  readonly statCards = computed(() => {
    const d = this.data();
    if (!d) return [];

    return [
      {
        label: 'Paiements du jour',
        value: String(d.nombre_paiements_jour),
        highlight: true,
      },
      {
        label: 'Présences du jour',
        value: String(d.presences_jour),
        highlight: false,
      },
      {
        label: 'Séances encaissées',
        value: String(d.seances_jour),
        highlight: false,
      },
      {
        label: 'Abonnements expirant',
        value: String(d.abonnements_expirant_7j),
        highlight: false,
      },
    ];
  });

  readonly activityBars = computed(() => {
    const d = this.data();
    if (!d) return [];

    const items = [
      { label: 'S', value: d.nombre_paiements_jour },
      { label: 'M', value: d.presences_jour },
      { label: 'T', value: d.seances_jour },
      { label: 'W', value: d.abonnements_souscrits_jour },
      { label: 'T', value: d.presents_actuellement },
      { label: 'F', value: Math.min(d.presences_jour, d.nombre_paiements_jour) },
      { label: 'S', value: d.abonnements_expirant_7j },
    ];
    const max = Math.max(...items.map((i) => i.value), 1);
    return items.map((i) => ({ ...i, height: (i.value / max) * 100 }));
  });

  readonly progressPct = computed(() => {
    const d = this.data();
    if (!d || d.presences_jour === 0) return 0;
    return Math.round((d.presents_actuellement / d.presences_jour) * 100);
  });

  readonly revenusFormatted = computed(() => {
    const d = this.data();
    return d ? this.mruPipe.transform(Number(d.revenus_jour)) : '—';
  });

  ngOnInit(): void {
    this.dashboardService.getReceptionDashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le tableau de bord réception.');
        this.loading.set(false);
      },
    });
  }
}
