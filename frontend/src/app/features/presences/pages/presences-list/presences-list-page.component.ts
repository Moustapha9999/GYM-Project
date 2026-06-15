import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-presences-list-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Présences"
      subtitle="Pointage entrée/sortie par QR ou saisie manuelle"
    />

    <app-empty-state
      icon="user-check"
      title="Module Présences prêt"
      description="Brancher ici le scan QR et l'historique via PresencesService."
    />
  `,
})
export class PresencesListPageComponent {}
