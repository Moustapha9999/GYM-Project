import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SuperAdminHeaderComponent } from '@layout/components/super-admin-header/super-admin-header.component';

@Component({
  selector: 'app-super-admin-layout',
  imports: [RouterOutlet, SuperAdminHeaderComponent],
  template: `
    <div class="sa-layout">
      <app-super-admin-header />
      <main class="sa-layout__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .sa-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-bg);
    }

    .sa-layout__content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem 1.5rem 2rem;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 960px) {
      .sa-layout__content {
        padding: 1rem 1rem 1.5rem;
      }
    }
  `,
})
export class SuperAdminLayoutComponent {}
