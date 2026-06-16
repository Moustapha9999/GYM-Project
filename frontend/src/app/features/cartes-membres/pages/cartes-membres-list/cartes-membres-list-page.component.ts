import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PaginationMeta } from '@core/models/api-response.model';
import { ThemeService } from '@core/services/theme.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslationService } from '@core/services/translation.service';
import { CarteMembre } from '@features/cartes-membres/models/carte-membre.model';
import { CartesMembresService } from '@features/cartes-membres/services/cartes-membres.service';

@Component({
  selector: 'app-cartes-membres-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, AppIconComponent, DatePipe, TranslatePipe],
  templateUrl: './cartes-membres-list-page.component.html',
  styleUrl: './cartes-membres-list-page.component.scss',
})
export class CartesMembresListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartesService = inject(CartesMembresService);
  private readonly theme = inject(ThemeService);
  private readonly dialog = inject(DialogService);
  private readonly translation = inject(TranslationService);

  readonly loading = signal(true);
  readonly cartes = signal<CarteMembre[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly actifsCount = signal(0);
  readonly expiresCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly selectedCarte = signal<CarteMembre | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly downloadingPdf = signal(false);
  readonly sendingWhatsapp = signal(false);

  readonly gymName = computed(() => this.theme.settings()?.nom_salle ?? 'TOTAL FITNESS');
  readonly logoUrl = computed(() => this.theme.settings()?.logo_url ?? null);

  readonly perPage = 15;

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    statut: ['Actif'],
  });

  readonly statutFilterOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Expiré', label: 'Expiré' },
    { value: 'Révoqué', label: 'Révoqué' },
  ];

  ngOnInit(): void {
    this.loadStats();
    this.loadCartes(1);
  }

  applyFilters(): void {
    this.loadCartes(1);
  }

  resetFilters(): void {
    this.filters.reset({ search: '', statut: 'Actif' });
    this.loadCartes(1);
  }

  goToPage(page: number): void {
    const pagination = this.meta();
    if (!pagination || page < 1 || page > pagination.last_page) return;
    this.loadCartes(page);
  }

  selectCarte(carte: CarteMembre): void {
    this.selectedCarte.set(carte);
    this.actionSuccess.set(null);
    this.actionError.set(null);
  }

  closeDetail(): void {
    this.selectedCarte.set(null);
    this.actionSuccess.set(null);
    this.actionError.set(null);
  }

  downloadPdf(): void {
    const carte = this.selectedCarte();
    if (!carte) return;

    this.downloadingPdf.set(true);
    this.actionError.set(null);

    this.cartesService
      .downloadPdf(carte.id, `carte_${carte.client_numero}.pdf`)
      .subscribe({
        next: () => {
          this.downloadingPdf.set(false);
          this.actionSuccess.set('PDF téléchargé.');
        },
        error: () => {
          this.downloadingPdf.set(false);
          this.actionError.set('Impossible de générer le PDF.');
        },
      });
  }

  sendWhatsapp(): void {
    const carte = this.selectedCarte();
    if (!carte) return;

    const numero = carte.client_whatsapp || carte.client_telephone;
    if (!numero) {
      this.actionError.set(this.translation.translate('whatsapp.noPhone'));
      return;
    }

    const clientName = this.clientFullName(carte);
    const typeLabel = this.translation.translate('whatsapp.types.carte_prete');

    this.dialog
      .confirm({
        title: this.translation.translate('whatsapp.promptTitle'),
        message: this.translation.translate('whatsapp.cartePrompt', {
          name: clientName,
          type: typeLabel,
        }),
        confirmLabel: this.translation.translate('whatsapp.sendCard'),
        cancelLabel: this.translation.translate('common.cancel'),
        variant: 'info',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.sendingWhatsapp.set(true);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.cartesService.envoyerWhatsapp(carte.id).subscribe({
          next: (result) => {
            this.sendingWhatsapp.set(false);

            if (result.statut === 'Manuel' && result.lien_whatsapp) {
              this.cartesService
                .downloadPdf(carte.id, `carte_${carte.client_numero}.pdf`)
                .subscribe({
                  next: () => {
                    window.open(result.lien_whatsapp!, '_blank', 'noopener,noreferrer');
                    this.actionSuccess.set(
                      this.translation.translate('whatsapp.carteManualSuccess'),
                    );
                  },
                  error: () => {
                    window.open(result.lien_whatsapp!, '_blank', 'noopener,noreferrer');
                    this.actionError.set(
                      this.translation.translate('whatsapp.cartePdfError'),
                    );
                  },
                });
              return;
            }

            this.actionSuccess.set(
              this.translation.translate('whatsapp.carteAutoSuccess', { numero: result.numero }),
            );
          },
          error: (err) => {
            this.sendingWhatsapp.set(false);
            const detail = err.error?.detail;
            this.actionError.set(
              typeof detail === 'string'
                ? detail
                : this.translation.translate('whatsapp.carteSendError'),
            );
          },
        });
      });
  }

  clientFullName(carte: CarteMembre): string {
    return `${carte.client_prenom} ${carte.client_nom}`;
  }

  typeAbonnementLines(type: string | null): string[] {
    if (!type) return ['—'];
    const parts = type.trim().split(/\s+/, 2);
    return parts.length === 2 ? [parts[0], parts[1]] : [type];
  }

  statutClass(statut: string): string {
    switch (statut) {
      case 'Actif':
        return 'cm-badge--active';
      case 'Expiré':
        return 'cm-badge--expired';
      default:
        return 'cm-badge--revoked';
    }
  }

  private loadStats(): void {
    this.cartesService.count('Actif').subscribe({ next: (n) => this.actifsCount.set(n) });
    this.cartesService.count('Expiré').subscribe({ next: (n) => this.expiresCount.set(n) });
  }

  private loadCartes(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const statut = this.filters.controls.statut.value || undefined;
    const search = this.filters.controls.search.value || undefined;

    this.cartesService.list({ statut, search, page, per_page: this.perPage }).subscribe({
      next: (response) => {
        this.cartes.set(response.data);
        this.meta.set(response.meta);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les cartes membres.');
        this.loading.set(false);
      },
    });
  }
}
