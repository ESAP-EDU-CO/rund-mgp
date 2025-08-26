import { Component } from '@angular/core';
import { AdminFirmas } from '@componentes/admin-firmas/admin-firmas';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { ExtraeDatos } from "@componentes/extrae-datos/extrae-datos";

type Herramienta = { titulo: string, vinculo: string, descripcion: string, permiso: number };

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
  herramientas: Herramienta[] = [
    {
      titulo: 'Administrador de firmas escaneadas',
      vinculo: 'firmas',
      descripcion: 'Administra las firmas escaneadas de las personas responsables de firmar un documento o certificado en su versión digital.',
      permiso: 0
    },
    {
      titulo: 'Extracción de datos de un documento digitalizado',
      vinculo: 'extraerDatos',
      descripcion: 'Extrae los datos de un documento digitalizado, en formato PDF, JPG o PNG, usando Inteligencia Artifical.',
      permiso: 0
    },
  ];
  actualTool: Herramienta | undefined;
  modalVisible: boolean = false;
  abreHerramienta(vinculo: string): void {
    this.actualTool = this.herramientas.find((h: Herramienta) => h.vinculo === vinculo);
    this.modalVisible = true;
  }
  cierraModal(): void {
    this.modalVisible = false;
  }
}
