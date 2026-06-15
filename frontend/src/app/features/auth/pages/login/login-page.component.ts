import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslationService } from '@core/services/translation.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, TranslatePipe, AppIconComponent],
  template: `
    <div class="login-page">
      <section class="login-card">
        <div class="login-card__brand">
          @if (logoUrl()) {
            <img [src]="logoUrl()!" alt="" class="login-card__logo" />
          } @else {
            <span class="login-card__logo-fallback" aria-hidden="true"><app-icon name="gym" [size]="40" /></span>
          }
          <h1>{{ gymName() }}</h1>
          <p>{{ slogan() }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            {{ 'auth.email' | translate }}
            <input type="email" formControlName="email" placeholder="reception@gymsylla.mr" />
          </label>

          <label>
            {{ 'auth.password' | translate }}
            <input type="password" formControlName="password" placeholder="••••••••" />
          </label>

          @if (errorMessage()) {
            <p class="login-card__error">{{ errorMessage() }}</p>
          }

          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || loading()">
            {{ 'auth.login' | translate }}
          </button>
        </form>

        @if (loading()) {
          <app-loading-spinner [label]="'auth.loggingIn' | translate" />
        }
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .login-page {
      min-height: 100%;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 35%),
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

    .login-card__logo-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      color: var(--color-primary);
    }

    .login-card__logo {
      width: 3.5rem;
      height: 3.5rem;
      object-fit: contain;
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
      background: var(--color-surface);
      color: var(--color-text);
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
  private readonly theme = inject(ThemeService);
  private readonly translation = inject(TranslationService);

  readonly gymName = computed(() => this.theme.settings()?.nom_salle ?? 'TOTAL FITNESS');
  readonly slogan = computed(() => this.theme.settings()?.slogan ?? 'Connexion à l\'espace de gestion');
  readonly logoUrl = computed(() => this.theme.settings()?.logo_url ?? null);

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
        this.errorMessage.set(this.translation.translate('auth.loginError'));
      },
    });
  }
}
