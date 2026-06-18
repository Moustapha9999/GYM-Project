import { Component, computed, inject, signal } from '@angular/core';
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
        <button
          type="button"
          class="nav-toggle sa-header__menu"
          (click)="navOpen.set(!navOpen())"
          [attr.aria-expanded]="navOpen()"
          aria-label="Ouvrir le menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <a routerLink="/dashboard" class="sa-header__brand" (click)="navOpen.set(false)">
          @if (logoUrl()) {
            <img [src]="logoUrl()!" alt="" class="sa-header__logo-img" />
          } @else {
            <span class="sa-header__logo"><app-icon name="gym" [size]="26" /></span>
          }
          <strong class="sa-header__brand-text">{{ gymName() }}</strong>
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
          <div class="sa-header__user-text">
            <strong>{{ fullName() }}</strong>
            <span>{{ 'roles.superAdmin' | translate }}</span>
          </div>
        </div>

        <button type="button" class="sa-header__logout" (click)="logout()">
          {{ 'common.logout' | translate }}
        </button>
      </div>
    </header>

    @if (navOpen()) {
      <button
        type="button"
        class="layout-backdrop"
        (click)="navOpen.set(false)"
        aria-label="Fermer le menu"
      ></button>
      <nav class="sa-header__drawer">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="sa-header__drawer-link"
            (click)="navOpen.set(false)"
          >
            {{ item.labelKey | translate }}
          </a>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
      position: relative;
      z-index: 100;
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
      overflow: visible;
    }

    .sa-header__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .sa-header__menu {
      display: none;
    }

    .sa-header__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--color-text);
      font-size: 1.05rem;
      min-width: 0;
    }

    .sa-header__logo {
      display: flex;
      align-items: center;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .sa-header__logo-img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
      flex-shrink: 0;
    }

    .sa-header__brand-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      white-space: nowrap;
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
      flex-shrink: 0;
    }

    .sa-header__right app-notification-bell {
      flex-shrink: 0;
    }

    .sa-header__user {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .sa-header__user-text {
      min-width: 0;
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
      flex-shrink: 0;
    }

    .sa-header__user strong {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      white-space: nowrap;
    }

    .sa-header__logout:hover {
      background: var(--color-bg-alt);
    }

    .sa-header__drawer {
      position: fixed;
      top: 3.75rem;
      left: 0;
      right: 0;
      z-index: 250;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-light);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      max-height: calc(100vh - 3.75rem);
      overflow-y: auto;
    }

    .sa-header__drawer-link {
      display: block;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .sa-header__drawer-link:hover {
      background: var(--color-bg-alt);
      color: var(--color-text);
    }

    .sa-header__drawer-link.is-active {
      background: var(--color-primary-soft);
      color: var(--color-text);
      font-weight: 600;
    }

    @media (max-width: 1100px) {
      .sa-header__nav {
        display: none;
      }

      .sa-header__menu {
        display: inline-flex;
      }
    }

    @media (max-width: 720px) {
      .sa-header {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .sa-header__right {
        gap: 0.45rem;
      }

      .sa-header__user-text {
        display: none;
      }

      .sa-header__logout {
        padding: 0.45rem 0.55rem;
        font-size: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .sa-header__brand-text {
        max-width: 8rem;
      }
    }
  `,
})
export class SuperAdminHeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly navItems = SUPER_ADMIN_NAV;
  readonly navOpen = signal(false);

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
    this.navOpen.set(false);
    this.auth.logout();
  }
}
