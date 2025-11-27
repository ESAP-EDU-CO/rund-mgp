import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DatoArchivo, DatosProfesor } from '@servicios/data';
import { TreeNode } from 'primeng/api';
import { DownloadPreview } from './download-preview/download-preview';
import { BorraDocumentos } from "./borra-documentos/borra-documentos";

type Profesor = { nombre: string, documentoIdentidad: string };

@Component({
  selector: 'mgp-edicion',
  imports: [
    PipesModule,
    PrimengModule,
    FormsModule,
    DownloadPreview,
    BorraDocumentos
  ],
  templateUrl: './edicion.html',
  styleUrl: './edicion.scss'
})
export class Edicion implements OnInit {
  private dataServicio: Data = inject(Data);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private profesores: any;
  labels: { [key: string]: string } = this.dataServicio.labels;
  profeSeleccionado: any;
  profesoresFiltrados: Profesor[] = [];
  profesor?: Profesor;
  arbolArchivos: TreeNode[] = [];
  archivosSeleccionados: TreeNode[] = [];
  dialogoVisible: boolean = false;
  tipoDialogo: 'download' | 'delete' | 'change' | 'add' | 'watch' = 'download';
  archivos: DatoArchivo[] = [];
  cargandoProfesores: number = 0;
  tituloDialogo: string = '';
  dialogoCerrable: boolean = true;
  modoDocumento: 'watch' | 'download' = 'watch';
  iconoFormato: any = {
    PDF: 'pi-file-pdf',
    XLSX: 'pi-file-excel',
    DOCX: 'pi-file-word',
    JPG: 'pi-image',
    PNG: 'pi-image',
  };
  async ngOnInit(): Promise<void> {
    this.labels['DOCUMENTO_DE_IDENTIDAD'] = 'Documento de identidad';
    this.labels['CEDULA'] = 'Documento de identidad';
    this.dataServicio.getIndiceDocente().subscribe((resp: any) => {
      this.profesores = resp.indice;
      const totalProfesores: number = Object.keys(this.profesores).length;
      this.cargandoProfesores = 0;
      Object.keys(this.profesores).forEach(async (cedula: string, index: number) => {
        this.cargandoProfesores = Math.round(((index + 1) / totalProfesores) * 100);
        this.cdr.detectChanges();
        const archivos: DatoArchivo[] | undefined = await this.getArchivosProfe(cedula);
        if (archivos) this.profesoresFiltrados.push({ nombre: this.profesores[cedula]['NOMBRE_Y_APELLIDO'], documentoIdentidad: cedula });
      });
      this.cargandoProfesores = 100;
      this.cdr.detectChanges();
    });
  }
  filtrarProfesores(ev: any): void {
    const valorFiltro = ev.query.toLowerCase();
    this.profesoresFiltrados = this.profesoresFiltrados.filter((profesor: Profesor) =>
      profesor.nombre.toLowerCase().includes(valorFiltro) ||
      profesor.documentoIdentidad.toLowerCase().includes(valorFiltro)
    );
  }
  seleccionaProfesor(ev: any): void {
    this.profesor = ev.value as Profesor;
    this.obtieneArchivos();
  }
  async obtieneArchivos(): Promise<void> {
    if (this.profesor) {
      const cedula: string = this.profesor.documentoIdentidad;
      const archivos: DatoArchivo[] = await this.getArchivosProfe(cedula) as DatoArchivo[];
      this.arbolArchivos = this.generaArbolArchivos(archivos);
      this.profeSeleccionado = this.profesores[cedula];
      this.cdr.detectChanges();
    }
  }
  accionesArchivos(accion: 'download' | 'delete' | 'change' | 'add' | 'watch'): void {
    this.archivos = this.archivosSeleccionados
      .filter((nodo: TreeNode) => !nodo.children)
      .map((nodo: TreeNode) => nodo.data) as DatoArchivo[];
    this.tipoDialogo = accion;
    switch (accion) {
      case 'watch':
        if (this.archivos.length != 1) return;
        this.tituloDialogo = 'Vista previa del documento';
        this.modoDocumento = accion;
        this.dialogoCerrable = true;
        this.dialogoVisible = true;
        break;
      case 'download':
        this.tituloDialogo = 'Descargando ' + this.archivos.length + ' documento' + (this.archivos.length > 1 ? 's' : '');
        this.modoDocumento = accion;
        this.dialogoCerrable = false;
        this.dialogoVisible = true;
        break;
      case 'delete':
        this.tituloDialogo = 'Eliminando documento' + (this.archivos.length > 1 ? 's' : '');
        this.dialogoCerrable = true;
        this.dialogoVisible = true;
        break;
      default:
    }
  }
  cerrarDialogo(): void {
    this.dialogoVisible = false;
  }
  numSel(): number {
    return this.archivosSeleccionados.filter((nodo: TreeNode) => !nodo.children).length;
  }
  plural(articulo: string | undefined = undefined): string {
    if (articulo) {
      if (articulo === 'el') return this.numSel() > 1 ? 'los' : 'el';
      if (articulo === 'del') return this.numSel() > 1 ? 'de los' : 'del';
      if (articulo === 'la') return this.numSel() > 1 ? 'las' : 'la';
    }
    return this.numSel() > 1 ? 's' : '';
  }
  private async getArchivosProfe(cedula: string): Promise<DatoArchivo[] | undefined> {
    const datosProfesor: DatosProfesor | undefined = await this.dataServicio.getInfoProfesor(cedula);
    return datosProfesor?.archivosProfesor.sort((a: DatoArchivo, b: DatoArchivo) => {
      const aTipo: string = a.tipo.toLowerCase();
      const bTipo: string = b.tipo.toLowerCase();
      if (aTipo < bTipo) return -1;
      if (aTipo > bTipo) return 1;
      return 0;
    });
  }
  private generaArbolArchivos(archivos: DatoArchivo[]): TreeNode[] {
    const raiz: TreeNode[] = [];
    const tiposArchivos: { [key: string]: TreeNode } = {};
    archivos.forEach((archivo: DatoArchivo) => {
      const key: string = '' + Object.keys(tiposArchivos).length;
      if (!tiposArchivos[archivo.tipo]) {
        tiposArchivos[archivo.tipo] = {
          key: key,
          icon: 'pi pi-fw pi-folder',
          label: this.labels[archivo.tipo],
          data: archivo.tipo,
          children: []
        };
        raiz.push(tiposArchivos[archivo.tipo]);
      }
      const subkey: string = tiposArchivos[archivo.tipo].key + '-' + (tiposArchivos[archivo.tipo].children!.length);
      tiposArchivos[archivo.tipo].children!.push({
        key: subkey,
        label: archivo.nombre,
        data: archivo,
        icon: 'pi pi-fw ' + (this.iconoFormato[archivo.formato] || 'pi.file')
      });
    });
    return raiz;
  }
  claves(obj: any): string[] {
    return Object.keys(obj);
  }
}
