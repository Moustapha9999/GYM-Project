import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import {
  CoachLight,
  Planning,
  PLANNING_STATUTS,
  Programme,
} from '@features/coach/models/coach.model';
import { CoachService } from '@features/coach/services/coach.service';
import { Client } from '@features/clients/models/client.model';
import { ClientsService } from '@features/clients/services/clients.service';
import { DialogService } from '@shared/components/app-dialog/dialog.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

type CoachTab = 'planning' | 'programmes';

@Component({
  selector: 'app-coach-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, AppIconComponent, DatePipe],
  templateUrl: './coach-page.component.html',
  styleUrl: './coach-page.component.scss',
})
export class CoachPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly coachService = inject(CoachService);
  private readonly clientsService = inject(ClientsService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(DialogService);

  private readonly clientSearch$ = new Subject<string>();

  readonly statuts = PLANNING_STATUTS;
  readonly activeTab = signal<CoachTab>('planning');

  // ── Coachs (sélecteurs) ───────────────────────────────────
  readonly coachs = signal<CoachLight[]>([]);

  // ── Planning ──────────────────────────────────────────────
  readonly plannings = signal<Planning[]>([]);
  readonly planningLoading = signal(true);
  readonly planningError = signal<string | null>(null);
  readonly editingPlanning = signal<Planning | null>(null);
  readonly showPlanningForm = signal(false);

  readonly planningFilters = this.fb.nonNullable.group({
    coach_id: [''],
    jour: [''],
  });

  readonly planningForm = this.fb.nonNullable.group({
    coach_id: ['', [Validators.required]],
    titre: ['', [Validators.required, Validators.minLength(2)]],
    date_seance: ['', [Validators.required]],
    heure_debut: ['', [Validators.required]],
    heure_fin: ['', [Validators.required]],
    statut: ['Planifié'],
  });

  // ── Programmes ────────────────────────────────────────────
  readonly programmes = signal<Programme[]>([]);
  readonly programmeLoading = signal(true);
  readonly programmeError = signal<string | null>(null);
  readonly editingProgramme = signal<Programme | null>(null);
  readonly showProgrammeForm = signal(false);

  readonly programmeFilters = this.fb.nonNullable.group({
    coach_id: [''],
    actif: [''],
  });

  readonly programmeForm = this.fb.nonNullable.group({
    coach_id: ['', [Validators.required]],
    titre: ['', [Validators.required, Validators.minLength(2)]],
    objectif: [''],
    description: [''],
    date_debut: ['', [Validators.required]],
    date_fin: [''],
    actif: [true],
  });

  // ── Recherche client ──────────────────────────────────────
  readonly selectedClient = signal<Client | null>(null);
  readonly clientResults = signal<Client[]>([]);
  readonly clientSearchLoading = signal(false);
  readonly clientSearchForm = this.fb.nonNullable.group({ search: [''] });

  // ── Messages ──────────────────────────────────────────────
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);

  // ── Permissions ───────────────────────────────────────────
  readonly canCreatePlanning = computed(() => this.auth.hasPermission('planning.creation'));
  readonly canEditPlanning = computed(() => this.auth.hasPermission('planning.modification'));
  readonly canDeletePlanning = computed(() => this.auth.hasPermission('planning.suppression'));
  readonly canCreateProgramme = computed(() =>
    this.auth.hasPermission('programmes_sportifs.creation'),
  );
  readonly canEditProgramme = computed(() =>
    this.auth.hasPermission('programmes_sportifs.modification'),
  );
  readonly canDeleteProgramme = computed(() =>
    this.auth.hasPermission('programmes_sportifs.suppression'),
  );

  ngOnInit(): void {
    this.loadCoachs();
    this.loadPlannings();

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

    this.clientSearchForm.controls.search.valueChanges.subscribe((value) => {
      this.selectedClient.set(null);
      this.clientSearch$.next(value);
    });
  }

  setTab(tab: CoachTab): void {
    this.activeTab.set(tab);
    this.clearMessages();
    if (tab === 'programmes' && this.programmes().length === 0) {
      this.loadProgrammes();
    }
  }

  // ── Chargement ────────────────────────────────────────────
  private loadCoachs(): void {
    this.coachService.listCoachs().subscribe({
      next: (data) => this.coachs.set(data),
      error: () => this.coachs.set([]),
    });
  }

  loadPlannings(): void {
    this.planningLoading.set(true);
    this.planningError.set(null);
    const { coach_id, jour } = this.planningFilters.getRawValue();

    this.coachService.listPlanning({ coach_id, jour, per_page: 100 }).subscribe({
      next: (res) => {
        this.plannings.set(res.data);
        this.planningLoading.set(false);
      },
      error: () => {
        this.planningError.set('Impossible de charger le planning.');
        this.planningLoading.set(false);
      },
    });
  }

  loadProgrammes(): void {
    this.programmeLoading.set(true);
    this.programmeError.set(null);
    const raw = this.programmeFilters.getRawValue();
    const actif = raw.actif === '' ? undefined : raw.actif === 'true';

    this.coachService
      .listProgrammes({ coach_id: raw.coach_id, actif, per_page: 100 })
      .subscribe({
        next: (res) => {
          this.programmes.set(res.data);
          this.programmeLoading.set(false);
        },
        error: () => {
          this.programmeError.set('Impossible de charger les programmes.');
          this.programmeLoading.set(false);
        },
      });
  }

  // ── Recherche client ──────────────────────────────────────
  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.clientSearchForm.patchValue(
      { search: `${client.prenom} ${client.nom} (${client.numero_membre})` },
      { emitEvent: false },
    );
    this.clientResults.set([]);
  }

  // ── Planning : formulaire ─────────────────────────────────
  startCreatePlanning(): void {
    this.editingPlanning.set(null);
    this.resetClientSearch();
    this.planningForm.reset({
      coach_id: '',
      titre: '',
      date_seance: this.todayIso(),
      heure_debut: '',
      heure_fin: '',
      statut: 'Planifié',
    });
    this.clearMessages();
    this.showPlanningForm.set(true);
  }

  startEditPlanning(p: Planning): void {
    this.editingPlanning.set(p);
    this.resetClientSearch();
    if (p.client_id && p.client_nom) {
      this.clientSearchForm.patchValue(
        { search: `${p.client_prenom} ${p.client_nom}` },
        { emitEvent: false },
      );
    }
    this.planningForm.reset({
      coach_id: p.coach_id,
      titre: p.titre,
      date_seance: p.date_seance,
      heure_debut: this.shortTime(p.heure_debut),
      heure_fin: this.shortTime(p.heure_fin),
      statut: p.statut,
    });
    this.clearMessages();
    this.showPlanningForm.set(true);
  }

  submitPlanning(): void {
    if (this.planningForm.invalid) {
      this.planningForm.markAllAsTouched();
      return;
    }
    const raw = this.planningForm.getRawValue();
    if (raw.heure_fin <= raw.heure_debut) {
      this.formError.set("L'heure de fin doit être après l'heure de début.");
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);
    const editing = this.editingPlanning();

    if (editing) {
      this.coachService
        .updatePlanning(editing.id, {
          titre: raw.titre,
          date_seance: raw.date_seance,
          heure_debut: raw.heure_debut,
          heure_fin: raw.heure_fin,
          statut: raw.statut,
        })
        .subscribe({
          next: () => this.onSaved('Séance mise à jour.', () => this.loadPlannings()),
          error: (err) => this.onError(err),
        });
    } else {
      this.coachService
        .createPlanning({
          coach_id: raw.coach_id,
          client_id: this.selectedClient()?.id ?? null,
          titre: raw.titre,
          date_seance: raw.date_seance,
          heure_debut: raw.heure_debut,
          heure_fin: raw.heure_fin,
        })
        .subscribe({
          next: () => this.onSaved('Séance planifiée.', () => this.loadPlannings()),
          error: (err) => this.onError(err),
        });
    }
  }

  deletePlanning(p: Planning): void {
    this.dialog
      .confirm({
        title: 'Supprimer la séance',
        message: `Supprimer la séance « ${p.titre} » ?`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.coachService.deletePlanning(p.id).subscribe({
          next: () => {
            this.actionSuccess.set('Séance supprimée.');
            this.loadPlannings();
          },
          error: (err) => this.formError.set(this.extractError(err)),
        });
      });
  }

  closePlanningForm(): void {
    this.showPlanningForm.set(false);
    this.editingPlanning.set(null);
  }

  // ── Programmes : formulaire ───────────────────────────────
  startCreateProgramme(): void {
    this.editingProgramme.set(null);
    this.resetClientSearch();
    this.programmeForm.reset({
      coach_id: '',
      titre: '',
      objectif: '',
      description: '',
      date_debut: this.todayIso(),
      date_fin: '',
      actif: true,
    });
    this.clearMessages();
    this.showProgrammeForm.set(true);
  }

  startEditProgramme(p: Programme): void {
    this.editingProgramme.set(p);
    this.resetClientSearch();
    if (p.client_nom) {
      this.clientSearchForm.patchValue(
        { search: `${p.client_prenom} ${p.client_nom}` },
        { emitEvent: false },
      );
    }
    this.programmeForm.reset({
      coach_id: p.coach_id,
      titre: p.titre,
      objectif: p.objectif ?? '',
      description: p.description ?? '',
      date_debut: p.date_debut,
      date_fin: p.date_fin ?? '',
      actif: p.actif,
    });
    this.clearMessages();
    this.showProgrammeForm.set(true);
  }

  submitProgramme(): void {
    if (this.programmeForm.invalid) {
      this.programmeForm.markAllAsTouched();
      return;
    }
    const raw = this.programmeForm.getRawValue();
    const editing = this.editingProgramme();

    if (!editing && !this.selectedClient()) {
      this.formError.set('Sélectionnez un client.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    if (editing) {
      this.coachService
        .updateProgramme(editing.id, {
          titre: raw.titre,
          objectif: raw.objectif || null,
          description: raw.description || null,
          date_fin: raw.date_fin || null,
          actif: raw.actif,
        })
        .subscribe({
          next: () => this.onSaved('Programme mis à jour.', () => this.loadProgrammes()),
          error: (err) => this.onError(err),
        });
    } else {
      this.coachService
        .createProgramme({
          client_id: this.selectedClient()!.id,
          coach_id: raw.coach_id,
          titre: raw.titre,
          objectif: raw.objectif || null,
          description: raw.description || null,
          date_debut: raw.date_debut,
          date_fin: raw.date_fin || null,
        })
        .subscribe({
          next: () => this.onSaved('Programme créé.', () => this.loadProgrammes()),
          error: (err) => this.onError(err),
        });
    }
  }

  deleteProgramme(p: Programme): void {
    this.dialog
      .confirm({
        title: 'Supprimer le programme',
        message: `Supprimer le programme « ${p.titre} » ?`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.coachService.deleteProgramme(p.id).subscribe({
          next: () => {
            this.actionSuccess.set('Programme supprimé.');
            this.loadProgrammes();
          },
          error: (err) => this.formError.set(this.extractError(err)),
        });
      });
  }

  closeProgrammeForm(): void {
    this.showProgrammeForm.set(false);
    this.editingProgramme.set(null);
  }

  // ── Helpers d'affichage ───────────────────────────────────
  coachName(c: { coach_prenom?: string | null; coach_nom?: string | null }): string {
    if (c.coach_prenom || c.coach_nom) {
      return `${c.coach_prenom ?? ''} ${c.coach_nom ?? ''}`.trim();
    }
    return '—';
  }

  clientName(c: { client_prenom?: string | null; client_nom?: string | null }): string {
    if (c.client_prenom || c.client_nom) {
      return `${c.client_prenom ?? ''} ${c.client_nom ?? ''}`.trim();
    }
    return '—';
  }

  shortTime(value: string): string {
    return value ? value.slice(0, 5) : value;
  }

  statutClass(statut: string): string {
    const map: Record<string, string> = {
      Planifié: 'is-planned',
      Confirmé: 'is-confirmed',
      Terminé: 'is-done',
      Annulé: 'is-cancelled',
    };
    return map[statut] ?? 'is-planned';
  }

  // ── Privés ────────────────────────────────────────────────
  private onSaved(message: string, reload: () => void): void {
    this.submitting.set(false);
    this.actionSuccess.set(message);
    this.showPlanningForm.set(false);
    this.showProgrammeForm.set(false);
    this.editingPlanning.set(null);
    this.editingProgramme.set(null);
    reload();
  }

  private onError(err: unknown): void {
    this.submitting.set(false);
    this.formError.set(this.extractError(err));
  }

  private resetClientSearch(): void {
    this.selectedClient.set(null);
    this.clientResults.set([]);
    this.clientSearchForm.patchValue({ search: '' }, { emitEvent: false });
  }

  private clearMessages(): void {
    this.formError.set(null);
    this.actionSuccess.set(null);
  }

  private extractError(err: unknown): string {
    const detail = (err as { error?: { detail?: unknown } })?.error?.detail;
    if (typeof detail === 'string') return detail;
    return 'Opération impossible. Vérifiez les informations saisies.';
  }

  private todayIso(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }
}
