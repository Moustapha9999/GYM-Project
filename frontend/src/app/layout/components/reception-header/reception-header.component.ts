import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { MobileNavService } from '@core/services/mobile-nav.service';

@Component({
  selector: 'app-reception-header',
  imports: [],
  template: `
    <header class="rec-header">
      <button
        type="button"
        class="nav-toggle"
        (click)="mobileNav.toggle()"
        [attr.aria-expanded]="mobileNav.open()"
        aria-label="Ouvrir le menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="rec-header__actions">
        <div class="rec-header__user">
          <div class="rec-header__avatar">{{ avatarLetter() }}</div>
          <div class="rec-header__user-text">
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
      padding: 0.85rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-light);
      flex-shrink: 0;
    }

    .nav-toggle {
      display: none;
    }

    .rec-header__actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: auto;
    }

    .rec-header__user {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
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
      flex-shrink: 0;
    }

    .rec-header__user-text {
      min-width: 0;
    }

    .rec-header__user strong {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rec-header__user span {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 960px) {
      .nav-toggle {
        display: inline-flex;
      }

      .rec-header {
        padding: 0.75rem 1rem;
      }

      .rec-header__user-text span {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .rec-header__user-text {
        display: none;
      }
    }
  `,
})
export class ReceptionHeaderComponent {
  private readonly auth = inject(AuthService);
  readonly mobileNav = inject(MobileNavService);

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
