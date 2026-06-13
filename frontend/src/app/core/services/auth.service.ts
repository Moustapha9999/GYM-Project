import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';

import { APP_CONSTANTS, APP_ROUTES } from '@core/config/app.constants';
import { LoginRequest, LoginResponse, Utilisateur } from '@core/models/utilisateur.model';
import { ApiService } from '@core/services/api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<Utilisateur | null>(this.loadStoredUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly permissions = computed(() => this._currentUser()?.permissions ?? []);
  readonly roleName = computed(() => this._currentUser()?.role.nom ?? null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        if (response.success) {
          this.persistSession(response.data.token, response.data.utilisateur);
        }
      }),
      map((response) => response.data),
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.api.post<null>('auth/logout', {}).subscribe({
        complete: () => this.clearSession(true),
        error: () => this.clearSession(true),
      });
      return;
    }

    this.clearSession(true);
  }

  clearSession(redirect = false): void {
    localStorage.removeItem(APP_CONSTANTS.tokenStorageKey);
    localStorage.removeItem(APP_CONSTANTS.userStorageKey);
    this._currentUser.set(null);

    if (redirect) {
      void this.router.navigate([APP_ROUTES.auth.login]);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(APP_CONSTANTS.tokenStorageKey);
  }

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasAnyPermission(required: string[]): boolean {
    return required.some((permission) => this.hasPermission(permission));
  }

  private persistSession(token: string, user: Utilisateur): void {
    localStorage.setItem(APP_CONSTANTS.tokenStorageKey, token);
    localStorage.setItem(APP_CONSTANTS.userStorageKey, JSON.stringify(user));
    this._currentUser.set(user);
  }

  private loadStoredUser(): Utilisateur | null {
    const raw = localStorage.getItem(APP_CONSTANTS.userStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Utilisateur;
    } catch {
      return null;
    }
  }
}
