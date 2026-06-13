import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { SUPER_ADMIN_NAV } from '@layout/config/super-admin-nav.config';

@Component({
  selector: 'app-super-admin-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sa-header">
      <div class="sa-header__left">
        <button type="button" class="sa-header__menu" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <a routerLink="/dashboard" class="sa-header__brand">
          <span class="sa-header__logo">🏋️</span>
          <strong>GYM SYLLA</strong>
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
            {{ item.label }}
          </a>
        }
      </nav>

      <div class="sa-header__right">
        <button type="button" class="sa-header__icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <div class="sa-header__user">
          <div class="sa-header__avatar">{{ avatarLetter() }}</div>
          <div>
            <strong>{{ fullName() }}</strong>
            <span>Super Admin</span>
          </div>
        </div>

        <button type="button" class="sa-header__logout" (click)="logout()">Déconnexion</button>
      </div>
    </header>
  `,
  styles: `
    .sa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #eef0f3;
    }

    .sa-header__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .sa-header__menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0.4rem;
      border: none;
      background: transparent;
      cursor: pointer;
    }

    .sa-header__menu span {
      display: block;
      width: 18px;
      height: 2px;
      background: #334155;
      border-radius: 2px;
    }

    .sa-header__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: #0f172a;
      font-size: 1.05rem;
    }

    .sa-header__logo {
      font-size: 1.35rem;
    }

    .sa-header__nav {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem;
      background: #f4f6f8;
      border-radius: 999px;
      flex-shrink: 0;
    }

    .sa-header__nav-link {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sa-header__nav-link:hover {
      color: #0f172a;
    }

    .sa-header__nav-link.is-active {
      background: #e8f7ef;
      color: #0f172a;
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
      border: 1px solid #eef0f3;
      border-radius: 50%;
      background: #fff;
      color: #64748b;
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
      background: linear-gradient(135deg, #fb923c, #ea580c);
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
      color: #0f172a;
    }

    .sa-header__user span {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .sa-header__logout {
      border: 1px solid #eef0f3;
      background: #fff;
      color: #64748b;
      padding: 0.45rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .sa-header__logout:hover {
      background: #f8fafc;
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

  readonly navItems = SUPER_ADMIN_NAV;

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
