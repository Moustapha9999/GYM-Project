import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { NotificationBellComponent } from '@shared/components/notification-bell/notification-bell.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-reception-header',
  imports: [TranslatePipe, NotificationBellComponent],
  template: `
    <header class="rec-header">
      <div class="rec-header__search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input type="search" [placeholder]="'auth.searchClient' | translate" />
      </div>

      <div class="rec-header__actions">
        <button type="button" class="rec-header__icon" [attr.aria-label]="'common.messages' | translate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16v12H5.17L4 17.17V4z" />
          </svg>
        </button>
        <app-notification-bell />

        <div class="rec-header__user">
          <div class="rec-header__avatar">{{ avatarLetter() }}</div>
          <div>
            <strong>{{ fullName() }}</strong>
            <span>{{ email() }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }

    .rec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 1rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-light);
      flex-shrink: 0;
    }

    .rec-header__search {
      flex: 1;
      max-width: 420px;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1rem;
      border: 1px solid var(--color-border-light);
      border-radius: 999px;
      background: var(--color-bg-alt);
    }

    .rec-header__search svg {
      width: 1rem;
      height: 1rem;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .rec-header__search input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .rec-header__actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .rec-header__icon {
      position: relative;
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--color-border-light);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .rec-header__icon svg {
      width: 1.05rem;
      height: 1.05rem;
    }

    .rec-header__dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid var(--color-surface);
    }

    .rec-header__user {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .rec-header__avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #0d5c3b;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .rec-header__user strong {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text);
    }

    .rec-header__user span {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
  `,
})
export class ReceptionHeaderComponent {
  private readonly auth = inject(AuthService);

  readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Réception';
  });

  readonly email = computed(() => this.auth.currentUser()?.email ?? '');

  readonly avatarLetter = computed(() => {
    const user = this.auth.currentUser();
    return user?.prenom?.charAt(0)?.toUpperCase() ?? 'R';
  });
}
