import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset, palette, $dt } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const estilo: any = definePreset(
  Aura, {
  semantic: {
    primary: palette('{blue}')
  },
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: estilo
      }
    }),
  ]
};
