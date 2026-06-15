import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationService } from '@core/services/translation.service';

@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    this.translation.currentLang();
    return this.translation.translate(key, params);
  }
}
