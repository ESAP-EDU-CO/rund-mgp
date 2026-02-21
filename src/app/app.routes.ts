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
    path: 'validacion',
    loadComponent: () => import('@vistas/validacion/validacion').then(m => m.Validacion),
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
    path: 'certificados',
    loadComponent: () => import('@vistas/certificados/certificados').then(m => m.Certificados),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('@vistas/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'consultas',
    loadComponent: () => import('@vistas/consultas/consultas').then(m => m.Consultas),
    canActivate: [authGuard],
  },

  // Rutas protegidas con adminGuard (solo administradores)
  {
    path: 'gestion',
    loadComponent: () => import('@vistas/gestion/gestion').then(m => m.Gestion),
    canActivate: [adminGuard],
  },
  {
    path: 'herramientas',
    loadComponent: () => import('@vistas/herramientas/herramientas').then(m => m.Herramientas),
    canActivate: [adminGuard],
  },

  { path: '**', redirectTo: 'listados', pathMatch: 'full' },
];
