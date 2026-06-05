import { Routes } from '@angular/router';
import { authGuard, adminGuard } from '@compartidos/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'listados', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('@componentes/login/login').then(m => m.Login),
  },
  {
    path: 'acceso-denegado',
    loadComponent: () => import('@componentes/acceso-denegado/acceso-denegado').then(m => m.AccesoDenegado),
  },

  // Rutas protegidas con authGuard (cualquier usuario autenticado)
  {
    path: 'listados',
    loadComponent: () => import('@vistas/listados/listados').then(m => m.Listados),
    canActivate: [authGuard],
  },
  {
    path: 'extraccion',
    loadComponent: () => import('@vistas/extraccion/extraccion').then(m => m.Extraccion),
    canActivate: [authGuard],
  },

  // Rutas protegidas con adminGuard (solo administradores)
  {
    path: 'gestion',
    loadComponent: () => import('@vistas/gestion/gestion').then(m => m.Gestion),
    canActivate: [adminGuard],
  },

  { path: '**', redirectTo: 'listados', pathMatch: 'full' },
];
