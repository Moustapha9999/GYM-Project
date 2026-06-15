import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { SUPER_ADMIN_NAV } from '@layout/config/super-admin-nav.config';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { NotificationBellComponent } from '@shared/components/notification-bell/notification-bell.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-super-admin-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, AppIconComponent, NotificationBellComponent],
  template: `
    <header class="sa-header">
      <div class="sa-header__left">
        <a routerLink="/dashboard" class="sa-header__brand">
          @if (logoUrl()) {
            <img [src]="logoUrl()!" alt="" class="sa-header__logo-img" />
          } @else {
            <span class="sa-header__logo"><app-icon name="gym" [size]="26" /></span>
          }
          <strong>{{ gymName() }}</strong>
        </a>
      </div>

      <nav class="sa-header__nav">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="sa-header__nav-link"
          >
            {{ item.labelKey | translate }}
          </a>
        }
      </nav>

      <div class="sa-header__right">
        <app-notification-bell />

        <div class="sa-header__user">
          <div class="sa-header__avatar">{{ avatarLetter() }}</div>
          <div>
            <strong>{{ fullName() }}</strong>
            <span>{{ 'roles.superAdmin' | translate }}</span>
          </div>
        </div>

        <button type="button" class="sa-header__logout" (click)="logout()">{{ 'common.logout' | translate }}</button>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }

    .sa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 0.85rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-light);
      flex-shrink: 0;
    }

    .sa-header__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .sa-header__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--color-text);
      font-size: 1.05rem;
    }

    .sa-header__logo {
      display: flex;
      align-items: center;
      color: var(--color-primary);
    }

    .sa-header__logo-img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
    }

    .sa-header__nav {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem;
      background: var(--color-bg-alt);
      border-radius: 999px;
      flex-shrink: 0;
    }

    .sa-header__nav-link {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sa-header__nav-link:hover {
      color: var(--color-text);
    }

    .sa-header__nav-link.is-active {
      background: var(--color-primary-soft);
      color: var(--color-text);
      font-weight: 600;
    }

    .sa-header__right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .sa-header__icon-btn {
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

    .sa-header__icon-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .sa-header__user {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .sa-header__avatar {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary-end), var(--color-primary));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .sa-header__user strong {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .sa-header__user span {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .sa-header__logout {
      border: 1px solid var(--color-border-light);
      background: var(--color-surface);
      color: var(--color-text-muted);
      padding: 0.45rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .sa-header__logout:hover {
      background: var(--color-bg-alt);
    }

    @media (max-width: 1100px) {
      .sa-header__nav {
        display: none;
      }
    }
  `,
})
export class SuperAdminHeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly navItems = SUPER_ADMIN_NAV;

  readonly gymName = computed(() => this.theme.settings()?.nom_salle ?? 'GYM SYLLA');
  readonly logoUrl = computed(() => this.theme.settings()?.logo_url ?? null);

  readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Admin';
  });

  readonly avatarLetter = computed(() => {
    const user = this.auth.currentUser();
    return user?.prenom?.charAt(0)?.toUpperCase() ?? 'A';
  });

  logout(): void {
    this.auth.logout();
  }
}
