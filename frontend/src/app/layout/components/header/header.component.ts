import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { MobileNavService } from '@core/services/mobile-nav.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
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

      <div class="header__info">
        <p class="header__welcome">Bienvenue</p>
        <h2>{{ fullName() }}</h2>
        <span class="header__role">{{ roleLabel() }}</span>
      </div>

      <button type="button" class="btn btn--ghost header__logout" (click)="logout()">Déconnexion</button>
    </header>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 1.25rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .nav-toggle {
      display: none;
      flex-shrink: 0;
    }

    .header__info {
      flex: 1;
      min-width: 0;
    }

    .header__welcome {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    h2 {
      margin: 0.15rem 0 0;
      font-size: 1.25rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header__role {
      display: inline-block;
      margin-top: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .header__logout {
      flex-shrink: 0;
    }

    @media (max-width: 960px) {
      .nav-toggle {
        display: inline-flex;
      }

      .header {
        padding: 0.85rem 1rem;
      }

      .header__welcome,
      .header__role {
        display: none;
      }

      h2 {
        font-size: 1.05rem;
      }
    }

    @media (max-width: 480px) {
      .header__logout {
        padding: 0.55rem 0.75rem;
        font-size: 0.8rem;
      }
    }
  `,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  readonly mobileNav = inject(MobileNavService);

  readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Utilisateur';
  });

  readonly roleLabel = computed(() => this.auth.currentUser()?.role.libelle ?? '');

  logout(): void {
    this.auth.logout();
  }
}
