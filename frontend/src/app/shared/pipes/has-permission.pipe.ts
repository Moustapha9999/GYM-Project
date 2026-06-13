import { Pipe, PipeTransform, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';

@Pipe({
  name: 'hasPermission',
})
export class HasPermissionPipe implements PipeTransform {
  private readonly auth = inject(AuthService);

  transform(permission: string | string[]): boolean {
    const permissions = Array.isArray(permission) ? permission : [permission];
    return this.auth.hasAnyPermission(permissions);
  }
}
