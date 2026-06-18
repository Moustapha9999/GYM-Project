import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly translation = inject(TranslationService);

  readonly currentYear = new Date().getFullYear();

  readonly gymName = computed(() => this.theme.settings()?.nom_salle ?? 'TOTAL FITNESS');
  readonly slogan = computed(
    () => this.theme.settings()?.slogan ?? 'Discipline · Force · Résultats',
  );
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
