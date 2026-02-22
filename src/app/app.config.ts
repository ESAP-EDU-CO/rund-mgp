import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './compartidos/interceptores/auth-interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { ConfigService } from './compartidos/servicios/config.service';

const estilo: any = definePreset(
  Aura, {
  // Aura v21 ya usa azul como color primario por defecto
  components: {
    tree: {
      css: ({ dt }: any) => `
        .p-tree-node-selectable {
          line-break: anywhere;
        }
      `,
    },
    dialog: {
      css: ({ dt }: any) => `
        .p-dialog-content {
          overflow-y: hidden;
        }
      `,
    },
  },
}
);

/**
 * Factory function para inicializar ConfigService
 * Se ejecuta ANTES de que la aplicación arranque
 */
function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }), // Opción A: Zone.js para compatibilidad con PrimeNG
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: estilo
      }
    }),
    // APP_INITIALIZER: Cargar configuración antes de iniciar la app
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    }
  ]
};
