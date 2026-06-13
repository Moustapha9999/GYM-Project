import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">{{ icon() }}</div>
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
      font-size: 2rem;
      margin-bottom: 0.75rem;
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
  readonly icon = input('📋');
  readonly title = input.required<string>();
  readonly description = input<string>();
}
