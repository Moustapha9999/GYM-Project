import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PaginationMeta } from '@core/models/api-response.model';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { PhotoCropModalComponent } from '@shared/components/photo-crop-modal/photo-crop-modal.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { CarteMembre } from '@features/cartes-membres/models/carte-membre.model';
import { CartesMembresService } from '@features/cartes-membres/services/cartes-membres.service';
import { ClientsService } from '@features/clients/services/clients.service';

@Component({
  selector: 'app-cartes-membres-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, PhotoCropModalComponent, DatePipe, TranslatePipe],
  templateUrl: './cartes-membres-list-page.component.html',
  styleUrl: './cartes-membres-list-page.component.scss',
})
export class CartesMembresListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartesService = inject(CartesMembresService);
  private readonly clientsService = inject(ClientsService);

  readonly loading = signal(true);
  readonly cartes = signal<CarteMembre[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly actifsCount = signal(0);
  readonly expiresCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly selectedCarte = signal<CarteMembre | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly uploadingPhoto = signal(false);
  readonly cropImageSrc = signal<string | null>(null);
  readonly pendingPhotoCarte = signal<CarteMembre | null>(null);
  readonly downloadingPdf = signal(false);
  readonly sendingWhatsapp = signal(false);

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

  onPhotoSelected(event: Event): void {
    const carte = this.selectedCarte();
    if (!carte) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.actionError.set('Veuillez sélectionner une image (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.actionError.set('La photo ne doit pas dépasser 5 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.pendingPhotoCarte.set(carte);
      this.cropImageSrc.set(reader.result as string);
      this.actionError.set(null);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  onPhotoCropped(base64: string): void {
    const carte = this.pendingPhotoCarte();
    this.cropImageSrc.set(null);
    this.pendingPhotoCarte.set(null);
    if (!carte) return;

    this.uploadingPhoto.set(true);
    this.actionError.set(null);

    this.clientsService.uploadPhoto(carte.client_id, base64).subscribe({
      next: (client) => {
        this.uploadingPhoto.set(false);
        this.actionSuccess.set('Photo mise à jour.');
        const updated = { ...carte, client_photo_url: client.photo_url };
        this.selectedCarte.set(updated);
        this.cartes.update((list) =>
          list.map((c) => (c.id === carte.id ? { ...c, client_photo_url: client.photo_url } : c)),
        );
      },
      error: () => {
        this.uploadingPhoto.set(false);
        this.actionError.set('Impossible de mettre à jour la photo.');
      },
    });
  }

  cancelPhotoCrop(): void {
    this.cropImageSrc.set(null);
    this.pendingPhotoCarte.set(null);
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
      this.actionError.set('Aucun numéro WhatsApp ou téléphone renseigné.');
      return;
    }

    if (!confirm(`Envoyer la carte PDF à ${numero} via WhatsApp ?`)) return;

    this.sendingWhatsapp.set(true);
    this.actionError.set(null);

    this.cartesService.envoyerWhatsapp(carte.id).subscribe({
      next: () => {
        this.sendingWhatsapp.set(false);
        this.actionSuccess.set(`Carte envoyée à ${numero} via WhatsApp.`);
      },
      error: (err) => {
        this.sendingWhatsapp.set(false);
        const detail = err.error?.detail;
        this.actionError.set(
          typeof detail === 'string'
            ? detail
            : 'Échec de l\'envoi WhatsApp. Vérifiez que le service est connecté.',
        );
      },
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
