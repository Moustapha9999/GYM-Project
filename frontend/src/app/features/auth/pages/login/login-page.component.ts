import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="login-page">
      <section class="login-card">
        <div class="login-card__brand">
          <span aria-hidden="true">🏋️</span>
          <h1>TOTAL FITNESS</h1>
          <p>Connexion à l'espace de gestion</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" formControlName="email" placeholder="reception@gymsylla.mr" />
          </label>

          <label>
            Mot de passe
            <input type="password" formControlName="password" placeholder="••••••••" />
          </label>

          @if (errorMessage()) {
            <p class="login-card__error">{{ errorMessage() }}</p>
          }

          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || loading()">
            Se connecter
          </button>
        </form>

        @if (loading()) {
          <app-loading-spinner label="Connexion en cours..." />
        }
      </section>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top right, rgba(234, 88, 12, 0.15), transparent 35%),
        var(--color-bg);
    }

    .login-card {
      width: min(100%, 26rem);
      padding: 2rem;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-md);
    }

    .login-card__brand {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .login-card__brand span {
      font-size: 2.5rem;
    }

    h1 {
      margin: 0.5rem 0 0;
      font-size: 1.5rem;
    }

    .login-card__brand p {
      margin: 0.35rem 0 0;
      color: var(--color-text-muted);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
    }

    input {
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font: inherit;
      background: #fff;
    }

    .login-card__error {
      margin: 0;
      color: var(--color-danger);
      font-size: 0.875rem;
    }
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: [
      environment.production ? '' : (environment.devLogin?.email ?? ''),
      [Validators.required, Validators.email],
    ],
    password: [
      environment.production ? '' : (environment.devLogin?.password ?? ''),
      [Validators.required],
    ],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate([APP_ROUTES.dashboard]);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Identifiants invalides ou serveur indisponible.');
      },
    });
  }
}
