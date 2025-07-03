import { Component } from '@angular/core';
import { AdminFirmas } from '@componentes/admin-firmas/admin-firmas';
import { PrimengModule } from '@modulos/primeng/primeng-module';

type Herramienta = { titulo: string, vinculo: string, descripcion: string, permiso: number };

@Component({
  selector: 'mgp-herramientas',
  imports: [
    PrimengModule,
    AdminFirmas,
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
