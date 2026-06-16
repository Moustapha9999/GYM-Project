import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-reception-header',
  imports: [],
  template: `
    <header class="rec-header">
      <div class="rec-header__actions">
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
      justify-content: flex-end;
      gap: 1rem;
      width: 100%;
      padding: 1rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-light);
      flex-shrink: 0;
    }

    .rec-header__actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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
