import { ChangeDetectorRef, Component, inject, input, InputSignal, OnDestroy, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DatoArchivo, DatosCarpeta, ListadoProps } from '@servicios/data';
import { FileServicio } from '@servicios/file';
import { LoggerService } from '@servicios/logger.service';

@Component({
  selector: 'mgp-adicion',
  imports: [
    PrimengModule,
    FormsModule,
  ],
  templateUrl: './adicion.html',
  styleUrl: './adicion.scss',
})
export class Adicion implements OnDestroy {
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private fileServicio: FileServicio = inject(FileServicio);
  private dataServicio: Data = inject(Data);
  private logger = inject(LoggerService);
  profesor: InputSignal<any> = input<any>();
  documentos: InputSignal<DatoArchivo[]> = input<DatoArchivo[]>([]);
  finAdicion: OutputEmitterRef<void> = output<void>();
  archivo: File | undefined;
  prevista: { nombre: string, peso: string | undefined, miniaturaURL: string } | undefined;
  categoria?: string;
  esReemplazo = false;
  comentario?: string;
  salida: any;
  mimeTypes: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'WORD_DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'WORD_DOCX',
    'application/vnd.ms-excel': 'EXCEL_XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'EXCEL_XLSX',
    'application/vnd.ms-powerpoint': 'POWERPOINT_PPTX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'POWERPOINT_PPTX',
    'application/vnd.oasis.opendocument.text': 'ODT',
    'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
    'application/vnd.oasis.opendocument.presentation': 'ODP',
    'application/vnd.oasis.opendocument.graphics': 'ODG'
  };
  carpetas: DatosCarpeta[] = [
    { origen: ['DATOS BASICOS'], categoria: 'DATOS_BASICOS', label: 'Datos básicos' },
    { origen: ['TITULOS DE FORMACION', 'FORMACION ACADEMICA'], categoria: 'TITULOS_DE_FORMACION', label: 'Títulos de formación' },
    { origen: ['EXPERIENCIA DOCENTE'], categoria: 'EXPERIENCIA_DOCENTE', label: 'Experiencia docente' },
    { origen: ['EXPERIENCIA LABORAL'], categoria: 'EXPERIENCIA_LABORAL', label: 'Experiencia laboral' },
    { origen: ['EXPERIENCIA INVESTIGATIVA'], categoria: 'EXPERIENCIA_INVESTIGATIVA', label: 'Experiencia investigativa' },
    { origen: ['PRODUCTIVIDAD ACADEMICA', 'PRODUCTIVIDAD INTELECTUAL'], categoria: 'PRODUCTIVIDAD_ACADEMICA', label: 'Productividad académica' },
    { origen: ['DOCUMENTOS INVALIDOS'], categoria: 'DOCUMENTOS_INVALIDOS', label: 'Documentos inválidos' },
    { origen: ['IDIOMAS'], categoria: 'IDIOMAS', label: 'Idiomas' },
    { origen: ['FORMACION NO FORMAL ADICIONAL'], categoria: 'FORMACION_NO_FORMAL_ADICIONAL', label: 'Formación no formal adicional' },
    { origen: ['ESTUDIO DE HOJA DE VIDA'], categoria: 'ESTUDIO_DE_HOJA_DE_VIDA', label: 'Estudio de hoja de vida' },
    { origen: ['DOCUMENTOS ADICIONALES'], categoria: 'DOCUMENTOS_ADICIONALES', label: 'Documentos adicionales' },
  ];
  async selecciona(ev: any): Promise<void> {
    this.archivo = ev.currentFiles[0];
    const nombre: string = this.archivo?.name as string;
    let miniaturaURL = '';
    let peso = '';
    if (this.archivo) {
      peso = this.archivo?.size < (1024 * 1024) ?
        (this.archivo?.size / 1024).toFixed(2) + ' KB' :
        (this.archivo?.size / (1024 * 1024)).toFixed(2) + ' MB';
      miniaturaURL = this.archivo?.type === 'application/pdf' ?
        await this.fileServicio.generaMiniaturaPDF(this.archivo, 240) :
        URL.createObjectURL(this.archivo);
    }
    this.prevista = {
      nombre: nombre,
      peso: peso,
      miniaturaURL: miniaturaURL,
    };
    this.validaReemplazo();
    this.cdr.detectChanges();
  }
  elimina(): void {
    this.prevista = undefined;
    this.archivo = undefined;
    this.categoria = undefined;
    this.esReemplazo = false;
    this.cdr.detectChanges();
  }
  validaReemplazo(): void {
    const archivos: DatoArchivo[] = this.documentos();
    if (archivos.find((archivo: DatoArchivo) => {
      return archivo.nombre == this.archivo?.name && archivo.formato == this.mimeTypes[this.archivo?.type as string];
    })) {
      this.esReemplazo = true;
    }
  }
  async adicion(): Promise<void> {
    const cedula: string = this.profesor()['DOCUMENTO_DE_IDENTIDAD'] as string;
    if (this.esReemplazo) {
      const resp: any = await this.dataServicio.getArchivoProfesorUuid(cedula, this.archivo?.name as string);
      if (!resp.success) {
        this.salida = { error: true, mensaje: 'El documento original no se encontró en el repositorio' };
        this.cdr.detectChanges();
        return;
      }
      try {
        const response: any = await this.dataServicio.reemplazaArchivo(
          resp.uuid,
          this.archivo?.name as string,
          this.archivo as File,
          this.comentario as string,
        );
        if (response.success) {
          this.salida = { error: false, mensaje: 'El documento se ha reemplazado correctamente en el repositorio' };
          this.finAdicion.emit();
          this.elimina();
        }
      } catch (error: any) {
        this.salida = { error: true, mensaje: error.error.error + ': ' + error.message };
        this.cdr.detectChanges();
      };
      return;
    }
    const propiedades: ListadoProps[] = [
      { label: 'cedula', valor: cedula },
      { label: 'tipo', valor: this.categoria },
      { label: 'formato', valor: this.mimeTypes[this.archivo?.type as string] },
      { label: 'taxonomia', valor: this.categoria },
      { label: 'origen', valor: 'ONEDRIVE_ESAP' },
      { label: 'esCedula', valor: false },
      { label: 'categorias', valor: [] },
    ];
    this.dataServicio.postCargaFiles(propiedades, this.archivo as File).subscribe((resp: any) => {
      this.logger.log(resp);
      if (resp.success) {
        this.salida = { error: false, mensaje: 'El documento se ha cargado correctamente en el repositorio' };
        this.finAdicion.emit();
        this.elimina();
      }
    });
  }
  ngOnDestroy(): void {
    this.salida = undefined;
  }
}
