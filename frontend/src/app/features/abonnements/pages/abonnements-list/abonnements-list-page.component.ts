import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-abonnements-list-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Abonnements"
      subtitle="Formules, renouvellements, suspensions et résiliations"
    />

    <app-empty-state
      icon="🎫"
      title="Module Abonnements prêt"
      description="Brancher ici la liste et le flux de renouvellement via AbonnementsService."
    />
  `,
})
export class AbonnementsListPageComponent {}
