import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { Client } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';
import { PresenceClientInfo } from '@features/presences/models/presence.model';
import { PresencesService } from '@features/presences/services/presences.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

type PointageMode = 'qr' | 'manual';

@Component({
  selector: 'app-presences-list-page',
  imports: [
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    AppIconComponent,
    DatePipe,
    TranslatePipe,
  ],
  templateUrl: './presences-list-page.component.html',
  styleUrl: './presences-list-page.component.scss',
})
export class PresencesListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly presencesService = inject(PresencesService);
  private readonly clientsService = inject(ClientsService);
  private readonly auth = inject(AuthService);

  private readonly clientSearch$ = new Subject<string>();

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly presences = signal<PresenceClientInfo[]>([]);
  readonly error = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly pointageMode = signal<PointageMode>('qr');
  readonly selectedClient = signal<Client | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly clientSearchLoading = signal(false);

  readonly selectedDate = signal(this.todayIso());

  readonly canCreate = computed(() => this.auth.hasPermission('presences.creation'));
  readonly canSortie = computed(() => this.auth.hasPermission('presences.modification'));

  readonly totalJour = computed(() => this.presences().length);
  readonly enSalle = computed(() => this.presences().filter((p) => !p.heure_sortie).length);
  readonly entreesQr = computed(() => this.presences().filter((p) => p.methode === 'QR Code').length);
  readonly entreesManuelles = computed(
    () => this.presences().filter((p) => p.methode === 'Manuel').length,
  );

  readonly qrForm = this.fb.nonNullable.group({ qr_code: [''] });
  readonly manualForm = this.fb.nonNullable.group({ search: [''] });
  readonly sortieQrForm = this.fb.nonNullable.group({ qr_code: [''] });

  ngOnInit(): void {
    this.loadPresences();

    this.clientSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = term.trim();
          if (q.length < 2) {
            this.clientResults.set([]);
            this.clientSearchLoading.set(false);
            return of([]);
          }
          this.clientSearchLoading.set(true);
          return this.clientsService.search(q);
        }),
      )
      .subscribe({
        next: (clients) => {
          this.clientResults.set(Array.isArray(clients) ? clients : []);
          this.clientSearchLoading.set(false);
        },
        error: () => {
          this.clientResults.set([]);
          this.clientSearchLoading.set(false);
        },
      });

    this.manualForm.controls.search.valueChanges.subscribe((value) => {
      this.selectedClient.set(null);
      this.clientSearch$.next(value);
    });
  }

  setMode(mode: PointageMode): void {
    this.pointageMode.set(mode);
    this.clearActionMessages();
  }

  onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectedDate.set(value || this.todayIso());
    this.loadPresences();
  }

  submitEntreeQr(): void {
    if (!this.canCreate()) return;

    const raw = this.qrForm.controls.qr_code.value.trim();
    const uuid = this.extractUuid(raw);
    if (!uuid) {
      this.actionError.set('Scannez ou saisissez un QR code valide (UUID).');
      return;
    }

    this.submitting.set(true);
    this.clearActionMessages();

    this.presencesService.entreeQr({ qr_code_uuid: uuid }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.qrForm.reset({ qr_code: '' });
        this.actionSuccess.set('Entrée enregistrée via QR.');
        this.loadPresences();
      },
      error: (err) => {
        this.submitting.set(false);
        this.actionError.set(this.extractError(err));
      },
    });
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.manualForm.patchValue({
      search: `${client.prenom} ${client.nom} (${client.numero_membre})`,
    });
    this.clientResults.set([]);
  }

  submitEntreeManuelle(): void {
    if (!this.canCreate()) return;

    const client = this.selectedClient();
    if (!client) {
      this.actionError.set('Sélectionnez un client dans la liste de recherche.');
      return;
    }

    this.submitting.set(true);
    this.clearActionMessages();

    this.presencesService.entreeManuelle({ client_id: client.id }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedClient.set(null);
        this.manualForm.reset({ search: '' });
        this.actionSuccess.set(`Entrée enregistrée pour ${client.prenom} ${client.nom}.`);
        this.loadPresences();
      },
      error: (err) => {
        this.submitting.set(false);
        this.actionError.set(this.extractError(err));
      },
    });
  }

  submitSortieQr(): void {
    if (!this.canSortie()) return;

    const raw = this.sortieQrForm.controls.qr_code.value.trim();
    const uuid = this.extractUuid(raw);
    if (!uuid) {
      this.actionError.set('Scannez ou saisissez un QR code valide pour la sortie.');
      return;
    }

    this.pointerSortie({ qr_code_uuid: uuid });
    this.sortieQrForm.reset({ qr_code: '' });
  }

  pointerSortieManuelle(presence: PresenceClientInfo): void {
    if (!this.canSortie() || presence.heure_sortie) return;
    this.pointerSortie({ presence_id: presence.id });
  }

  clientFullName(p: PresenceClientInfo): string {
    return `${p.client_prenom} ${p.client_nom}`;
  }

  formatDuree(minutes: number | null): string {
    if (minutes == null) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  isEnSalle(presence: PresenceClientInfo): boolean {
    return !presence.heure_sortie;
  }

  private pointerSortie(payload: { presence_id?: string; qr_code_uuid?: string }): void {
    this.submitting.set(true);
    this.clearActionMessages();

    this.presencesService.sortie(payload).subscribe({
      next: (presence) => {
        this.submitting.set(false);
        const duree = presence.duree_minutes ?? 0;
        this.actionSuccess.set(`Sortie enregistrée — durée ${this.formatDuree(duree)}.`);
        this.loadPresences();
      },
      error: (err) => {
        this.submitting.set(false);
        this.actionError.set(this.extractError(err));
      },
    });
  }

  private loadPresences(): void {
    this.loading.set(true);
    this.error.set(null);

    this.presencesService.listDuJour(this.selectedDate()).subscribe({
      next: (data) => {
        this.presences.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les présences du jour.');
        this.loading.set(false);
      },
    });
  }

  private clearActionMessages(): void {
    this.actionSuccess.set(null);
    this.actionError.set(null);
  }

  private extractUuid(value: string): string | null {
    const trimmed = value.trim();
    const match = trimmed.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    return match ? match[0] : null;
  }

  private extractError(err: { error?: { detail?: unknown } }): string {
    const detail = err.error?.detail;
    if (typeof detail === 'string') return detail;
    return 'Opération impossible. Vérifiez l\'abonnement ou le pointage en cours.';
  }

  private todayIso(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
