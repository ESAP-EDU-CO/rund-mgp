import { Routes } from '@angular/router';
import { Gestion } from '@vistas/gestion/gestion';
import { Consultas } from '@vistas/consultas/consultas';
import { Dashboard } from '@vistas/dashboard/dashboard';
import { Certificados } from '@vistas/certificados/certificados';
import { Herramientas } from '@vistas/herramientas/herramientas';
import { Listados } from '@vistas/listados/listados';
import { Validacion } from '@vistas/validacion/validacion';
import { Login } from '@componentes/login/login';

export const routes: Routes = [
  { path: '', redirectTo: 'listados', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'consultas', component: Consultas },
  { path: 'listados', component: Listados },
  { path: 'certificados', component: Certificados },
  { path: 'gestion', component: Gestion },
  { path: 'herramientas', component: Herramientas },
  { path: 'validacion', component: Validacion },
  { path: '**', redirectTo: 'listados', pathMatch: 'full' },
];
