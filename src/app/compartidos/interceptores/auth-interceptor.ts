import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../servicios/auth';

/**
 * Interceptor de autenticación
 *
 * Se encarga de:
 * 1. Añadir withCredentials: true a todas las peticiones HTTP (para enviar cookies)
 * 2. Capturar errores 401 (Unauthorized) y redirigir a login
 * 3. Capturar errores 403 (Forbidden) y mostrar mensaje de acceso denegado
 *
 * IMPORTANTE: Este interceptor se aplica automáticamente a todas las peticiones HTTP
 * cuando se registra en app.config.ts con provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(Auth);

  // Clonar la petición y añadir withCredentials para enviar cookies
  // (solo para peticiones a la API de rund-api)
  const clonedReq = req.url.includes('localhost:3000') || req.url.includes('/api/')
    ? req.clone({ withCredentials: true })
    : req;

  // Continuar con la petición y capturar errores
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Error 401: No autenticado o sesión expirada
        console.warn('Sesión expirada o no autenticada. Redirigiendo a login...');

        // Limpiar estado de autenticación
        authService.logout().subscribe();

        // Redirigir a login con returnUrl
        const returnUrl = router.url;
        router.navigate(['/login'], {
          queryParams: { returnUrl }
        });
      } else if (error.status === 403) {
        // Error 403: Acceso denegado (falta de permisos)
        console.warn('Acceso denegado. El usuario no tiene permisos suficientes.');
        router.navigate(['/acceso-denegado']);
      } else if (error.status === 0) {
        // Error de red o CORS
        console.error('Error de conexión con el servidor:', error);
      }

      // Re-lanzar el error para que los componentes puedan manejarlo también
      return throwError(() => error);
    })
  );
};
