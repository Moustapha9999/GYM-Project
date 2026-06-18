import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { ApiResponse, PaginatedApiResponse } from '@core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.buildUrl(path), { params: this.toHttpParams(params) });
  }

  getPaginated<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<PaginatedApiResponse<T>> {
    return this.http.get<PaginatedApiResponse<T>>(this.buildUrl(path), {
      params: this.toHttpParams(params),
    });
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.buildUrl(path), body);
  }

  put<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.buildUrl(path), body);
  }

  patch<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(this.buildUrl(path), body ?? {});
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.buildUrl(path));
  }

  getBlob(path: string, params?: Record<string, string | number | boolean>): Observable<Blob> {
    return this.http.get(this.buildUrl(path), {
      params: this.toHttpParams(params),
      responseType: 'blob',
    });
  }

  uploadFile<T>(path: string, file: File, fieldName = 'file'): Observable<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.http.post<ApiResponse<T>>(this.buildUrl(path), formData);
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private toHttpParams(params?: Record<string, string | number | boolean>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
