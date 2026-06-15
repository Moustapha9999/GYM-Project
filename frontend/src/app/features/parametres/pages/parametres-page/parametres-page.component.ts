import { UpperCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { APP_LANGUAGES, AppLanguage } from '@core/models/language.model';
import { AppSettings, THEME_PRESETS } from '@core/models/app-settings.model';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { ParametresService } from '@features/parametres/services/parametres.service';

@Component({
  selector: 'app-parametres-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, TranslatePipe, UpperCasePipe, AppIconComponent],
  templateUrl: './parametres-page.component.html',
  styleUrl: './parametres-page.component.scss',
})
export class ParametresPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly parametresService = inject(ParametresService);
  private readonly themeService = inject(ThemeService);
  private readonly translation = inject(TranslationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly logoPreview = signal<string | null>(null);
  readonly themePresets = THEME_PRESETS;
  readonly languages = APP_LANGUAGES;

  readonly languageOptions: { code: AppLanguage }[] = [
    { code: 'fr' },
    { code: 'en' },
    { code: 'ar' },
  ];

  readonly form = this.fb.nonNullable.group({
    nom_salle: [''],
    slogan: [''],
    theme_couleur: ['#ea580c'],
    theme_mode: ['light' as 'light' | 'dark'],
    langue: ['fr' as AppLanguage],
  });

  ngOnInit(): void {
    this.parametresService.getSettings().subscribe({
      next: (settings) => this.patchForm(settings),
      error: () => {
        this.error.set(this.translation.translate('parametres.loadError'));
        this.loading.set(false);
      },
    });
  }

  selectPreset(couleur: string): void {
    this.form.controls.theme_couleur.setValue(couleur);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.set(this.translation.translate('parametres.logoImageError'));
      return;
    }

    if (file.size > 1024 * 1024) {
      this.error.set(this.translation.translate('parametres.logoSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview.set(reader.result as string);
      this.error.set(null);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeLogo(): void {
    this.logoPreview.set(null);
  }

  previewTheme(): void {
    const raw = this.form.getRawValue();
    this.themeService.apply({
      nom_salle: raw.nom_salle,
      slogan: raw.slogan,
      logo_url: this.logoPreview(),
      theme_couleur: raw.theme_couleur,
      theme_mode: raw.theme_mode,
      langue: raw.langue,
    });
    void this.translation.setLanguage(raw.langue).subscribe();
  }

  submit(): void {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const raw = this.form.getRawValue();
    const payload: Record<string, string | null> = {
      nom_salle: raw.nom_salle.trim(),
      slogan: raw.slogan.trim(),
      theme_couleur: raw.theme_couleur,
      theme_mode: raw.theme_mode,
      langue: raw.langue,
      logo_url: this.logoPreview() ?? '',
    };

    this.parametresService.updateSettings(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(this.translation.translate('parametres.saveSuccess'));
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err.error?.detail;
        this.error.set(typeof detail === 'string' ? detail : this.translation.translate('parametres.saveError'));
      },
    });
  }

  private patchForm(settings: AppSettings): void {
    this.form.patchValue({
      nom_salle: settings.nom_salle,
      slogan: settings.slogan,
      theme_couleur: settings.theme_couleur,
      theme_mode: settings.theme_mode,
      langue: settings.langue ?? 'fr',
    });
    this.logoPreview.set(settings.logo_url);
    this.loading.set(false);
  }
}
