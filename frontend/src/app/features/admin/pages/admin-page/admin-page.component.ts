import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Administration"
      subtitle="Utilisateurs, rôles, permissions et journal d'audit"
    />

    <app-empty-state
      icon="⚙️"
      title="Module Administration prêt"
      description="Brancher ici la gestion RBAC et le journal d'audit."
    />
  `,
})
export class AdminPageComponent {}
