import { ChangeDetectorRef, Component, effect, inject, input, InputSignal, OnDestroy, output, OutputEmitterRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Data, DatoArchivo } from '@servicios/data';
import { FileServicio } from '@servicios/file';
import { PrimengModule } from "@modulos/primeng/primeng-module";
import { BorraDocumentos } from '../borra-documentos/borra-documentos';
import { Reemplazo } from '@vistas/gestion/reemplazo/reemplazo';
import { LoggerService } from '@servicios/logger.service';

type Modo = 'watch' | 'download';
interface DescargaResponse {
  blob: Blob;
  blobUrl: string | undefined;
  pdfUrl: SafeResourceUrl | undefined;
  error: any;
}
interface ListaDescarga {
  nombre: string;
  blob: Blob | undefined;
  descargado: boolean;
}

@Component({
  selector: 'mgp-download-preview',
  imports: [
    PrimengModule,
    BorraDocumentos,
    Reemplazo,
  ],
  templateUrl: './download-preview.html',
  styleUrl: './download-preview.scss'
})
export class DownloadPreview implements OnDestroy {
  profesor: InputSignal<any> = input<any>();
  archivos: InputSignal<DatoArchivo[]> = input<DatoArchivo[]>([]);
  modo: InputSignal<Modo> = input<Modo>('watch');
  cerrar: OutputEmitterRef<void> = output();
  private dataServicio: Data = inject(Data);
  private fileServicio: FileServicio = inject(FileServicio);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private logger = inject(LoggerService);
  private blobUrl: string | undefined;
  private formatos: any = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
  }
  private labels: Record<string, string> = this.dataServicio.labels;
  uuid?: string;
  propiedades: { clave: string, valor: string }[] = [];
  pdfUrl: SafeResourceUrl | undefined;
  textoError = '';
  archivosDescarga: ListaDescarga[] = [];
  constructor() {
    effect(async () => {
      const profesorActual: any = this.profesor();
      const archivosActuales: DatoArchivo[] = this.archivos();
      const modoActual: Modo = this.modo();
      this.pdfUrl = undefined;
      this.propiedades = [];
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = undefined;
      }
      if (profesorActual && archivosActuales && archivosActuales.length > 0) {
        const cedula: string = profesorActual.DOCUMENTO_DE_IDENTIDAD;
        switch (modoActual) {
          case 'watch': {
            const nombre: string = archivosActuales[0].nombre;
            try {
              const consulta: any = await this.dataServicio.getArchivoProfesorUuid(cedula, nombre);
              if (consulta.uuid && !consulta.error) {
                this.uuid = consulta.uuid;
                let tipo: string = consulta.propiedades.path.replace('/okm:root/RUND/DOCENTES/HOJAS_DE_VIDA/' + cedula + '/', '').replace('/' + nombre, '');
                if (tipo == nombre) tipo = 'CEDULA';
                this.labels['CEDULA'] = 'Documento de identidad';
                const peso: string = (consulta.propiedades.size / 1024) < 1024 ?
                  (consulta.propiedades.size / 1024).toFixed(2) + ' KB' :
                  ((consulta.propiedades.size / 1024) / 1024).toFixed(2) + ' MB';
                const fechaOpciones: any = {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                };
                const fecha: { created: string, modified: string } = {
                  created: new Date(consulta.propiedades.created).toLocaleDateString('es-CO', fechaOpciones) + ' ' +
                    new Date(consulta.propiedades.created).toLocaleTimeString(),
                  modified: new Date(consulta.propiedades.lastModified).toLocaleDateString('es-CO', fechaOpciones) + ' ' +
                    new Date(consulta.propiedades.lastModified).toLocaleTimeString(),
                };
                this.propiedades = [
                  { clave: 'Nombre del documento:', valor: consulta.nombre_archivo },
                  { clave: 'Tipo de documento:', valor: this.labels[tipo] },
                  { clave: 'Formato:', valor: this.formatos[consulta.propiedades.mimeType] || 'No identificado' },
                  { clave: 'Tamaño:', valor: peso },
                  { clave: 'Fecha de creación:', valor: fecha.created },
                  { clave: 'Última modificación:', valor: fecha.modified },
                ];
                this.cdr.detectChanges();
                const descarga: DescargaResponse = await this.descargaArchivo(consulta.uuid);
                if (descarga.blobUrl && descarga.pdfUrl) {
                  this.blobUrl = descarga.blobUrl;
                  this.pdfUrl = descarga.pdfUrl;
                  this.textoError = '';
                  this.cdr.detectChanges();
                }
              } else {
                this.logger.error(consulta.error);
                this.textoError = consulta.error;
              }
            } catch (error) {
              this.logger.error(error);
              this.textoError = error as string;
            }
            break;
          }
          case 'download': {
            this.archivosDescarga = archivosActuales.map((archivo: DatoArchivo) => ({ nombre: archivo.nombre, blob: undefined, descargado: false }));
            this.archivosDescarga.forEach(async (archivoEnDescaga: ListaDescarga, index: number) => {
              try {
                const consulta: any = await this.dataServicio.getArchivoProfesorUuid(cedula, archivoEnDescaga.nombre);
                if (consulta.uuid && !consulta.error) {
                  const descarga: DescargaResponse = await this.descargaArchivo(consulta.uuid);
                  if (!descarga.error) this.archivosDescarga[index].blob = descarga.blob;
                  this.cdr.detectChanges();
                } else {
                  this.logger.error(consulta.error);
                }
              } catch (error) {
                this.logger.error(error);
                this.textoError = error as string;
              }
            });
            await this.pausa();
            if (this.archivosDescarga.length === 1 && this.archivosDescarga[0]?.blob) {
              this.fileServicio.descarga(this.archivosDescarga[0].blob, this.archivosDescarga[0].nombre);
              this.archivosDescarga[0].descargado = true;
            }
            if (this.archivosDescarga.length > 1) {
              this.archivosDescarga.forEach(async (a: ListaDescarga, i: number) => {
                this.archivosDescarga[i].descargado = true;
                this.cdr.detectChanges();
                await this.pausa();
              });
              const zip: Blob = await this.fileServicio.creaZipDesdeBlobs(this.archivosDescarga);
              this.logger.log(zip);
              const fecha: string = new Date().toLocaleDateString().replace(/\//g, '');
              this.fileServicio.descarga(zip, cedula + '-documentacion-' + fecha + '.zip');
            }
            this.textoError = '';
            this.cdr.detectChanges();
            this.cerrar.emit();
            break;
          }
        }
      }
    });
  }
  async descargaPreview(): Promise<void> {
    const descarga: DescargaResponse = await this.descargaArchivo(this.uuid as string);
    this.fileServicio.descarga(descarga.blob, this.archivos()[0].nombre);
  }
  async descargaArchivo(uuid: string): Promise<DescargaResponse> {
    const consulta: Blob = await this.dataServicio.getArchivo(uuid);
    if (consulta.type == 'application/pdf') {
      const blobUrl: string = URL.createObjectURL(consulta);
      const pdfUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      return { blob: consulta, blobUrl: blobUrl, pdfUrl: pdfUrl, error: undefined };
    }
    if (consulta.type != 'application/json') return { blob: consulta, blobUrl: undefined, pdfUrl: undefined, error: undefined };
    this.logger.error('ERROR: ', consulta);
    return { blob: consulta, blobUrl: undefined, pdfUrl: undefined, error: consulta };
  }
  private async pausa(ms = 500): Promise<boolean> {
    return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms));
  }
  ngOnDestroy(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = undefined;
    }
  }
}
