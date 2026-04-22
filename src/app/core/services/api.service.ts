import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface DownloadResult { blob: Blob; filename: string; }
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          httpParams = httpParams.set(key, String(val));
        }
      });
    }
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params: httpParams })
      .pipe(map(r => r.data));
  }

  getPaginated<T>(path: string, params?: Record<string, any>): Observable<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(path, params);
  }

  post<T>(path: string, body?: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data));
  }

  patch<T>(path: string, body?: any): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data));
  }

  put<T>(path: string, body?: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(map(r => r.data));
  }

  download(path: string): Observable<Blob> {
    return this.http.get(`${this.base}${path}`, { responseType: 'blob' });
  }

  downloadWithName(path: string): Observable<DownloadResult> {
    return this.http.get(`${this.base}${path}`, { responseType: 'blob', observe: 'response' }).pipe(
      map(res => {
        const cd = res.headers.get('content-disposition') || '';
        const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        const filename = match ? match[1].replace(/['"]/g, '') : 'plantilla.xlsx';
        return { blob: res.body!, filename };
      }),
    );
  }

  upload<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, formData)
      .pipe(map(r => r.data));
  }

  getStaticUrl(relativePath: string | undefined | null): string | null {
    if (!relativePath) return null;
    // En dev apunta al backend; en prod misma origin (nginx)
    const base = environment.production ? '' : environment.wsUrl;
    return `${base}${relativePath}`;
  }
}
