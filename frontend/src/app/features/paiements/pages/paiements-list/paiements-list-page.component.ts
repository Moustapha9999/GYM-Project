import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { Client } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';
import { WhatsappMessageService } from '@core/services/whatsapp-message.service';
import {
  CaisseJour,
  MoyenPaiement,
  PaiementDetail,
  PaiementRead,
} from '@features/paiements/models/paiement.model';
import { PaiementsService } from '@features/paiements/services/paiements.service';

type SidePanelMode = 'create' | 'view';

@Component({
  selector: 'app-paiements-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, MruCurrencyPipe, DatePipe, TranslatePipe],
  templateUrl: './paiements-list-page.component.html',
  styleUrl: './paiements-list-page.component.scss',
})
export class PaiementsListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paiementsService = inject(PaiementsService);
  private readonly clientsService = inject(ClientsService);
  private readonly whatsapp = inject(WhatsappMessageService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly paiements = signal<PaiementDetail[]>([]);
  readonly caisse = signal<CaisseJour | null>(null);
  readonly moyens = signal<MoyenPaiement[]>([]);
  readonly error = signal<string | null>(null);
  readonly createSuccess = signal<string | null>(null);
  readonly createError = signal<string | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly sidePanelMode = signal<SidePanelMode>('create');
  readonly viewingPaiement = signal<PaiementRead | null>(null);
  readonly viewingPaiementSummary = signal<PaiementDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly importing = signal(false);

  readonly filters = this.fb.nonNullable.group({
    date_debut: [''],
    date_fin: [''],
    moyen_paiement_id: [''],
    type_paiement: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    type_paiement: ['Abonnement', [Validators.required]],
    moyen_paiement_id: ['', [Validators.required]],
    client_search: [''],
    nom_client_occasionnel: [''],
    montant: [''],
  });

  readonly totalJournal = computed(() =>
    this.paiements().reduce((sum, p) => sum + Number(p.montant), 0),
  );

  readonly createType = computed(() => this.createForm.controls.type_paiement.value);

  readonly showMontant = computed(() =>
    ['Service supplémentaire', 'Autre'].includes(this.createType()),
  );

  readonly showOccasionnel = computed(
    () => this.createType() === 'Séance journalière' && !this.selectedClient(),
  );

  readonly filterTypeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'Abonnement', label: 'Abonnement' },
    { value: 'Séance journalière', label: 'Séance journalière' },
    { value: 'Service supplémentaire', label: 'Service supplémentaire' },
    { value: 'Autre', label: 'Autre' },
  ];

  readonly createTypeOptions = [
    { value: 'Abonnement', label: 'Abonnement' },
    { value: 'Séance journalière', label: 'Séance journalière' },
    { value: 'Service supplémentaire', label: 'Service supplémentaire' },
    { value: 'Autre', label: 'Autre' },
  ];

  ngOnInit(): void {
    this.paiementsService.listMoyensPaiement().subscribe({
      next: (moyens) => this.moyens.set(moyens),
    });

    this.createForm.controls.client_search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        if (!query || query.length < 2) {
          this.clientResults.set([]);
          return;
        }
        this.clientsService.search(query).subscribe({
          next: (clients) => this.clientResults.set(clients),
        });
      });

    this.createForm.controls.type_paiement.valueChanges.subscribe(() => {
      this.selectedClient.set(null);
      this.createForm.controls.client_search.setValue('');
      this.createForm.controls.nom_client_occasionnel.setValue('');
      this.createForm.controls.montant.setValue('');
      this.clientResults.set([]);
    });

    this.loadData();
  }

  applyFilters(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.filters.reset({
      date_debut: '',
      date_fin: '',
      moyen_paiement_id: '',
      type_paiement: '',
    });
    this.loadData();
  }

  downloadImportTemplate(): void {
    this.paiementsService.downloadImportTemplate().subscribe({
      error: () => {
        this.createError.set('Impossible de télécharger le modèle Excel.');
      },
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.createError.set(null);
    this.createSuccess.set(null);

    // Endpoint backend non disponible pour l'instant sur les paiements.
    setTimeout(() => {
      this.importing.set(false);
      this.createError.set(
        'Import Excel paiements non disponible pour le moment. Utilisez ce fichier comme modèle de saisie.',
      );
    }, 500);

    input.value = '';
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.createForm.controls.client_search.setValue(`${client.prenom} ${client.nom}`);
    this.clientResults.set([]);
  }

  clearClient(): void {
    this.selectedClient.set(null);
    this.createForm.controls.client_search.setValue('');
    this.clientResults.set([]);
  }

  viewPaiement(paiement: PaiementDetail): void {
    this.sidePanelMode.set('view');
    this.viewingPaiementSummary.set(paiement);
    this.viewingPaiement.set(null);
    this.detailError.set(null);
    this.detailLoading.set(true);

    this.paiementsService.getById(paiement.id).subscribe({
      next: (detail) => {
        this.viewingPaiement.set(detail);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailError.set('Impossible de charger les détails du paiement.');
        this.detailLoading.set(false);
      },
    });
  }

  closeView(): void {
    this.sidePanelMode.set('create');
    this.viewingPaiement.set(null);
    this.viewingPaiementSummary.set(null);
    this.detailError.set(null);
  }

  submitCreate(): void {
    this.createSuccess.set(null);
    this.createError.set(null);

    const type = this.createForm.controls.type_paiement.value;
    const moyenId = this.createForm.controls.moyen_paiement_id.value;

    if (!moyenId) {
      this.createError.set('Sélectionnez un moyen de paiement.');
      return;
    }

    if (type === 'Abonnement' && !this.selectedClient()) {
      this.createError.set('Sélectionnez un client pour l\'abonnement.');
      return;
    }

    if (type === 'Séance journalière') {
      const nom = this.createForm.controls.nom_client_occasionnel.value.trim();
      if (!this.selectedClient() && !nom) {
        this.createError.set('Client enregistré ou nom occasionnel requis.');
        return;
      }
    }

    if (this.showMontant()) {
      const montant = Number(this.createForm.controls.montant.value);
      if (!montant || montant <= 0) {
        this.createError.set('Indiquez un montant positif.');
        return;
      }
    }

    const payload = {
      type_paiement: type,
      moyen_paiement_id: moyenId,
      client_id: this.selectedClient()?.id,
      nom_client_occasionnel:
        type === 'Séance journalière' && !this.selectedClient()
          ? this.createForm.controls.nom_client_occasionnel.value.trim()
          : undefined,
      montant: this.showMontant() ? Number(this.createForm.controls.montant.value) : undefined,
    };

    this.submitting.set(true);

    this.paiementsService.create(payload).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.createSuccess.set(
          `Paiement ${result.paiement_reference} — ${result.montant} MRU enregistré.`,
        );
        const client = this.selectedClient();
        if (client) {
          this.whatsapp.offerSend(
            client.id,
            `${client.prenom} ${client.nom}`,
            'recu_paiement',
          );
        }
        this.createForm.reset({
          type_paiement: 'Abonnement',
          moyen_paiement_id: '',
          client_search: '',
          nom_client_occasionnel: '',
          montant: '',
        });
        this.selectedClient.set(null);
        this.loadData();
      },
      error: (err: { error?: { message?: string; detail?: string } }) => {
        this.submitting.set(false);
        const msg = err.error?.message ?? err.error?.detail ?? 'Erreur lors de l\'enregistrement.';
        this.createError.set(msg);
      },
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const raw = this.filters.getRawValue();
    const filters = {
      date_debut: raw.date_debut || undefined,
      date_fin: raw.date_fin || undefined,
      moyen_paiement_id: raw.moyen_paiement_id || undefined,
      type_paiement: raw.type_paiement || undefined,
    };

    const jour = raw.date_debut || undefined;

    this.paiementsService.listJournal(filters).subscribe({
      next: (items) => {
        this.paiements.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le journal des paiements.');
        this.loading.set(false);
      },
    });

    this.paiementsService.getCaisseJour(jour).subscribe({
      next: (data) => this.caisse.set(data),
    });
  }
}
