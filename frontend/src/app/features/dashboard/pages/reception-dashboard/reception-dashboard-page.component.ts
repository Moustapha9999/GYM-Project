import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';
import { Planning, Programme } from '@features/coach/models/coach.model';
import { CoachService } from '@features/coach/services/coach.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import {
  ChartPoint,
  ReceptionDashboardData,
} from '@features/dashboard/models/reception-dashboard.model';
import { DashboardService } from '@features/dashboard/services/dashboard.service';

interface BarItem {
  label: string;
  value: number;
  height: number;
  colorClass?: string;
}

@Component({
  selector: 'app-reception-dashboard-page',
  imports: [LoadingSpinnerComponent, TranslatePipe, RouterLink, AppIconComponent, DatePipe],
  templateUrl: './reception-dashboard-page.component.html',
  styleUrl: './reception-dashboard-page.component.scss',
})
export class ReceptionDashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly coachService = inject(CoachService);
  private readonly mruPipe = new MruCurrencyPipe();

  readonly routes = APP_ROUTES;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ReceptionDashboardData | null>(null);

  readonly greeting = computed(() => this.auth.currentUser()?.prenom ?? 'Réception');

  readonly isManager = computed(() => this.auth.roleName() === 'manager');

  readonly canViewPlanning = computed(() => this.auth.hasPermission('planning.lecture'));
  readonly canViewProgrammes = computed(() =>
    this.auth.hasPermission('programmes_sportifs.lecture'),
  );

  readonly showPlanningSection = computed(
    () => this.isManager() && (this.canViewPlanning() || this.canViewProgrammes()),
  );

  readonly todayPlannings = signal<Planning[]>([]);
  readonly activeProgrammes = signal<Programme[]>([]);
  readonly planningActivitiesLoading = signal(false);
  readonly programmesActivitiesLoading = signal(false);

  readonly statCards = computed(() => {
    const d = this.data();
    if (!d) return [];

    return [
      {
        labelKey: 'dashboard.reception.kpi.revenue',
        value: this.mruPipe.transform(Number(d.revenus_jour)),
        highlight: true,
      },
      {
        labelKey: 'dashboard.reception.kpi.paymentsToday',
        value: String(d.nombre_paiements_jour),
        highlight: false,
      },
      {
        labelKey: 'dashboard.reception.kpi.subscriptionsToday',
        value: String(d.abonnements_souscrits_jour),
        highlight: false,
      },
      {
        labelKey: 'dashboard.reception.kpi.expiringSubscriptions',
        value: String(d.abonnements_expirant_7j),
        highlight: false,
      },
    ];
  });

  readonly coachStatCards = computed(() => {
    const d = this.data();
    if (!d) return [];

    const cards = [];
    if (this.canViewProgrammes()) {
      cards.push({
        labelKey: 'dashboard.reception.kpi.activePrograms',
        value: String(d.programmes_actifs),
      });
      cards.push({
        labelKey: 'dashboard.reception.kpi.clientsFollowed',
        value: String(d.clients_suivis),
      });
    }
    if (this.canViewPlanning()) {
      cards.push({
        labelKey: 'dashboard.reception.kpi.sessionsToday',
        value: String(d.seances_planifiees_jour),
      });
      cards.push({
        labelKey: 'dashboard.reception.kpi.sessionsWeek',
        value: String(d.seances_planifiees_semaine),
      });
    }
    return cards;
  });

  readonly activityBars = computed(() => this.toBars(this.data()?.activite_7_jours ?? []));

  readonly progressPct = computed(() => {
    const d = this.data();
    if (!d || d.presences_jour === 0) return 0;
    return Math.min(100, Math.round((d.presents_actuellement / d.presences_jour) * 100));
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

    if (this.showPlanningSection()) {
      this.loadPlanningActivities();
      this.loadProgrammeActivities();
    }
  }

  coachName(item: {
    coach_prenom?: string | null;
    coach_nom?: string | null;
  }): string {
    if (item.coach_prenom || item.coach_nom) {
      return `${item.coach_prenom ?? ''} ${item.coach_nom ?? ''}`.trim();
    }
    return '—';
  }

  clientName(item: {
    client_prenom?: string | null;
    client_nom?: string | null;
  }): string {
    if (item.client_prenom || item.client_nom) {
      return `${item.client_prenom ?? ''} ${item.client_nom ?? ''}`.trim();
    }
    return '—';
  }

  shortTime(value: string): string {
    return value ? value.slice(0, 5) : value;
  }

  statutClass(statut: string): string {
    const map: Record<string, string> = {
      Planifié: 'is-planned',
      Confirmé: 'is-confirmed',
      Terminé: 'is-done',
      Annulé: 'is-cancelled',
    };
    return map[statut] ?? 'is-planned';
  }

  private loadPlanningActivities(): void {
    if (!this.canViewPlanning()) return;

    this.planningActivitiesLoading.set(true);
    this.coachService
      .listPlanning({ jour: this.todayIso(), per_page: 6 })
      .subscribe({
        next: (response) => {
          this.todayPlannings.set(response.data);
          this.planningActivitiesLoading.set(false);
        },
        error: () => this.planningActivitiesLoading.set(false),
      });
  }

  private loadProgrammeActivities(): void {
    if (!this.canViewProgrammes()) return;

    this.programmesActivitiesLoading.set(true);
    this.coachService
      .listProgrammes({ actif: true, per_page: 6 })
      .subscribe({
        next: (response) => {
          this.activeProgrammes.set(response.data);
          this.programmesActivitiesLoading.set(false);
        },
        error: () => this.programmesActivitiesLoading.set(false),
      });
  }

  private todayIso(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }

  private toBars(points: ChartPoint[], useColors = false): BarItem[] {
    const values = points.map((p) => Number(p.valeur));
    const max = Math.max(...values, 1);
    return points.map((p, i) => ({
      label: p.label,
      value: Number(p.valeur),
      height: (Number(p.valeur) / max) * 100,
      colorClass: useColors ? `rec-bar--c${i % 4}` : undefined,
    }));
  }
}
