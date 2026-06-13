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
    .sa-layout {
      min-height: 100vh;
      background: #f6f7f9;
    }

    .sa-layout__content {
      padding: 1.25rem 1.5rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
  `,
})
export class SuperAdminLayoutComponent {}
