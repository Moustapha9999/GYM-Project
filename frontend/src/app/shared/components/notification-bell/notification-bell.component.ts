import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';

import { AlerteItem, AlerteType } from '@core/models/alerte.model';
import { AlertesService } from '@core/services/alertes.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, TranslatePipe, AppIconComponent],
  template: `
    <div class="notif-bell">
      <button
        type="button"
        class="notif-bell__btn"
        [class.notif-bell__btn--active]="open()"
        [attr.aria-label]="'common.notifications' | translate"
        [attr.aria-expanded]="open()"
        (click)="togglePanel()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        @if (unreadCount() > 0) {
          <span class="notif-bell__badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
        }
      </button>

      @if (open()) {
        <button
          type="button"
          class="notif-panel__backdrop"
          (click)="open.set(false)"
          aria-label="Fermer les notifications"
        ></button>

        <section class="notif-panel" role="dialog" [attr.aria-label]="'notifications.panelTitle' | translate">
          <header class="notif-panel__head">
            <div>
              <h2>{{ 'notifications.panelTitle' | translate }}</h2>
              <p>{{ 'notifications.panelSubtitle' | translate }}</p>
            </div>
            @if (visibleAlerts().length) {
              <button type="button" class="notif-panel__mark-all" (click)="markAllRead()">
                {{ 'notifications.markAllRead' | translate }}
              </button>
            }
          </header>

          @if (loading()) {
            <p class="notif-panel__status">{{ 'notifications.loading' | translate }}</p>
          } @else if (error()) {
            <p class="notif-panel__status notif-panel__status--error">{{ error() }}</p>
          } @else if (!visibleAlerts().length) {
            <p class="notif-panel__status">{{ 'notifications.empty' | translate }}</p>
          } @else {
            <ul class="notif-list">
              @for (alert of visibleAlerts(); track alert.id) {
                <li>
                  <button
                    type="button"
                    class="notif-item"
                    [class.is-danger]="alert.severity === 'danger'"
                    [class.is-warning]="alert.severity === 'warning'"
                    (click)="openAlert(alert)"
                  >
                    <span class="notif-item__icon" aria-hidden="true">
                      <app-icon [name]="iconForType(alert.type)" [size]="16" />
                    </span>
                    <span class="notif-item__body">
                      <strong>{{ alert.titre }}</strong>
                      <span>{{ alert.message }}</span>
                      <small>{{ alert.created_at | date: 'dd/MM/yyyy HH:mm' }}</small>
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .notif-bell {
      position: relative;
      flex-shrink: 0;
    }

    .notif-bell__btn {
      position: relative;
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid var(--color-border-light);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .notif-bell__btn--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    .notif-bell__btn svg {
      width: 1rem;
      height: 1rem;
    }

    .notif-bell__badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 1.1rem;
      height: 1.1rem;
      padding: 0 0.25rem;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 0.62rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-surface);
    }

    .notif-panel {
      position: absolute;
      top: calc(100% + 0.55rem);
      right: 0;
      width: min(22rem, calc(100vw - 2rem));
      max-height: 26rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: 14px;
      box-shadow: var(--shadow-md);
      z-index: 120;
    }

    .notif-panel__backdrop {
      display: none;
    }

    .notif-panel__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .notif-panel__head h2 {
      margin: 0;
      font-size: 0.92rem;
      color: var(--color-text);
    }

    .notif-panel__head p {
      margin: 0.2rem 0 0;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .notif-panel__mark-all {
      border: none;
      background: none;
      color: var(--color-primary);
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .notif-panel__status {
      margin: 0;
      padding: 1.25rem 1rem;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      text-align: center;
    }

    .notif-panel__status--error {
      color: var(--color-danger-text);
    }

    .notif-list {
      list-style: none;
      margin: 0;
      padding: 0.35rem 0;
      overflow-y: auto;
    }

    .notif-item {
      width: 100%;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    .notif-item:hover {
      background: var(--color-bg-alt);
    }

    .notif-item.is-warning {
      border-left: 3px solid #f59e0b;
    }

    .notif-item.is-danger {
      border-left: 3px solid #ef4444;
    }

    .notif-item__icon {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      background: var(--color-bg-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
    }

    .notif-item__body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .notif-item__body strong {
      font-size: 0.82rem;
      color: var(--color-text);
    }

    .notif-item__body span {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      line-height: 1.35;
    }

    .notif-item__body small {
      font-size: 0.68rem;
      color: var(--color-disabled-text);
    }

    @media (max-width: 720px) {
      .notif-panel__backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 450;
        border: none;
        padding: 0;
        background: rgba(15, 23, 42, 0.4);
        cursor: pointer;
      }

      .notif-panel {
        position: fixed;
        top: auto;
        right: 0;
        left: 0;
        bottom: 0;
        width: 100%;
        max-width: none;
        max-height: min(78vh, 32rem);
        border-radius: 1rem 1rem 0 0;
        border-bottom: none;
        z-index: 460;
        box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.18);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      .notif-panel__head {
        flex-direction: column;
        align-items: stretch;
        gap: 0.65rem;
        padding: 1rem 1rem 0.85rem;
      }

      .notif-panel__head h2 {
        font-size: 1rem;
      }

      .notif-panel__head p {
        font-size: 0.8rem;
      }

      .notif-panel__mark-all {
        align-self: flex-start;
        padding: 0.35rem 0;
        font-size: 0.8rem;
      }

      .notif-list {
        flex: 1;
        min-height: 0;
        max-height: none;
      }

      .notif-item {
        padding: 0.85rem 1rem;
      }

      .notif-item__body strong {
        font-size: 0.88rem;
      }

      .notif-item__body span {
        font-size: 0.82rem;
      }
    }
  `,
})
export class NotificationBellComponent implements OnInit {
  private readonly alertesService = inject(AlertesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly compact = input(false);

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly alerts = signal<AlerteItem[]>([]);
  readonly dismissedVersion = signal(0);

  readonly visibleAlerts = computed(() => {
    this.dismissedVersion();
    const dismissed = this.alertesService.getDismissedIds();
    return this.alerts().filter((alert) => !dismissed.has(alert.id));
  });

  readonly unreadCount = computed(() => this.visibleAlerts().length);

  ngOnInit(): void {
    interval(60_000)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.loading.set(this.alerts().length === 0);
          this.error.set(null);
          return this.alertesService.list();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.alerts.set(data.items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Impossible de charger les notifications.');
        },
      });
  }

  togglePanel(): void {
    this.open.update((value) => !value);
  }

  openAlert(alert: AlerteItem): void {
    this.alertesService.dismiss(alert.id);
    this.dismissedVersion.update((v) => v + 1);
    this.open.set(false);
    if (alert.route) {
      void this.router.navigateByUrl(alert.route);
    }
  }

  markAllRead(): void {
    this.alertesService.dismissAll(this.visibleAlerts().map((alert) => alert.id));
    this.dismissedVersion.update((v) => v + 1);
  }

  iconForType(type: AlerteType): AppIconName {
    switch (type) {
      case 'abonnement_expiration':
        return 'clock';
      case 'abonnement_expire':
        return 'alert-triangle';
      case 'nouveau_client':
        return 'users';
      case 'nouvel_abonnement':
        return 'ticket';
      case 'nouveau_paiement':
        return 'credit-card';
      default:
        return 'clipboard';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
