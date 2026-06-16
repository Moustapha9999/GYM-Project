import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import {
  FichePaieRapport,
  JournalAuditRapport,
  JournalCaisseRapport,
  JournalClientRapport,
} from '@features/rapports/models/rapport.model';
import { RapportsService } from '@features/rapports/services/rapports.service';

type RapportTab = 'fiches' | 'audit' | 'caisse' | 'clients';

@Component({
  selector: 'app-rapports-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, DatePipe, DecimalPipe],
  templateUrl: './rapports-page.component.html',
  styleUrl: './rapports-page.component.scss',
})
export class RapportsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rapportsService = inject(RapportsService);

  readonly activeTab = signal<RapportTab>('fiches');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);

  readonly fiches = signal<FichePaieRapport[]>([]);
  readonly audits = signal<JournalAuditRapport[]>([]);
  readonly caisses = signal<JournalCaisseRapport[]>([]);
  readonly clients = signal<JournalClientRapport[]>([]);

  readonly filters = this.fb.nonNullable.group({
    date_debut: [''],
    date_fin: [''],
    module: [''],
  });

  ngOnInit(): void {
    this.loadCurrentTab();
  }

  setTab(tab: RapportTab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.loadCurrentTab();
  }

  applyFilters(): void {
    this.loadCurrentTab();
  }

  resetFilters(): void {
    this.filters.reset({ date_debut: '', date_fin: '', module: '' });
    this.loadCurrentTab();
  }

  exportCurrent(format: 'excel' | 'pdf'): void {
    const tab = this.activeTab();
    const payload = this.filters.getRawValue();
    const common = {
      date_debut: payload.date_debut || undefined,
      date_fin: payload.date_fin || undefined,
    };
    const endpointMap: Record<RapportTab, string> = {
      fiches: `rapports/fiches-paie/export/${format}`,
      audit: `rapports/journal-audit/export/${format}`,
      caisse: `rapports/journal-caisse/export/${format}`,
      clients: `rapports/journal-clients/export/${format}`,
    };

    this.exporting.set(true);
    this.rapportsService
      .download(
        endpointMap[tab],
        tab === 'audit'
          ? { ...common, module: payload.module || undefined }
          : common,
      )
      .subscribe({
        next: (blob) => {
          this.exporting.set(false);
          const ext = format === 'excel' ? 'xlsx' : 'pdf';
          const file = `rapport_${tab}_${new Date().toISOString().slice(0, 10)}.${ext}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.exporting.set(false);
          this.error.set("Erreur lors de l'export.");
        },
      });
  }

  private loadCurrentTab(): void {
    this.loading.set(true);
    this.error.set(null);
    const payload = this.filters.getRawValue();
    const common = {
      date_debut: payload.date_debut || undefined,
      date_fin: payload.date_fin || undefined,
    };

    if (this.activeTab() === 'fiches') {
      this.rapportsService.listFichesPaie(common).subscribe({
        next: (rows) => {
          this.fiches.set(rows);
          this.loading.set(false);
        },
        error: () => this.failLoad(),
      });
      return;
    }

    if (this.activeTab() === 'audit') {
      this.rapportsService.listJournalAudit({ ...common, module: payload.module || undefined }).subscribe({
        next: (rows) => {
          this.audits.set(rows);
          this.loading.set(false);
        },
        error: () => this.failLoad(),
      });
      return;
    }

    if (this.activeTab() === 'caisse') {
      this.rapportsService.listJournalCaisse(common).subscribe({
        next: (rows) => {
          this.caisses.set(rows);
          this.loading.set(false);
        },
        error: () => this.failLoad(),
      });
      return;
    }

    this.rapportsService.listJournalClients(common).subscribe({
      next: (rows) => {
        this.clients.set(rows);
        this.loading.set(false);
      },
      error: () => this.failLoad(),
    });
  }

  private failLoad(): void {
    this.loading.set(false);
    this.error.set("Impossible de charger ce rapport.");
  }
}
