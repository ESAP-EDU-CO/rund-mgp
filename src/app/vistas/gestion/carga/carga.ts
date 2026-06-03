import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Data, ListadoProps, ArchivoDocente, DatosProfesor } from '@servicios/data';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { FichaDocente } from '@componentes/ficha-docente/ficha-docente';
import { CargaDocumento } from '@componentes/carga-documento/carga-documento';

interface Docentes {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'mgp-carga',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PrimengModule,
    FichaDocente,
    CargaDocumento,
  ],
  providers: [MessageService],
  templateUrl: './carga.html',
  styleUrl: './carga.scss'
})

export class Carga implements OnInit {
  profesoresFiltrados: Docentes[] = [];
  docentesOptions: Docentes[] = [];
  arrayCSV: any[] = [];
  columnasCSV: string[] = [];
  rawCSV = '';
  //*
  labelsCSV: string[] = []; // La primera línea de arrayCSV, que contiene las etiquetas
  profesorSeleccionado: string[] = []; // La fila de arrayCSV que corresponde al docente seleccionado
  clavesCSV: string[] = ['Vinculación', 'Nombre completo', 'Territorial', 'Categoría', 'Nivel de Formación']; // Las etiquetas que se mostrarán en la ficha del docente
  datosValidados: string[] = []; // Indica si los datos del docente han sido validados y se puede iniciar la carga de documentos
  fechaNacimiento: string | null = null;
  archivosYaCargados: number[] = []; // Index de los archivos que ya ha sido cargados en el backend, que se le indican a CargaDocumento para que los marque como OK
  infoProfesor: DatosProfesor | undefined;
  //*/
  selectedDocentes = '';
  selectedActivos = '';
  selectedVinculados = '';
  formulario: FormGroup;
  loading = false;
  uploadedFiles: any[] = [];
  readonly MAX_FILES = 50;
  private dataServicio = inject(Data);
  private messageService = inject(MessageService);
  @ViewChild(CargaDocumento) private cargaDoc!: CargaDocumento;
  constructor() {
    this.formulario = new FormGroup({
      cedula: new FormControl('', Validators.required),
      docente: new FormControl('NA'),
      activo: new FormControl('NA'),
      vinculados: new FormControl('NA')
    });
  }
  ngOnInit() {
    this.cargarCsvDocentes();
  }
  cargarCsvDocentes(): void {
    const parametros = {
      categoria: 'Listados',
      tipo: 'Listado de docentes',
      nombre: 'ListadoGeneralDocente',
      formato: 'CSV',
      extension: '.csv'
    };
    this.dataServicio.getCsvData(parametros)
      .subscribe({
        next: (response: any) => {
          this.arrayCSV = response.csv.arrayCSV;
          this.labelsCSV = this.arrayCSV.shift();
          this.docentesOptions = this.arrayCSV.map((fila: string[]) => {
            return {
              value: fila[1],
              viewValue: fila[3]
            } as Docentes;
          });
        },
        error: (error: any) => console.error('Error al obtener el CSV:', error)});
  }
  filterProfesores(event: any) {
    const query = event.query.toLowerCase();
    this.profesoresFiltrados = this.docentesOptions.filter(option =>
      option.viewValue.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }
  //*
  async selectProfesor(event: any): Promise<void> { // Cuando el docente es seleccionado
    this.profesorSeleccionado = this.arrayCSV.filter(fila => fila[1] === event.value.value)[0];
    this.infoProfesor = await this.dataServicio.getInfoProfesor(this.profesorSeleccionado[1]);
    this.limpiaLista();
    
  }
  async submitArchivos(archivos: ArchivoDocente[], numCarga = 0): Promise<void> {
    /**
     * Cada payload está compuesto por el archivo (tipo File) y un objeto 'propiedades' con la forma {label:string, valor:any} que, a su vez, contiene los nodos:
     * - taxonomia: string Ruta de la carpeta del documento (vacía si es la cédula)
     * - tipo: string La carpeta donde se almacenó el documento originalmente (archivo.tipo), o 'cedula' si es la cédula.
     * - formato: string Formato del documento, tal como viene en archivo.formato.
     * - origen: string Origen del documento, tal como viene en archivo.origen.
     * - categorias: string[] Las categorías a las que pertenece el documento siempre y cuando sea la cédula (el array datosValidados); de resto debe ser [].
     * - esCedula: boolean Indica si el documento es la cédula o no
     * - cedula: string El valor de la cédula del profesor, que será la carpeta raíz donde se almacenará el documento
    */
    if (numCarga >= archivos.length) {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Todos los archivos han sido subidos.' });
      return;
    }
    const archivo = archivos[numCarga];
    const propiedades: ListadoProps[] = [
      { label: 'taxonomia', valor: archivo.esCedula ? '' : archivo.tipo }, // Si es la cédula, no hay subcarpeta, de lo contrario, se usa el tipo del archivo
      { label: 'tipo', valor: archivo.esCedula ? 'cedula' : archivo.tipo }, // Si es la cédula, se usa 'cedula', de lo contrario, se usa el tipo del archivo
      { label: 'formato', valor: archivo.formato },
      { label: 'origen', valor: archivo.origen },
      { label: 'categorias', valor: archivo.esCedula ? this.datosValidados || [] : [] },
      { label: 'esCedula', valor: archivo.esCedula || false },
      { label: 'cedula', valor: this.profesorSeleccionado[1] || 'NA' },
      { label: 'fecha_nacimiento', valor: archivo.esCedula ? (this.fechaNacimiento || '') : '' },
    ];
    try {
      this.dataServicio.postCargaFiles(propiedades, archivo.archivo)
        .subscribe({
          next: (respuesta: any) => {
            if (respuesta.error) {
              console.error(`Error al subir el archivo ${archivo.archivo.name}:`, respuesta.error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error de carga',
                detail: `No se pudo subir el archivo ${archivo.archivo.name}.`
              });
            } else {
              this.archivosYaCargados.push(numCarga);
              
            }
            this.submitArchivos(archivos, numCarga + 1);
          },
          error: (error: any) => {
            console.error(`Error al subir el archivo ${archivo.archivo.name}:`, error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error de carga',
              detail: `No se pudo subir el archivo ${archivo.archivo.name}.`
            });
            this.submitArchivos(archivos, numCarga + 1);
          }
        });
    } catch (error) {
      console.error('Se cometió un error al preparar la carga del archivo:', error);
      this.submitArchivos(archivos, numCarga + 1);
    }
  }
  onFechaNacimiento(fecha: string | null): void {
    this.fechaNacimiento = fecha;
  }
  limpiaLista(): void {
    this.archivosYaCargados = [];
    
  }
  todosCargados(): void {
    if (this.profesorSeleccionado[1]) {
      this.dataServicio.archivosCargados$.next(this.profesorSeleccionado[1]);
    }
    setTimeout(() => this.cargaDoc?.limpiar(), 1500);
  }
  //*/
  onUpload(event: any) {
    for (const file of event.files) {
      this.uploadedFiles.push(file);
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Archivo Cargado',
      detail: 'Archivo(s) cargado(s) correctamente'
    });
  }
  async uploadSingleFile(file: File, formValues: any): Promise<any> {
    const formData = new FormData();
    Object.keys(formValues).forEach(key => {
      formData.append(key, formValues[key]);
    });
    formData.append('file', file);

    const propiedades: any = {
      cedula: formValues.cedula || 'NA',
      taxonomia: 'NOMBRE_DE_LA_CARPETA', // Nombre de la carpeta en la que debe ir el documento, dentro de la carpeta principal del profesor
      categorias: this.datosValidados,
      tipoDocumento: 'cedula'
    };

    return this.dataServicio.postCargaFiles(propiedades, file);
  }
  async onSubmit() {
    if (this.formulario.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.loading = true;

    const formValues = {
      cedula: this.formulario.get('cedula')?.value || 'NA'
    };

    try {
      const uploadPromises = this.uploadedFiles.map(file =>
        this.uploadSingleFile(file, formValues)
      );

      await Promise.all(uploadPromises);
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivos subidos correctamente'
      });
      this.resetForm();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Error al subir los archivos: ${error.message}`
      });
    } finally {
      this.loading = false;
    }
  }
  resetForm() {
    this.uploadedFiles = [];
  }
  onError(_event: any) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar el archivo'
    });
  }
  removeFile(event: any) {
    const index = this.uploadedFiles.indexOf(event.file);
    this.uploadedFiles.splice(index, 1);
  }
}