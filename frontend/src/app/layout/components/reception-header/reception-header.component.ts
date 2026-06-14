import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-reception-header',
  template: `
    <header class="rec-header">
      <div class="rec-header__search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input type="search" placeholder="Rechercher un client..." />
      </div>

      <div class="rec-header__actions">
        <button type="button" class="rec-header__icon" aria-label="Messages">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16v12H5.17L4 17.17V4z" />
          </svg>
        </button>
        <button type="button" class="rec-header__icon" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span class="rec-header__dot"></span>
        </button>

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
    .rec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #eef0f3;
    }

    .rec-header__search {
      flex: 1;
      max-width: 420px;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1rem;
      border: 1px solid #eef0f3;
      border-radius: 999px;
      background: #f8fafc;
    }

    .rec-header__search svg {
      width: 1rem;
      height: 1rem;
      color: #94a3b8;
      flex-shrink: 0;
    }

    .rec-header__search input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.875rem;
      color: #334155;
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
      border: 1px solid #eef0f3;
      border-radius: 50%;
      background: #fff;
      color: #64748b;
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
      border: 2px solid #fff;
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
      color: #0f172a;
    }

    .rec-header__user span {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
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
