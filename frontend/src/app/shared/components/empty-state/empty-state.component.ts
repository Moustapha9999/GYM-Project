import { Component, input } from '@angular/core';

import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';

@Component({
  selector: 'app-empty-state',
  imports: [AppIconComponent],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <app-icon [name]="icon()" [size]="40" />
      </div>
      <h2>{{ title() }}</h2>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 1.5rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .empty-state__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      margin-bottom: 0.75rem;
      border-radius: 50%;
      background: var(--color-bg-alt);
      color: var(--color-text-muted);
    }

    h2 {
      margin: 0;
      font-size: 1.125rem;
      color: var(--color-text);
    }

    p {
      margin: 0.5rem 0 0;
      max-width: 28rem;
      color: var(--color-text-muted);
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<AppIconName>('clipboard');
  readonly title = input.required<string>();
  readonly description = input<string>();
}
