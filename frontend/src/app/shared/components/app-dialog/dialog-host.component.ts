import { Component, HostListener, inject } from '@angular/core';

import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';
import { DialogVariant } from '@shared/components/app-dialog/dialog.model';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-dialog-host',
  imports: [AppIconComponent, TranslatePipe],
  template: `
    @if (dialog.active(); as state) {
      <div
        class="app-dialog"
        role="presentation"
        (click)="onBackdropClick($event)"
      >
        <div
          class="app-dialog__panel"
          [class]="'app-dialog__panel--' + state.variant"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="state.title ? 'app-dialog-title' : null"
          [attr.aria-describedby]="'app-dialog-message'"
        >
          <div class="app-dialog__icon" [class]="'app-dialog__icon--' + state.variant">
            <app-icon [name]="iconFor(state)" [size]="26" />
          </div>

          @if (state.title) {
            <h2 id="app-dialog-title" class="app-dialog__title">{{ state.title }}</h2>
          }

          <p id="app-dialog-message" class="app-dialog__message">{{ state.message }}</p>

          <div class="app-dialog__actions">
            @if (state.mode === 'confirm') {
              <button
                type="button"
                class="app-dialog__btn app-dialog__btn--ghost"
                (click)="dialog.close(false)"
              >
                {{ state.cancelLabel ?? ('common.cancel' | translate) }}
              </button>
            }
            <button
              type="button"
              class="app-dialog__btn"
              [class]="confirmBtnClass(state.variant)"
              (click)="dialog.close(true)"
            >
              @if (state.confirmLabel) {
                {{ state.confirmLabel }}
              } @else if (state.mode === 'alert') {
                {{ 'dialog.ok' | translate }}
              } @else if (state.variant === 'danger') {
                {{ 'common.delete' | translate }}
              } @else {
                {{ 'dialog.confirm' | translate }}
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .app-dialog {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.52);
      backdrop-filter: blur(4px);
      animation: app-dialog-fade-in 0.18s ease-out;
    }

    .app-dialog__panel {
      position: relative;
      width: min(100%, 26rem);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      padding: 1.5rem 1.5rem 1.25rem;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
      animation: app-dialog-scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .app-dialog__panel--danger {
      border-top: 3px solid var(--color-danger);
    }

    .app-dialog__panel--warning {
      border-top: 3px solid var(--color-primary);
    }

    .app-dialog__panel--default {
      border-top: 3px solid var(--color-primary);
    }

    .app-dialog__panel--info {
      border-top: 3px solid var(--color-info-text);
    }

    .app-dialog__panel--success {
      border-top: 3px solid var(--color-success-text);
    }

    .app-dialog__icon {
      width: 3rem;
      height: 3rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .app-dialog__icon--default {
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    .app-dialog__icon--danger {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }

    .app-dialog__icon--warning {
      background: var(--color-warning-bg);
      color: var(--color-primary);
    }

    .app-dialog__icon--info {
      background: var(--color-info-bg);
      color: var(--color-info-text);
    }

    .app-dialog__icon--success {
      background: var(--color-success-bg);
      color: var(--color-success-text);
    }

    .app-dialog__title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.35;
      color: var(--color-text);
    }

    .app-dialog__message {
      margin: 0 0 1.35rem;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: var(--color-text-muted);
      white-space: pre-wrap;
    }

    .app-dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.625rem;
      flex-wrap: wrap;
    }

    .app-dialog__btn {
      border: none;
      border-radius: 0.625rem;
      padding: 0.625rem 1.125rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
    }

    .app-dialog__btn:active {
      transform: translateY(1px);
    }

    .app-dialog__btn--ghost {
      background: var(--color-hover);
      color: var(--color-text);
    }

    .app-dialog__btn--ghost:hover {
      background: var(--color-border);
    }

    .app-dialog__btn--primary {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-end));
      color: #fff;
      box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 35%, transparent);
    }

    .app-dialog__btn--primary:hover {
      background: var(--color-primary-hover);
    }

    .app-dialog__btn--danger {
      background: var(--color-danger);
      color: #fff;
      box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
    }

    .app-dialog__btn--danger:hover {
      background: #b91c1c;
    }

    @keyframes app-dialog-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes app-dialog-scale-in {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
})
export class DialogHostComponent {
  readonly dialog = inject(DialogService);

  private readonly defaultIcons: Record<DialogVariant, AppIconName> = {
    default: 'clipboard',
    danger: 'alert-triangle',
    warning: 'alert-triangle',
    info: 'clipboard',
    success: 'check',
  };

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialog.active()) {
      this.dialog.close(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dialog.close(false);
    }
  }

  iconFor(state: { variant: DialogVariant; icon?: AppIconName }): AppIconName {
    return state.icon ?? this.defaultIcons[state.variant];
  }

  confirmBtnClass(variant: DialogVariant): string {
    if (variant === 'danger') return 'app-dialog__btn app-dialog__btn--danger';
    return 'app-dialog__btn app-dialog__btn--primary';
  }
}
