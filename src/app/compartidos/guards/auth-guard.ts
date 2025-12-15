import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../servicios/auth';
import { map, take } from 'rxjs/operators';

/**
 * Guard de autenticación para proteger rutas
 *
 * Se verifica si el usuario tiene una sesión activa en rund-api.
 * Si no está autenticado, se redirige a la página de login.
 *
 * Uso en routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [authGuard]
 * }
 * ```
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  // Si ya sabemos que está autenticado (signal en memoria)
  if (authService.estaAutenticado()) {
    return true;
  }

  // Verificar sesión en el servidor
  return authService.verificarSesion().pipe(
    take(1),
    map(response => {
      if (response.success && response.user) {
        // Usuario autenticado
        return true;
      } else {
        // No autenticado, redirigir a login
        // Guardar la URL a la que intentaba acceder
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }
    })
  );
};

/**
 * Guard para rutas que requieren rol de administrador
 *
 * Uso en routes:
 * ```typescript
 * {
 *   path: 'admin/settings',
 *   component: SettingsComponent,
 *   canActivate: [adminGuard]
 * }
 * ```
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  // Verificar autenticación primero
  if (!authService.estaAutenticado()) {
    return authService.verificarSesion().pipe(
      take(1),
      map(response => {
        if (!response.success) {
          router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        // Verificar si es admin
        if (authService.esAdmin()) {
          return true;
        } else {
          // Redirigir a página de acceso denegado
          router.navigate(['/acceso-denegado']);
          return false;
        }
      })
    );
  }

  // Ya está autenticado, verificar rol
  if (authService.esAdmin()) {
    return true;
  } else {
    router.navigate(['/acceso-denegado']);
    return false;
  }
};
