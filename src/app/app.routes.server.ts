import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas públicas: pre-renderizadas (buen SEO, cacheables)
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'acceso-denegado',
    renderMode: RenderMode.Prerender,
  },

  // Rutas autenticadas: renderizado en servidor (personalizado, no cacheable)
  {
    path: 'listados',
    renderMode: RenderMode.Server,
  },
  {
    path: 'extraccion',
    renderMode: RenderMode.Server,
  },
  {
    path: 'gestion',
    renderMode: RenderMode.Server,
  },

  // Catch-all: renderizado en cliente
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
