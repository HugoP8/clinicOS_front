import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'clinicos_access_token';
  private readonly REFRESH_KEY = 'clinicos_refresh_token';
  private readonly USER_KEY = 'clinicos_user';

  // Signals
  readonly currentUser = signal<AuthUser | null>(this.loadStoredUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal(false);

  /** true for premium, platinum, trial — any plan above basic */
  readonly isPremiumOrHigher = computed(() => {
    const slug = this.currentUser()?.planSlug || '';
    if (!slug) return false;
    return slug.includes('premium') || slug.includes('platinum') || slug.includes('trial');
  });

  /** true only for platinum plan */
  readonly isPlatinum = computed(() => {
    const slug = this.currentUser()?.planSlug || '';
    return slug.includes('platinum');
  });

  get accessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  login(email: string, password: string) {
    this.isLoading.set(true);
    return this.http.post<{ success: boolean; data: LoginResponse }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ).pipe(
      tap(res => {
        this.storeTokens(res.data.accessToken, res.data.refreshToken);
        this.currentUser.set(res.data.user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.user));
        this.isLoading.set(false);
      }),
      catchError(err => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  logout() {
    const refreshToken = this.refreshToken;
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  refreshTokens() {
    const token = this.refreshToken;
    if (!token) return throwError(() => new Error('No refresh token'));

    return this.http.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken: token }
    ).pipe(
      tap(res => this.storeTokens(res.data.accessToken, res.data.refreshToken))
    );
  }

  getMe() {
    return this.http.get<{ success: boolean; data: AuthUser }>(`${environment.apiUrl}/auth/me`).pipe(
      tap(res => {
        this.currentUser.set(res.data);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
      })
    );
  }

  /** Merge partial fields into currentUser (e.g. sync planSlug after plan load) */
  updateUser(partial: Partial<AuthUser>) {
    const current = this.currentUser();
    if (!current) return;
    const updated = { ...current, ...partial };
    this.currentUser.set(updated);
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  isAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN', 'ADMIN');
  }

  private storeTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  private loadStoredUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
