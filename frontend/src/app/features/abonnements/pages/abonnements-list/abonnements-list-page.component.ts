import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { PaginationMeta } from '@core/models/api-response.model';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MruCurrencyPipe } from '@shared/pipes/mru-currency.pipe';
import {
  AbonnementListItem,
  Eligibilite,
  TypeAbonnement,
} from '@features/abonnements/models/abonnement.model';
import { AbonnementsService } from '@features/abonnements/services/abonnements.service';
import { Client } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';
import { MoyenPaiement } from '@features/paiements/models/paiement.model';
import { PaiementsService } from '@features/paiements/services/paiements.service';

@Component({
  selector: 'app-abonnements-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, MruCurrencyPipe, DatePipe],
  templateUrl: './abonnements-list-page.component.html',
  styleUrl: './abonnements-list-page.component.scss',
})
export class AbonnementsListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly abonnementsService = inject(AbonnementsService);
  private readonly clientsService = inject(ClientsService);
  private readonly paiementsService = inject(PaiementsService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly abonnements = signal<AbonnementListItem[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly types = signal<TypeAbonnement[]>([]);
  readonly moyens = signal<MoyenPaiement[]>([]);
  readonly actifsCount = signal(0);
  readonly suspendusCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly eligibilite = signal<Eligibilite | null>(null);

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

  ngOnInit(): void {
    this.abonnementsService.listTypes().subscribe({ next: (t) => this.types.set(t) });
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
        this.clearClient();
        this.souscriptionForm.controls.moyen_paiement_id.setValue('');
        this.loadStats();
        this.loadAbonnements(1);
      },
      error: (err) => this.handleFormError(err),
    });
  }

  suspendre(abo: AbonnementListItem): void {
    if (!confirm(`Suspendre l'abonnement de ${abo.client_nom} ?`)) return;

    this.abonnementsService.suspendre(abo.id).subscribe({
      next: () => {
        this.formSuccess.set('Abonnement suspendu.');
        this.loadStats();
        this.loadAbonnements(this.meta()?.current_page ?? 1);
      },
      error: (err) => this.handleFormError(err),
    });
  }

  resilier(abo: AbonnementListItem): void {
    if (!confirm(`Résilier l'abonnement de ${abo.client_nom} ?`)) return;

    this.abonnementsService.resilier(abo.id).subscribe({
      next: () => {
        this.formSuccess.set('Abonnement résilié.');
        this.loadStats();
        this.loadAbonnements(this.meta()?.current_page ?? 1);
      },
      error: (err) => this.handleFormError(err),
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
