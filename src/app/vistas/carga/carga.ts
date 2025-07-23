import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { CommonModule, NgClass } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Data } from '@servicios/data';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { FichaDocente } from '@componentes/ficha-docente/ficha-docente';

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
    NgClass,
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
  rawCSV: string = '';

  //*
  labelsCSV: string[] = []; // La primera línea de arrayCSV, que contiene las etiquetas
  profesorSeleccionado: string[] = []; // La fila de arrayCSV que corresponde al docente seleccionado
  clavesCSV: string[] = ['Vinculación', 'Nombre completo', 'Territorial', 'Categoría', 'Nivel de Formación']; // Las etiquetas que se mostrarán en la ficha del docente
  cdr: ChangeDetectorRef = inject(ChangeDetectorRef); // Para detectar cambios en la vista cuando se usa Angular Zoneless
  datosValidados: string[] = []; // Indica si los datos del docente han sido validados y se puede iniciar la carga de documentos
  //*/

  selectedDocentes: string = '';
  selectedActivos: string = '';
  selectedVinculados: string = '';

  formulario: FormGroup;
  loading: boolean = false;
  uploadedFiles: any[] = [];
  readonly MAX_FILES = 50;

  constructor(
    private dataServicio: Data,
    private messageService: MessageService
  ) {
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

    this.dataServicio.apiGet(this.dataServicio.host + 'getCsvData', parametros)
      .subscribe((response: any) => {
        this.arrayCSV = response.arrayCSV;

        //*
        this.labelsCSV = this.arrayCSV.shift();
        this.cdr.detectChanges();
        //*/

        this.docentesOptions = this.arrayCSV.map((fila: string[]) => {
          return {
            value: fila[1],
            viewValue: fila[3]
          } as Docentes;
        });

      }, error => {
        console.error('Error al obtener el CSV:', error);
      });
  }

  filterProfesores(event: any) {
    const query = event.query.toLowerCase();
    this.profesoresFiltrados = this.docentesOptions.filter(option =>
      option.viewValue.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }
  selectProfesor(event: any): void { // Cuando el docente es seleccionado
    this.profesorSeleccionado = this.arrayCSV.filter(fila => fila[1] === event.value.value)[0];
    this.cdr.detectChanges();
  }

  onUpload(event: any) {
    for (let file of event.files) {
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
      categorias: this.datosValidados,
      tipoDocumento: 'cedula'
    };

    return this.dataServicio.postFile(
      this.dataServicio.host + 'postFile',
      propiedades,
      'cargaDocumento',
      file
    ).toPromise();
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

  onError(event: any) {
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