import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <div>
        <p class="header__welcome">Bienvenue</p>
        <h2>{{ fullName() }}</h2>
        <span class="header__role">{{ roleLabel() }}</span>
      </div>

      <button type="button" class="btn btn--ghost" (click)="logout()">Déconnexion</button>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
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
  `,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  readonly fullName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Utilisateur';
  });

  readonly roleLabel = computed(() => this.auth.currentUser()?.role.libelle ?? '');

  logout(): void {
    this.auth.logout();
  }
}
