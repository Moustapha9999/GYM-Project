import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { PaginationMeta } from '@core/models/api-response.model';
import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import {
  AbonnementListItem,
  Eligibilite,
  FormulesTarifs,
} from '@features/abonnements/models/abonnement.model';
import { AbonnementsService } from '@features/abonnements/services/abonnements.service';
import { Client } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';
import { WhatsappMessageService } from '@core/services/whatsapp-message.service';
import { MoyenPaiement } from '@features/paiements/models/paiement.model';
import { PaiementsService } from '@features/paiements/services/paiements.service';

type SidePanelMode = 'subscribe' | 'view' | 'edit';

@Component({
  selector: 'app-abonnements-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, MruCurrencyPipe, DatePipe, TranslatePipe, AppIconComponent],
  templateUrl: './abonnements-list-page.component.html',
  styleUrl: './abonnements-list-page.component.scss',
})
export class AbonnementsListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly abonnementsService = inject(AbonnementsService);
  private readonly clientsService = inject(ClientsService);
  private readonly paiementsService = inject(PaiementsService);
  private readonly dialog = inject(DialogService);
  private readonly whatsapp = inject(WhatsappMessageService);
  private readonly auth = inject(AuthService);

  readonly canModifyAbonnement = computed(() => this.auth.hasPermission('abonnements.modification'));
  readonly canDeleteAbonnement = computed(() => this.auth.hasPermission('abonnements.suppression'));

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly abonnements = signal<AbonnementListItem[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly tarifs = signal<FormulesTarifs | null>(null);
  readonly tarifsLoading = signal(true);
  readonly moyens = signal<MoyenPaiement[]>([]);
  readonly actifsCount = signal(0);
  readonly suspendusCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly eligibilite = signal<Eligibilite | null>(null);
  readonly sidePanelMode = signal<SidePanelMode>('subscribe');
  readonly viewingAbonnement = signal<AbonnementListItem | null>(null);
  readonly viewEligibilite = signal<Eligibilite | null>(null);
  readonly detailSuccess = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly renewing = signal(false);
  readonly savingEdit = signal(false);
  readonly importing = signal(false);

  readonly renewForm = this.fb.nonNullable.group({
    moyen_paiement_id: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    date_debut: ['', Validators.required],
    date_fin: ['', Validators.required],
    montant: [0, [Validators.required, Validators.min(0)]],
    statut: ['Actif', Validators.required],
    est_inscription: [false],
  });

  readonly perPage = 15;
  readonly today = new Date();

  readonly filters = this.fb.nonNullable.group({
    statut: [''],
  });

  readonly souscriptionForm = this.fb.nonNullable.group({
    client_search: [''],
    moyen_paiement_id: [''],
  });

  readonly statutFilterOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Suspendu', label: 'Suspendu' },
    { value: 'Résilié', label: 'Résilié' },
  ];

  readonly statutEditOptions = ['Actif', 'Suspendu', 'Résilié', 'Expiré'] as const;

  ngOnInit(): void {
    this.loadFormulesTarifs();
    this.paiementsService.listMoyensPaiement().subscribe({ next: (m) => this.moyens.set(m) });

    this.souscriptionForm.controls.client_search.valueChanges
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

    this.loadStats();
    this.loadAbonnements(1);
  }

  applyFilters(): void {
    this.loadAbonnements(1);
  }

  resetFilters(): void {
    this.filters.reset({ statut: '' });
    this.loadAbonnements(1);
  }

  downloadImportTemplate(): void {
    this.abonnementsService.downloadImportTemplate().subscribe({
      error: () => {
        this.formError.set('Impossible de télécharger le modèle Excel.');
      },
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);

    // Endpoint backend non disponible pour l'instant sur les abonnements.
    setTimeout(() => {
      this.importing.set(false);
      this.formError.set(
        'Import Excel abonnements non disponible pour le moment. Utilisez ce fichier comme modèle de saisie.',
      );
    }, 500);

    input.value = '';
  }

  goToPage(page: number): void {
    const pagination = this.meta();
    if (!pagination || page < 1 || page > pagination.last_page) return;
    this.loadAbonnements(page);
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.souscriptionForm.controls.client_search.setValue(`${client.prenom} ${client.nom}`);
    this.clientResults.set([]);
    this.eligibilite.set(null);

    this.abonnementsService.getEligibilite(client.id).subscribe({
      next: (data) => this.eligibilite.set(data),
      error: () => this.eligibilite.set(null),
    });
  }

  clearClient(): void {
    this.selectedClient.set(null);
    this.eligibilite.set(null);
    this.souscriptionForm.controls.client_search.setValue('');
    this.clientResults.set([]);
  }

  isExpired(abo: AbonnementListItem): boolean {
    const fin = new Date(abo.date_fin);
    return fin < this.today && abo.statut === 'Actif';
  }

  envoyerAlerte(abo: AbonnementListItem): void {
    this.whatsapp.offerSend(abo.client_id, abo.client_nom, 'alerte_fin');
  }

  viewAbonnement(abonnement: AbonnementListItem): void {
    this.sidePanelMode.set('view');
    this.viewingAbonnement.set(abonnement);
    this.viewEligibilite.set(null);
    this.detailSuccess.set(null);
    this.detailError.set(null);
    this.renewForm.reset({ moyen_paiement_id: '' });

    this.abonnementsService.getEligibilite(abonnement.client_id).subscribe({
      next: (data) => this.viewEligibilite.set(data),
      error: () => this.viewEligibilite.set(null),
    });
  }

  editAbonnement(abonnement: AbonnementListItem): void {
    this.sidePanelMode.set('edit');
    this.viewingAbonnement.set(abonnement);
    this.detailSuccess.set(null);
    this.detailError.set(null);
    this.editForm.reset({
      date_debut: this.toDateInput(abonnement.date_debut),
      date_fin: this.toDateInput(abonnement.date_fin),
      montant: abonnement.montant,
      statut: this.normalizeStatut(abonnement.statut),
      est_inscription: abonnement.est_inscription,
    });
  }

  closeEdit(): void {
    this.sidePanelMode.set('subscribe');
    this.viewingAbonnement.set(null);
    this.detailSuccess.set(null);
    this.detailError.set(null);
  }

  submitEdit(): void {
    const abonnement = this.viewingAbonnement();
    if (!abonnement || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.savingEdit.set(true);
    this.detailError.set(null);
    this.detailSuccess.set(null);

    const raw = this.editForm.getRawValue();
    this.abonnementsService
      .modifier(abonnement.id, {
        date_debut: raw.date_debut,
        date_fin: raw.date_fin,
        montant: Number(raw.montant),
        statut: raw.statut as 'Actif' | 'Suspendu' | 'Résilié' | 'Expiré',
        est_inscription: raw.est_inscription,
      })
      .subscribe({
        next: () => {
          this.savingEdit.set(false);
          this.detailSuccess.set('Abonnement modifié avec succès.');
          this.formSuccess.set(this.detailSuccess());
          this.closeEdit();
          this.loadStats();
          this.loadAbonnements(this.meta()?.current_page ?? 1);
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.handleDetailError(err);
        },
      });
  }

  supprimerAbonnement(abo: AbonnementListItem): void {
    this.dialog
      .confirm({
        title: 'Supprimer l\'abonnement',
        message: `Supprimer définitivement l'abonnement de ${abo.client_nom} ? Cette action est irréversible.`,
        variant: 'danger',
        confirmLabel: 'Supprimer',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.abonnementsService.supprimer(abo.id).subscribe({
          next: () => {
            this.formSuccess.set('Abonnement supprimé.');
            if (this.viewingAbonnement()?.id === abo.id) {
              this.closeEdit();
              this.closeView();
            }
            this.loadStats();
            this.loadAbonnements(this.meta()?.current_page ?? 1);
          },
          error: (err) => this.handleFormError(err),
        });
      });
  }

  private toDateInput(value: string): string {
    return value.slice(0, 10);
  }

  private normalizeStatut(statut: string): 'Actif' | 'Suspendu' | 'Résilié' | 'Expiré' {
    if (statut === 'Suspendu' || statut === 'Résilié' || statut === 'Expiré') {
      return statut;
    }
    return 'Actif';
  }

  closeView(): void {
    this.sidePanelMode.set('subscribe');
    this.viewingAbonnement.set(null);
    this.viewEligibilite.set(null);
    this.detailSuccess.set(null);
    this.detailError.set(null);
  }

  submitRenew(): void {
    const abonnement = this.viewingAbonnement();
    if (!abonnement) return;

    this.detailSuccess.set(null);
    this.detailError.set(null);

    const moyenId = this.renewForm.controls.moyen_paiement_id.value;
    if (!moyenId) {
      this.detailError.set('Sélectionnez un moyen de paiement.');
      return;
    }

    const elig = this.viewEligibilite();
    if (elig && !elig.tarif_normal && !elig.premiere_inscription) {
      this.detailError.set(
        `Délai de grâce expiré (${elig.jours_retard} j.). Le client doit passer par une séance journalière.`,
      );
      return;
    }

    this.renewing.set(true);

    this.abonnementsService
      .souscrire({ client_id: abonnement.client_id, moyen_paiement_id: moyenId })
      .subscribe({
        next: (result) => {
          this.renewing.set(false);
          this.detailSuccess.set(
            `Renouvellement — ${result.montant_paye} MRU (réf. ${result.paiement_reference})`,
          );
          this.formSuccess.set(this.detailSuccess());
          this.whatsapp.offerAfterAbonnement(
            abonnement.client_id,
            abonnement.client_nom,
            result.type_tarif,
          );
          this.loadStats();
          this.loadAbonnements(this.meta()?.current_page ?? 1);
        },
        error: (err) => {
          this.renewing.set(false);
          this.handleDetailError(err);
        },
      });
  }

  private handleDetailError(err: { error?: { message?: string; detail?: string } }): void {
    const detail = err.error?.detail;
    this.detailError.set(
      err.error?.message ?? (typeof detail === 'string' ? detail : 'Erreur lors du renouvellement.'),
    );
  }

  submitSouscription(): void {
    this.formSuccess.set(null);
    this.formError.set(null);

    const client = this.selectedClient();
    const moyenId = this.souscriptionForm.controls.moyen_paiement_id.value;

    if (!client) {
      this.formError.set('Sélectionnez un client.');
      return;
    }
    if (!moyenId) {
      this.formError.set('Sélectionnez un moyen de paiement.');
      return;
    }

    const elig = this.eligibilite();
    if (elig && !elig.tarif_normal && !elig.premiere_inscription) {
      this.formError.set(
        `Délai de grâce expiré (${elig.jours_retard} j.). Le client doit passer par une séance journalière.`,
      );
      return;
    }

    this.submitting.set(true);

    this.abonnementsService.souscrire({ client_id: client.id, moyen_paiement_id: moyenId }).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.formSuccess.set(
          `${result.type_tarif} — ${result.montant_paye} MRU (réf. ${result.paiement_reference})`,
        );
        const clientName = `${client.prenom} ${client.nom}`;
        this.whatsapp.offerAfterAbonnement(client.id, clientName, result.type_tarif);
        this.clearClient();
        this.souscriptionForm.controls.moyen_paiement_id.setValue('');
        this.loadStats();
        this.loadAbonnements(1);
      },
      error: (err) => this.handleFormError(err),
    });
  }

  suspendre(abo: AbonnementListItem): void {
    this.dialog
      .confirm({
        title: 'Suspendre l\'abonnement',
        message: `Suspendre l'abonnement de ${abo.client_nom} ?`,
        variant: 'warning',
        confirmLabel: 'Suspendre',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.abonnementsService.suspendre(abo.id).subscribe({
          next: () => {
            this.formSuccess.set('Abonnement suspendu. La carte membre a été désactivée.');
            this.loadStats();
            this.loadAbonnements(this.meta()?.current_page ?? 1);
          },
          error: (err) => this.handleFormError(err),
        });
      });
  }

  resilier(abo: AbonnementListItem): void {
    this.dialog
      .confirm({
        title: 'Résilier l\'abonnement',
        message: `Résilier l'abonnement de ${abo.client_nom} ?`,
        variant: 'danger',
        confirmLabel: 'Résilier',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.abonnementsService.resilier(abo.id).subscribe({
          next: () => {
            this.formSuccess.set('Abonnement résilié. La carte membre a été désactivée.');
            this.loadStats();
            this.loadAbonnements(this.meta()?.current_page ?? 1);
          },
          error: (err) => this.handleFormError(err),
        });
      });
  }

  private loadFormulesTarifs(): void {
    this.tarifsLoading.set(true);
    this.abonnementsService.getFormulesTarifs().subscribe({
      next: (tarifs) => {
        this.tarifs.set(tarifs);
        this.tarifsLoading.set(false);
      },
      error: () => {
        this.tarifs.set(null);
        this.tarifsLoading.set(false);
      },
    });
  }

  private loadStats(): void {
    this.abonnementsService.count('Actif').subscribe({ next: (n) => this.actifsCount.set(n) });
    this.abonnementsService.count('Suspendu').subscribe({ next: (n) => this.suspendusCount.set(n) });
  }

  private loadAbonnements(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const statut = this.filters.controls.statut.value || undefined;

    this.abonnementsService.list({ statut, page, per_page: this.perPage }).subscribe({
      next: (response) => {
        this.abonnements.set(response.data);
        this.meta.set(response.meta);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les abonnements.');
        this.loading.set(false);
      },
    });
  }

  private handleFormError(err: { error?: { message?: string; detail?: string } }): void {
    this.submitting.set(false);
    const detail = err.error?.detail;
    this.formError.set(
      err.error?.message ?? (typeof detail === 'string' ? detail : 'Erreur lors de l\'opération.'),
    );
  }
}
