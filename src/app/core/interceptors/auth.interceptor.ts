import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, BehaviorSubject, catchError, switchMap, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = authService.accessToken;

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Red de contención: un 500 es siempre un bug del servidor, nunca un mensaje
      // de negocio que la pantalla ya sepa mostrar — si queda sin manejar, el
      // usuario se queda mirando la nada (como pasó con el bug del plan nulo).
      if (error.status >= 500) {
        toast.show(
          error.error?.message || 'Ocurrió un error inesperado en el servidor. Intentá de nuevo en unos minutos.',
          'error',
        );
      }

      if (error.status === 401 && !req.url.includes('/auth/')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshTokens().pipe(
            switchMap((res: any) => {
              isRefreshing = false;
              refreshTokenSubject.next(res.data.accessToken);
              return next(addToken(req, res.data.accessToken));
            }),
            catchError(err => {
              isRefreshing = false;
              authService.logout();
              return throwError(() => err);
            })
          );
        }

        return refreshTokenSubject.pipe(
          filter(token => token !== null),
          take(1),
          switchMap(token => next(addToken(req, token!)))
        );
      }
      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
