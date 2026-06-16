import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DialogAlertOptions,
  DialogConfirmOptions,
  DialogState,
} from '@shared/components/app-dialog/dialog.model';

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly active = signal<DialogState | null>(null);

  confirm(options: DialogConfirmOptions): Observable<boolean> {
    return new Observable((observer) => {
      this.active.set({
        mode: 'confirm',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        variant: options.variant ?? 'default',
        icon: options.icon,
        resolve: (confirmed) => {
          this.active.set(null);
          observer.next(confirmed);
          observer.complete();
        },
      });
    });
  }

  alert(options: DialogAlertOptions): Observable<void> {
    return new Observable((observer) => {
      this.active.set({
        mode: 'alert',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        variant: options.variant ?? 'info',
        icon: options.icon,
        resolve: () => {
          this.active.set(null);
          observer.next();
          observer.complete();
        },
      });
    });
  }

  close(confirmed = false): void {
    const state = this.active();
    if (!state) return;

    if (state.mode === 'alert') {
      state.resolve();
      return;
    }

    state.resolve(confirmed);
  }
}
