import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { MobileNavService } from '@core/services/mobile-nav.service';
import { HeaderComponent } from '@layout/components/header/header.component';
import { ReceptionLayoutComponent } from '@layout/components/reception-layout/reception-layout.component';
import { SidebarComponent } from '@layout/components/sidebar/sidebar.component';
import { SuperAdminLayoutComponent } from '@layout/components/super-admin-layout/super-admin-layout.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    SuperAdminLayoutComponent,
    ReceptionLayoutComponent,
  ],
  template: `
    @if (isSuperAdmin()) {
      <app-super-admin-layout />
    } @else if (isReceptionist() || isManager()) {
      <app-reception-layout />
    } @else {
      <div class="layout">
        @if (mobileNav.open()) {
          <button
            type="button"
            class="layout-backdrop"
            (click)="mobileNav.close()"
            aria-label="Fermer le menu"
          ></button>
        }

        <app-sidebar />
        <div class="layout__main">
          <app-header />
          <main class="layout__content">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .layout {
      display: flex;
      height: 100%;
      background: var(--color-bg);
    }

    .layout__main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .layout__content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.5rem;
    }

    @media (max-width: 960px) {
      .layout__content {
        padding: 1rem 1rem 1.5rem;
      }
    }
  `,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly mobileNav = inject(MobileNavService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'super_admin');
  readonly isReceptionist = computed(() => this.auth.roleName() === 'receptionniste');
  readonly isManager = computed(() => this.auth.roleName() === 'manager');
}
