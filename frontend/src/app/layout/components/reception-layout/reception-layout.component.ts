import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ReceptionHeaderComponent } from '@layout/components/reception-header/reception-header.component';
import { ReceptionSidebarComponent } from '@layout/components/reception-sidebar/reception-sidebar.component';

@Component({
  selector: 'app-reception-layout',
  imports: [RouterOutlet, ReceptionSidebarComponent, ReceptionHeaderComponent],
  template: `
    <div class="rec-layout">
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
  `,
})
export class ReceptionLayoutComponent {}
