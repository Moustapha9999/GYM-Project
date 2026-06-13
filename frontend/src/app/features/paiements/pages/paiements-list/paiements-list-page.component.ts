import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-paiements-list-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Paiements"
      subtitle="Encaissements, caisse du jour et moyens locaux (Bankily, Masrivi, Sedad)"
    />

    <app-empty-state
      icon="💳"
      title="Module Paiements prêt"
      description="Brancher ici la liste paginée et la caisse via PaiementsService."
    />
  `,
})
export class PaiementsListPageComponent {}
