import { Injectable, isDevMode } from '@angular/core';

/**
 * Servicio de logging que suprime mensajes informativos en producción.
 * En desarrollo: todos los niveles se muestran en consola.
 * En producción: solo errores críticos (console.error) se muestran.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly isDev = isDevMode();

  log(...args: any[]): void {
    // eslint-disable-next-line no-console
    if (this.isDev) console.log(...args);
  }

  warn(...args: any[]): void {
    if (this.isDev) console.warn(...args);
  }

  error(...args: any[]): void {
    // Los errores siempre se muestran (dev y prod)
    console.error(...args);
  }
}
