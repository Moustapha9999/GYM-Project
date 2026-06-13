import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-coach-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Coach"
      subtitle="Programmes sportifs et planning des séances"
    />

    <app-empty-state
      icon="🎯"
      title="Module Coach prêt"
      description="Brancher ici les endpoints /programmes-sportifs et /planning."
    />
  `,
})
export class CoachPageComponent {}
