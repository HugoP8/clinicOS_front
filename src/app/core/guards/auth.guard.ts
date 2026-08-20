import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};

/**
 * Rutas sensibles (super-admin / admin) NUNCA confían en el rol cacheado en
 * localStorage — se manipula con el inspector del navegador en segundos.
 * En su lugar se re-consulta /auth/me, que devuelve el rol real leído de la
 * base de datos a partir del JWT firmado (verificación server-side real).
 * Esto también resincroniza el signal `currentUser` con la verdad del backend,
 * así que cualquier manipulación local del rol queda sobrescrita al navegar.
 */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.getMe().pipe(
    map(res => (res.data?.role === 'SUPER_ADMIN' ? true : router.createUrlTree(['/dashboard']))),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR_ADMIN'];
  return auth.getMe().pipe(
    map(res => (res.data?.role && adminRoles.includes(res.data.role) ? true : router.createUrlTree(['/dashboard']))),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
