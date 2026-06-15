import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-rh-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header title="RH & Salaires" subtitle="Employés et fiches de paie mensuelles" />

    <app-empty-state
      icon="briefcase"
      title="Module RH prêt"
      description="Brancher ici les endpoints /employes et /fiches-paie."
    />
  `,
})
export class RhPageComponent {}
