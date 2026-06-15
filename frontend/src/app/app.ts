import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DEFAULT_LANGUAGE } from '@core/models/language.model';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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
