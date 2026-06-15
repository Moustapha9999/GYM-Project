import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PaginationMeta } from '@core/models/api-response.model';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { Client, ClientImportResult } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-clients-list-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, DatePipe, TranslatePipe],
  templateUrl: './clients-list-page.component.html',
  styleUrl: './clients-list-page.component.scss',
})
export class ClientsListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly clients = signal<Client[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly totalClients = signal(0);
  readonly actifsCount = signal(0);
  readonly inactifsCount = signal(0);
  readonly error = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formMode = signal<FormMode>('create');
  readonly editingClient = signal<Client | null>(null);
  readonly viewingClient = signal<Client | null>(null);
  readonly detailLoading = signal(false);
  readonly importing = signal(false);
  readonly importResult = signal<ClientImportResult | null>(null);

  readonly perPage = 15;

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    sexe: [''],
    actif: [''],
  });

  readonly clientForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    telephone: ['', [Validators.required]],
    sexe: [''],
    date_naissance: [''],
    email: [''],
    whatsapp: [''],
    adresse: [''],
    numero_piece_identite: [''],
    contact_urgence_nom: [''],
    contact_urgence_telephone: [''],
    groupe_sanguin: [''],
    actif: [true],
  });

  readonly sexeOptions = [
    { value: '', label: 'Non précisé' },
    { value: 'Homme', label: 'Homme' },
    { value: 'Femme', label: 'Femme' },
  ];

  readonly groupeSanguinOptions = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  readonly actifFilterOptions = [
    { value: '', label: 'Tous' },
    { value: 'true', label: 'Actifs' },
    { value: 'false', label: 'Inactifs' },
  ];

  ngOnInit(): void {
    this.loadStats();
    this.loadClients(1);
  }

  applyFilters(): void {
    this.loadClients(1);
  }

  resetFilters(): void {
    this.filters.reset({ search: '', sexe: '', actif: '' });
    this.loadClients(1);
  }

  goToPage(page: number): void {
    const meta = this.meta();
    if (!meta || page < 1 || page > meta.last_page) return;
    this.loadClients(page);
  }

  startCreate(): void {
    this.formMode.set('create');
    this.editingClient.set(null);
    this.viewingClient.set(null);
    this.formSuccess.set(null);
    this.formError.set(null);
    this.clientForm.reset({
      nom: '',
      prenom: '',
      telephone: '',
      sexe: '',
      date_naissance: '',
      email: '',
      whatsapp: '',
      adresse: '',
      numero_piece_identite: '',
      contact_urgence_nom: '',
      contact_urgence_telephone: '',
      groupe_sanguin: '',
      actif: true,
    });
  }

  startEdit(client: Client): void {
    this.formMode.set('edit');
    this.viewingClient.set(null);
    this.editingClient.set(client);
    this.formSuccess.set(null);
    this.formError.set(null);

    this.clientsService.getById(client.id).subscribe({
      next: (full) => {
        this.editingClient.set(full);
        this.clientForm.reset({
          nom: full.nom,
          prenom: full.prenom,
          telephone: full.telephone,
          sexe: full.sexe ?? '',
          date_naissance: full.date_naissance ?? '',
          email: full.email ?? '',
          whatsapp: full.whatsapp ?? '',
          adresse: full.adresse ?? '',
          numero_piece_identite: full.numero_piece_identite ?? '',
          contact_urgence_nom: full.contact_urgence_nom ?? '',
          contact_urgence_telephone: full.contact_urgence_telephone ?? '',
          groupe_sanguin: full.groupe_sanguin ?? '',
          actif: full.actif,
        });
      },
      error: () => {
        this.formError.set('Impossible de charger le client.');
      },
    });
  }

  viewClient(client: Client): void {
    this.formMode.set('view');
    this.editingClient.set(null);
    this.formSuccess.set(null);
    this.formError.set(null);
    this.detailLoading.set(true);
    this.viewingClient.set(null);

    this.clientsService.getById(client.id).subscribe({
      next: (full) => {
        this.viewingClient.set(full);
        this.detailLoading.set(false);
      },
      error: () => {
        this.formError.set('Impossible de charger les détails du client.');
        this.detailLoading.set(false);
        this.formMode.set('create');
      },
    });
  }

  closeView(): void {
    this.viewingClient.set(null);
    this.startCreate();
  }

  submitForm(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formSuccess.set(null);
    this.formError.set(null);

    const raw = this.clientForm.getRawValue();
    const optional = (value: string) => value.trim() || undefined;

    if (this.formMode() === 'create') {
      const payload = {
        nom: raw.nom.trim(),
        prenom: raw.prenom.trim(),
        telephone: raw.telephone.trim(),
        sexe: optional(raw.sexe),
        date_naissance: optional(raw.date_naissance),
        email: optional(raw.email),
        whatsapp: optional(raw.whatsapp),
        adresse: optional(raw.adresse),
        numero_piece_identite: optional(raw.numero_piece_identite),
        contact_urgence_nom: optional(raw.contact_urgence_nom),
        contact_urgence_telephone: optional(raw.contact_urgence_telephone),
        groupe_sanguin: optional(raw.groupe_sanguin),
      };

      this.clientsService.create(payload).subscribe({
        next: (client) => {
          this.submitting.set(false);
          this.formSuccess.set(`Client créé : ${client.numero_membre}`);
          this.startCreate();
          this.loadStats();
          this.loadClients(this.meta()?.current_page ?? 1);
        },
        error: (err) => this.handleFormError(err),
      });
      return;
    }

    const client = this.editingClient();
    if (!client) return;

    const payload = {
      nom: raw.nom.trim(),
      prenom: raw.prenom.trim(),
      telephone: raw.telephone.trim(),
      sexe: optional(raw.sexe),
      date_naissance: optional(raw.date_naissance),
      email: optional(raw.email),
      whatsapp: optional(raw.whatsapp),
      adresse: optional(raw.adresse),
      numero_piece_identite: optional(raw.numero_piece_identite),
      contact_urgence_nom: optional(raw.contact_urgence_nom),
      contact_urgence_telephone: optional(raw.contact_urgence_telephone),
      groupe_sanguin: optional(raw.groupe_sanguin),
      actif: raw.actif,
    };

    this.clientsService.update(client.id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.formSuccess.set('Client mis à jour.');
        this.loadStats();
        this.loadClients(this.meta()?.current_page ?? 1);
      },
      error: (err) => this.handleFormError(err),
    });
  }

  deleteClient(client: Client): void {
    if (!confirm(`Supprimer définitivement ${client.prenom} ${client.nom} ?`)) {
      return;
    }

    this.clientsService.delete(client.id).subscribe({
      next: () => {
        this.formSuccess.set('Client supprimé.');
        if (this.editingClient()?.id === client.id || this.viewingClient()?.id === client.id) {
          this.startCreate();
        }
        this.loadStats();
        this.loadClients(this.meta()?.current_page ?? 1);
      },
      error: (err) => this.handleFormError(err),
    });
  }

  downloadImportTemplate(): void {
    this.clientsService.downloadImportTemplate().subscribe({
      error: () => this.formError.set('Impossible de télécharger le modèle Excel.'),
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.formError.set('Format non supporté. Utilisez un fichier .xlsx.');
      input.value = '';
      return;
    }

    this.importing.set(true);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.importResult.set(null);

    this.clientsService.importExcel(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.crees > 0) {
          this.formSuccess.set(`${result.crees} client(s) importé(s).`);
          this.loadStats();
          this.loadClients(1);
        }
      },
      error: (err) => {
        this.importing.set(false);
        const detail = err.error?.detail;
        this.formError.set(
          typeof detail === 'string' ? detail : 'Impossible d\'importer le fichier Excel.',
        );
      },
    });

    input.value = '';
  }

  clearImportResult(): void {
    this.importResult.set(null);
  }

  private loadStats(): void {
    this.clientsService.count().subscribe({ next: (n) => this.totalClients.set(n) });
    this.clientsService.count({ actif: true }).subscribe({ next: (n) => this.actifsCount.set(n) });
    this.clientsService.count({ actif: false }).subscribe({ next: (n) => this.inactifsCount.set(n) });
  }

  private loadClients(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const raw = this.filters.getRawValue();
    const actif =
      raw.actif === 'true' ? true : raw.actif === 'false' ? false : undefined;

    this.clientsService
      .list({
        search: raw.search.trim() || undefined,
        sexe: raw.sexe || undefined,
        actif,
        page,
        per_page: this.perPage,
      })
      .subscribe({
        next: (response) => {
          this.clients.set(response.data);
          this.meta.set(response.meta);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les clients.');
          this.loading.set(false);
        },
      });
  }

  private handleFormError(err: { error?: { message?: string; detail?: string | { msg: string }[] } }): void {
    this.submitting.set(false);
    const detail = err.error?.detail;
    if (Array.isArray(detail)) {
      this.formError.set(detail.map((d) => d.msg).join(', '));
      return;
    }
    this.formError.set(
      err.error?.message ?? (typeof detail === 'string' ? detail : 'Erreur lors de l\'opération.'),
    );
  }
}
