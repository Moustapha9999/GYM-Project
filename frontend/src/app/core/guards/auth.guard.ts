import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([APP_ROUTES.auth.login]);
};
