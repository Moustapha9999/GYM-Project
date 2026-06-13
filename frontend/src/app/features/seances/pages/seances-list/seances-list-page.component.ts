import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-seances-list-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Séances journalières"
      subtitle="Encaissement des séances à la carte (50 MRU)"
    />

    <app-empty-state
      icon="🏋️"
      title="Module Séances prêt"
      description="Brancher ici la liste du jour et l'encaissement via SeancesService."
    />
  `,
})
export class SeancesListPageComponent {}
