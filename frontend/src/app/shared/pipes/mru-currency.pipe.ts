import { Pipe, PipeTransform } from '@angular/core';

import { APP_CONSTANTS } from '@core/config/app.constants';

@Pipe({
  name: 'mruCurrency',
})
export class MruCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }

    return `${new Intl.NumberFormat('fr-MR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)} ${APP_CONSTANTS.devise}`;
  }
}
