import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { APP_ROUTES } from '@core/config/app.constants';
import { AuthService } from '@core/services/auth.service';

export const permissionGuard = (requiredPermissions: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasAnyPermission(requiredPermissions)) {
      return true;
    }

    return router.createUrlTree([APP_ROUTES.dashboard]);
  };
};
