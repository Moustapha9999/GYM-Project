import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { MobileNavService } from '@core/services/mobile-nav.service';
import { MAIN_NAV_ITEMS } from '@layout/config/navigation.config';
import { NavItem } from '@layout/models/nav-item.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, AppIconComponent],
  template: `
    <aside class="sidebar" [class.is-open]="mobileNav.open()">
      <div class="sidebar__brand">
        <span class="sidebar__logo"><app-icon name="gym" [size]="28" /></span>
        <div>
          <strong>GYM SYLLA</strong>
          <small>Total Fitness</small>
        </div>
      </div>

      <nav class="sidebar__nav">
        @for (item of visibleItems(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="sidebar__link"
            (click)="mobileNav.close()"
          >
            <span aria-hidden="true"><app-icon [name]="item.icon" [size]="18" /></span>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </aside>
  `,
  styles: `
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      background: var(--color-sidebar);
      color: var(--color-sidebar-text);
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1rem;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 1.5rem;
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .sidebar__brand strong {
      display: block;
      font-size: 0.95rem;
      letter-spacing: 0.04em;
    }

    .sidebar__brand small {
      color: rgba(255, 255, 255, 0.65);
      font-size: 0.75rem;
    }

    .sidebar__nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border-radius: var(--radius-md);
      color: rgba(255, 255, 255, 0.82);
      text-decoration: none;
      font-size: 0.925rem;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar__link:hover,
    .sidebar__link.is-active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    @media (max-width: 960px) {
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 300;
        width: min(85vw, var(--sidebar-width));
        min-height: 100%;
        transform: translateX(-100%);
        transition: transform 0.22s ease;
      }

      .sidebar.is-open {
        transform: translateX(0);
        box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
      }
    }
  `,
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  readonly mobileNav = inject(MobileNavService);

  readonly visibleItems = computed(() =>
    MAIN_NAV_ITEMS.filter((item) => this.canSeeItem(item)),
  );

  private canSeeItem(item: NavItem): boolean {
    if (!item.permissions?.length) {
      return true;
    }

    return this.auth.hasAnyPermission(item.permissions);
  }
}
