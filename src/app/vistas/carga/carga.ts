import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { data } from '../../../../public/data/docentes.json';
import { PrimengModule } from '@modulos/primeng/primeng-module';

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
  ],
  providers: [MessageService],
  templateUrl: './carga.html',
  styleUrl: './carga.scss'
})

export class Carga implements OnInit {
  profesoresFiltrados: Docentes[] = [];
  cedula: Docentes[] = data.cedula;
  docentes: Docentes[] = data.docentes;
  activos: Docentes[] = data.activos;
  vinculados: Docentes[] = data.vinculados;

  selectedDocentes: string = '';
  selectedActivos: string = '';
  selectedVinculados: string = '';

  formulario: FormGroup;
  loading: boolean = false;
  uploadedFiles: any[] = [];
  readonly MAX_FILES = 50;

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {
    this.formulario = new FormGroup({
      cedula: new FormControl('', Validators.required),
      docente: new FormControl('NA'),
      activo: new FormControl('NA'),
      vinculados: new FormControl('NA')
    });
  }

  ngOnInit() { }

  filterProfesores(event: any) {
    const query = event.query.toLowerCase();
    this.profesoresFiltrados = this.cedula.filter(option =>
      option.viewValue.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
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

    return this.http.post(
      'http://localhost:3000/api/openkm/add-document',
      formData
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
      cedula: this.formulario.get('cedula')?.value || 'NA',
      docente: this.formulario.get('docente')?.value || 'NA',
      activo: this.formulario.get('activo')?.value || 'NA',
      vinculados: this.formulario.get('vinculados')?.value || 'NA'
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
    this.formulario.reset({
      cedula: '',
      docente: 'NA',
      activo: 'NA',
      vinculados: 'NA'
    });
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