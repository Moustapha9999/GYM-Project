import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="spinner" [class.spinner--overlay]="overlay()">
      <div class="spinner__ring" aria-hidden="true"></div>
      @if (label()) {
        <p>{{ label() }}</p>
      }
    </div>
  `,
  styles: `
    .spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--color-text-muted);
    }

    .spinner--overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      z-index: 1000;
    }

    .spinner__ring {
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class LoadingSpinnerComponent {
  readonly label = input('Chargement...');
  readonly overlay = input(false);
}
