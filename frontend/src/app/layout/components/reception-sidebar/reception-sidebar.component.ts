import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { RECEPTION_MENU_NAV } from '@layout/config/reception-nav.config';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-reception-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, AppIconComponent],
  templateUrl: './reception-sidebar.component.html',
  styleUrl: './reception-sidebar.component.scss',
})
export class ReceptionSidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly menuItems = RECEPTION_MENU_NAV;

  readonly gymName = computed(() => this.theme.settings()?.nom_salle ?? 'GYM SYLLA');

  readonly userName = computed(() => {
    const user = this.auth.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Réception';
  });

  logout(): void {
    this.auth.logout();
  }
}
