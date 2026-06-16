import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { MessageGenere, MessageType } from '@core/models/message.model';
import { ApiService } from '@core/services/api.service';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly api = inject(ApiService);

  generate(clientId: string, type: MessageType): Observable<MessageGenere> {
    return this.api
      .get<MessageGenere>(`messages/client/${clientId}/generer`, { type_message: type })
      .pipe(map((response) => response.data));
  }
}
