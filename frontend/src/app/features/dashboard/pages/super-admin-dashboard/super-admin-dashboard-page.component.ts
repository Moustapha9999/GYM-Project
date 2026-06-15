import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslationService } from '@core/services/translation.service';
import { AdminDashboardData } from '@features/dashboard/models/admin-dashboard.model';
import { DashboardService } from '@features/dashboard/services/dashboard.service';

interface KpiCard {
  labelKey: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: AppIconName;
}

@Component({
  selector: 'app-super-admin-dashboard-page',
  imports: [LoadingSpinnerComponent, MruCurrencyPipe, TranslatePipe, AppIconComponent],
  templateUrl: './super-admin-dashboard-page.component.html',
  styleUrl: './super-admin-dashboard-page.component.scss',
})
export class SuperAdminDashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly translation = inject(TranslationService);
  private readonly mruPipe = new MruCurrencyPipe();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<AdminDashboardData | null>(null);

  readonly greeting = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom}` : 'Admin';
  });

  readonly kpiCards = computed((): KpiCard[] => {
    const d = this.data();
    if (!d) return [];

    return [
      {
        labelKey: 'dashboard.kpi.monthlyRevenue',
        value: this.mruPipe.transform(Number(d.revenus_mois)),
        trend: `+${d.nouvelles_inscriptions_mois} inscriptions`,
        trendUp: true,
        icon: 'wallet',
      },
      {
        labelKey: 'dashboard.kpi.activeSubscriptions',
        value: String(d.abonnements_actifs),
        trend: `${d.abonnements_expirant_7j} expirent sous 7j`,
        trendUp: d.abonnements_expirant_7j === 0,
        icon: 'ticket',
      },
      {
        labelKey: 'dashboard.kpi.activeClients',
        value: String(d.clients_actifs),
        trend: `${d.presences_jour} présences aujourd'hui`,
        trendUp: true,
        icon: 'users',
      },
      {
        labelKey: 'dashboard.kpi.monthlyProfit',
        value: this.mruPipe.transform(Number(d.benefice_mois)),
        trend: `Dépenses ${this.mruPipe.transform(Number(d.total_depenses_mois))}`,
        trendUp: Number(d.benefice_mois) >= 0,
        icon: 'trending-up',
      },
    ];
  });

  readonly barChart = computed(() => {
    const points = this.data()?.revenus_7_derniers_jours ?? [];
    const values = points.map((p) => Number(p.valeur));
    const max = Math.max(...values, 1);
    return points.map((p) => ({
      label: p.label,
      value: Number(p.valeur),
      height: (Number(p.valeur) / max) * 100,
    }));
  });

  readonly donutSegments = computed(() => {
    const items = this.data()?.repartition_abonnements_sexe ?? [];
    const total = items.reduce((sum, i) => sum + Number(i.valeur), 0) || 1;
    const colors = ['#3b82f6', '#fb923c', '#22c55e', '#a855f7'];
    let offset = 0;

    return items.map((item, index) => {
      const pct = (Number(item.valeur) / total) * 100;
      const segment = { label: item.label, value: Number(item.valeur), pct, color: colors[index % colors.length], offset };
      offset += pct;
      return segment;
    });
  });

  readonly donutGradient = computed(() => {
    const segments = this.donutSegments();
    if (!segments.length) return 'var(--color-border)';
    let gradient = 'conic-gradient(';
    segments.forEach((s, i) => {
      const start = s.offset;
      const end = s.offset + s.pct;
      gradient += `${s.color} ${start}% ${end}%`;
      if (i < segments.length - 1) gradient += ', ';
    });
    gradient += ')';
    return gradient;
  });

  readonly areaPoints = computed(() => {
    const points = this.data()?.revenus_7_derniers_jours ?? [];
    const values = points.map((p) => Number(p.valeur));
    const max = Math.max(...values, 1);
    const width = 100;
    const height = 60;
    const step = points.length > 1 ? width / (points.length - 1) : width;

    const coords = points.map((p, i) => {
      const x = i * step;
      const y = height - (Number(p.valeur) / max) * height;
      return `${x},${y}`;
    });

    return {
      line: coords.join(' '),
      area: coords.length ? `0,${height} ${coords.join(' ')} ${width},${height}` : '',
      labels: points.map((p) => p.label),
      total: values.reduce((a, b) => a + b, 0),
    };
  });

  ngOnInit(): void {
    this.dashboardService.getAdminDashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translation.translate('dashboard.loadError'));
        this.loading.set(false);
      },
    });
  }
}
