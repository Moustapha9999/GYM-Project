import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DEFAULT_LANGUAGE } from '@core/models/language.model';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';
import { DialogHostComponent } from '@shared/components/app-dialog/dialog-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly translation = inject(TranslationService);

  ngOnInit(): void {
    this.theme.load().subscribe({
      error: () => {
        void this.translation.initFromSettings(DEFAULT_LANGUAGE).subscribe();
      },
    });
  }
}
