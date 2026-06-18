import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MobileNavService } from '@core/services/mobile-nav.service';
import { ReceptionHeaderComponent } from '@layout/components/reception-header/reception-header.component';
import { ReceptionSidebarComponent } from '@layout/components/reception-sidebar/reception-sidebar.component';

@Component({
  selector: 'app-reception-layout',
  imports: [RouterOutlet, ReceptionSidebarComponent, ReceptionHeaderComponent],
  template: `
    <div class="rec-layout">
      @if (mobileNav.open()) {
        <button
          type="button"
          class="layout-backdrop"
          (click)="mobileNav.close()"
          aria-label="Fermer le menu"
        ></button>
      }

      <app-reception-sidebar />
      <div class="rec-layout__main">
        <app-reception-header />
        <main class="rec-layout__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .rec-layout {
      display: flex;
      height: 100%;
      background: var(--color-bg);
      --rec-green: #0d5c3b;
      --color-primary: var(--rec-green);
      --color-primary-end: #147a50;
      --color-primary-soft: color-mix(in srgb, var(--rec-green) 15%, var(--color-surface));
      --color-primary-hover: #0a4a2f;
      --color-warning-bg: color-mix(in srgb, var(--rec-green) 10%, var(--color-surface));
      --color-warning-text: var(--rec-green);
      --color-warning-border: color-mix(in srgb, var(--rec-green) 28%, var(--color-border));
      --kpi-icon-bg-1: color-mix(in srgb, var(--rec-green) 12%, var(--color-surface));
    }

    .rec-layout__main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .rec-layout__content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem 1.5rem 2rem;
    }

    @media (max-width: 960px) {
      .rec-layout__content {
        padding: 1rem 1rem 1.5rem;
      }
    }
  `,
})
export class ReceptionLayoutComponent {
  readonly mobileNav = inject(MobileNavService);
}
