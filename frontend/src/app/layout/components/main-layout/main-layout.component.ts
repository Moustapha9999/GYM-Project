import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '@layout/components/header/header.component';
import { SidebarComponent } from '@layout/components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="layout__main">
        <app-header />
        <main class="layout__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg);
    }

    .layout__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .layout__content {
      flex: 1;
      padding: 1.5rem;
    }
  `,
})
export class MainLayoutComponent {}
