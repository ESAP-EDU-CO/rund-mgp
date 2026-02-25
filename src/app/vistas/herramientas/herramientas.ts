import { Component, inject } from '@angular/core';
import { AdminFirmas } from '@componentes/admin-firmas/admin-firmas';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { ExtraeDatos } from "@componentes/extrae-datos/extrae-datos";
import { Auth, Rol } from '@servicios/auth';

interface Herramienta { titulo: string, vinculo: string, descripcion: string, rolMinimo: Rol }

@Component({
  selector: 'mgp-herramientas',
  imports: [
    PrimengModule,
    AdminFirmas,
    ExtraeDatos,
  ],
  templateUrl: './herramientas.html',
  styleUrl: './herramientas.scss'
})
export class Herramientas {
  private authServicio: Auth = inject(Auth);
  herramientas: Herramienta[] = [
    {
      titulo: 'Administrador de firmas escaneadas',
      vinculo: 'firmas',
      descripcion: 'Administra las firmas escaneadas de las personas responsables de firmar un documento o certificado en su versión digital.',
      rolMinimo: 'gestor'
    },
    {
      titulo: 'Extracción de datos de un documento digitalizado',
      vinculo: 'extraerDatos',
      descripcion: 'Extrae los datos de un documento digitalizado, en formato PDF, JPG o PNG, usando Inteligencia Artifical.',
      rolMinimo: 'admin'
    },
  ];
  actualTool: Herramienta | undefined;
  modalVisible = false;
  abreHerramienta(vinculo: string): void {
    this.actualTool = this.herramientas.find((h: Herramienta) => h.vinculo === vinculo);
    this.modalVisible = true;
  }
  cierraModal(): void {
    this.modalVisible = false;
  }
  tienePermisos(rolMinimo: Rol): boolean {
    return this.authServicio.tienePermisos(rolMinimo, this.authServicio.usuario()?.rol);
  }
}
