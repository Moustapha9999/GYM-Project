import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import {
  RECEPTION_MENU_NAV,
} from '@layout/config/reception-nav.config';

@Component({
  selector: 'app-reception-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './reception-sidebar.component.html',
  styleUrl: './reception-sidebar.component.scss',
})
export class ReceptionSidebarComponent {
  private readonly auth = inject(AuthService);

  readonly menuItems = RECEPTION_MENU_NAV;

  readonly userName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Réception';
  });

  logout(): void {
    this.auth.logout();
  }
}
