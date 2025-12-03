import { ChangeDetectorRef, Component, effect, inject, input, InputSignal, OnDestroy, output, OutputEmitterRef } from '@angular/core';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DatoArchivo } from '@servicios/data';
import { lastValueFrom } from 'rxjs';

interface ListaArchivos {
  nombre: string;
  tipo: string;
  fechaCreacion: string;
  fechaModificacion: string;
  uuid: string;
};

@Component({
  selector: 'mgp-borra-documentos',
  imports: [
    PrimengModule,
    PipesModule,
  ],
  templateUrl: './borra-documentos.html',
  styleUrl: './borra-documentos.scss',
})
export class BorraDocumentos implements OnDestroy {
  profesor: InputSignal<any> = input<any>();
  archivos: InputSignal<DatoArchivo[]> = input<DatoArchivo[]>([]);
  finEliminar: OutputEmitterRef<void> = output();
  private dataServicio: Data = inject(Data);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private labels: { [key: string]: string } = this.dataServicio.labels;
  listaArchivos: ListaArchivos[] = [];
  archivosBorrar: ListaArchivos[] = [];
  dataVisible: boolean = false;
  eliminando: boolean = false;
  textoBotonEliminar: string = 'Confirmar eliminación';
  constructor() {
    effect(async () => this.cargaDatos());
  }
  async cargaDatos(): Promise<void> {
    this.dataVisible = false;
    const profesorActual: any = this.profesor();
    const archivosActuales: DatoArchivo[] = this.archivos();
    const cedula: string = profesorActual.DOCUMENTO_DE_IDENTIDAD;
    this.listaArchivos = [];
    archivosActuales.forEach(async (val: DatoArchivo) => {
      const consulta: any = await this.dataServicio.getArchivoProfesorUuid(cedula, val.nombre);
      let tipo: string = consulta.propiedades.path.replace('/okm:root/RUND/DOCENTES/HOJAS_DE_VIDA/' + cedula + '/', '').replace('/' + val.nombre, '');
      if (tipo == val.nombre) tipo = 'CEDULA';
      this.labels['CEDULA'] = 'Documento de identidad';
      const fechaOpciones: any = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      };
      const fecha: { created: string, modified: string } = {
        created: new Date(consulta.propiedades.created).toLocaleDateString('es-CO', fechaOpciones) + ' ' +
          new Date(consulta.propiedades.created).toLocaleTimeString(),
        modified: new Date(consulta.propiedades.lastModified).toLocaleDateString('es-CO', fechaOpciones) + ' ' +
          new Date(consulta.propiedades.lastModified).toLocaleTimeString(),
      };
      this.listaArchivos.push({
        nombre: val.nombre,
        tipo: this.labels[tipo],
        uuid: consulta.uuid,
        fechaCreacion: fecha.created,
        fechaModificacion: fecha.modified
      });
      this.cdr.detectChanges();
    });
    await this.pausa();
    this.archivosBorrar = JSON.parse(JSON.stringify(this.listaArchivos));
    this.dataVisible = true;
    this.cdr.detectChanges();
  }
  async eliminaDocumentos(): Promise<void> {
    this.textoBotonEliminar = 'Eliminando...';
    this.eliminando = true;
    const shadowArchivos: ListaArchivos[] = JSON.parse(JSON.stringify(this.archivosBorrar));
    for (let i: number = 0; i < shadowArchivos.length; i++) {
      const archivo: ListaArchivos = shadowArchivos[i];
      const res: any = await lastValueFrom(this.dataServicio.deleteFile(archivo.uuid));
      if (res.eliminado) {
        const posBorrar: number = this.archivosBorrar.findIndex((a: ListaArchivos) => a.uuid === archivo.uuid);
        const posLista: number = this.listaArchivos.findIndex((a: ListaArchivos) => a.uuid === archivo.uuid);
        this.archivosBorrar.splice(posBorrar, 1);
        this.listaArchivos.splice(posLista, 1);
      }
      this.cdr.detectChanges();
    }
    this.eliminando = false;
    this.textoBotonEliminar = 'Confirmar eliminación';
    this.cdr.detectChanges();
    this.finEliminar.emit();
  }
  private async pausa(ms: number = 500): Promise<boolean> {
    return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms));
  }
  ngOnDestroy(): void {
    this.listaArchivos = [];
    this.archivosBorrar = [];
    this.dataVisible = false;
    this.eliminando = false;
  }
}
