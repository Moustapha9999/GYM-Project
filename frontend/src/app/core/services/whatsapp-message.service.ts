import { Injectable, inject } from '@angular/core';

import { MessageType } from '@core/models/message.model';
import { MessagesService } from '@core/services/messages.service';
import { TranslationService } from '@core/services/translation.service';
import { DialogService } from '@shared/components/app-dialog/dialog.service';

@Injectable({ providedIn: 'root' })
export class WhatsappMessageService {
  private readonly messagesService = inject(MessagesService);
  private readonly dialog = inject(DialogService);
  private readonly translation = inject(TranslationService);

  offerAfterAbonnement(clientId: string, clientName: string, typeTarif: string): void {
    const type: MessageType = typeTarif === 'inscription' ? 'bienvenue' : 'renouvellement';
    this.offerSend(clientId, clientName, type);
  }

  offerSend(clientId: string, clientName: string, type: MessageType): void {
    const typeLabel = this.translation.translate(`whatsapp.types.${type}`);

    this.dialog
      .confirm({
        title: this.translation.translate('whatsapp.promptTitle'),
        message: this.translation.translate('whatsapp.promptMessage', {
          name: clientName,
          type: typeLabel,
        }),
        confirmLabel: this.translation.translate('whatsapp.send'),
        cancelLabel: this.translation.translate('common.cancel'),
        variant: 'info',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.openWhatsAppLink(clientId, type);
      });
  }

  private openWhatsAppLink(clientId: string, type: MessageType): void {
    this.messagesService.generate(clientId, type).subscribe({
      next: (message) => {
        if (!message.lien_whatsapp) {
          this.dialog.alert({
            title: this.translation.translate('whatsapp.promptTitle'),
            message: this.translation.translate('whatsapp.noPhone'),
            variant: 'warning',
          });
          return;
        }

        window.open(message.lien_whatsapp, '_blank', 'noopener,noreferrer');
      },
      error: () => {
        this.dialog.alert({
          title: this.translation.translate('whatsapp.promptTitle'),
          message: this.translation.translate('whatsapp.generateError'),
          variant: 'danger',
        });
      },
    });
  }
}
