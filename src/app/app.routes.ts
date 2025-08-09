import { Routes } from '@angular/router';
import { Carga } from '@vistas/carga/carga';
import { Consultas } from '@vistas/consultas/consultas';
import { Dashboard } from '@vistas/dashboard/dashboard';
import { Documentos } from '@vistas/documentos/documentos';
import { Herramientas } from '@vistas/herramientas/herramientas';
import { Listados } from '@vistas/listados/listados';
import { Validacion } from '@vistas/validacion/validacion';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'consultas', component: Consultas },
  { path: 'listados', component: Listados },
  { path: 'documentos', component: Documentos },
  { path: 'carga', component: Carga },
  { path: 'herramientas', component: Herramientas },
  { path: 'validacion', component: Validacion },
  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' },
];
