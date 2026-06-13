import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-clients-list-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Clients"
      subtitle="Gestion des adhérents, fiches et recherche par QR"
    />

    <app-empty-state
      icon="👥"
      title="Module Clients prêt"
      description="Brancher ici la liste paginée via ClientsService.list()."
    />
  `,
})
export class ClientsListPageComponent {}
