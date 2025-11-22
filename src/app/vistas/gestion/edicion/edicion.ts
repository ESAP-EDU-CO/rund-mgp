import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DatoArchivo, DatosProfesor } from '@servicios/data';

type Profesor = { nombre: string, documentoIdentidad: string };

@Component({
  selector: 'mgp-edicion',
  imports: [
    PipesModule,
    PrimengModule,
    FormsModule,
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
  archivos: DatoArchivo[] = [];
  archivosSeleccionados: DatoArchivo[] = [];
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
      Object.keys(this.profesores).forEach(async (cedula: string) => {
        const archivos: DatoArchivo[] | undefined = await this.getArchivosProfe(cedula);
        if (archivos) this.profesoresFiltrados.push({ nombre: this.profesores[cedula]['NOMBRE_Y_APELLIDO'], documentoIdentidad: cedula });
      });
    });
  }
  filtrarProfesores(ev: any): void {
    const valorFiltro = ev.query.toLowerCase();
    this.profesoresFiltrados = this.profesoresFiltrados.filter((profesor: Profesor) =>
      profesor.nombre.toLowerCase().includes(valorFiltro) ||
      profesor.documentoIdentidad.toLowerCase().includes(valorFiltro)
    );
  }
  async seleccionaProfesor(ev: any): Promise<void> {
    this.profesor = ev.value as Profesor;
    const cedula: string = this.profesor.documentoIdentidad;
    this.archivos = await this.getArchivosProfe(cedula) as DatoArchivo[];
    this.profeSeleccionado = this.profesores[cedula];
    this.cdr.detectChanges();
  }
  accionesArchivos(archivos: DatoArchivo[], accion: 'download' | 'delete' | 'change' | 'add'): void {
    console.log(archivos);
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
  claves(obj: any): string[] {
    return Object.keys(obj);
  }
}
