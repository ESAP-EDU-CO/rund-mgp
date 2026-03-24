/**
 * RUND MGP - Servicio de Configuración
 *
 * Servicio que se inicializa al arranque de la aplicación para cargar
 * la configuración dinámica desde /api/config (servidor).
 *
 * Este servicio debe inicializarse ANTES que cualquier otro servicio
 * que necesite usar las URLs de la API.
 *
 * @author ESAP Development Team / Oliver Castelblanco Martínez
 * @version 1.0
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiBaseUrl: string;
  environment: string;
  version: string;
  devFakeLogin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private config: AppConfig | null = null;
  private loaded = false;

  /**
   * Obtiene la configuración actual
   * Si no está cargada, retorna valores por defecto
   */
  getConfig(): AppConfig {
    if (!this.config) {
      // Valores por defecto en caso de que no se haya cargado
      return {
        apiBaseUrl: 'http://localhost:3000',
        environment: 'development',
        version: '1.0.0'
      };
    }
    return this.config;
  }

  /**
   * Obtiene la URL base de la API
   */
  getApiBaseUrl(): string {
    return this.config?.apiBaseUrl || 'http://localhost:3000';
  }

  /**
   * Verifica si la configuración ya fue cargada
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Carga la configuración desde el servidor
   * Este método debe ser llamado al inicio de la aplicación
   */
  async loadConfig(): Promise<void> {
    if (this.loaded) {
      return; // Ya está cargada, no hacer nada
    }

    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>('/api/config')
      );

      this.config = config;
      this.loaded = true;

      // console.log('[ConfigService] Configuración cargada:', config);
    } catch (error) {
      console.error('[ConfigService] Error al cargar configuración:', error);

      // Usar valores por defecto en caso de error
      this.config = {
        apiBaseUrl: 'http://localhost:3000',
        environment: 'development',
        version: '1.0.0'
      };
      this.loaded = true;
    }
  }
}
