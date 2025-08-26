import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data } from '@servicios/data';


type Info = { label: string, value: string };
type Payload = { tipoDocumento: string, datosExtraer: string[] };

interface Documento {
  label: string;
  value: string;
  campos: Info[];
}

@Component({
  selector: 'mgp-extrae-datos',
  imports: [
    PrimengModule,
    PipesModule,
    FormsModule,
  ],
  templateUrl: './extrae-datos.html',
  styleUrl: './extrae-datos.scss'
})
export class ExtraeDatos {
  private dataServicio: Data = inject(Data);
  listaDocumentos: Documento[] = [
    {
      label: 'Documento de identidad',
      value: 'documento_identidad',
      campos: [
        { label: 'Nombres', value: 'nombres' },
        { label: 'Apellidos', value: 'apellidos' },
        { label: 'Número de documento', value: 'numero_documento' },
        { label: 'Fecha de nacimiento', value: 'fecha_nacimiento' },
        { label: 'Fecha de expedición', value: 'fecha_expedicion' },
        { label: 'Lugar de nacimiento', value: 'lugar_nacimiento' },
        { label: 'Lugar de expedición', value: 'lugar_expedicion' }
      ]
    },
    {
      label: 'Hoja de vida',
      value: 'hoja_vida',
      campos: [
        { label: 'Datos personales', value: 'datos_personales' },
        { label: 'Formación académica', value: 'formacion_academica' },
        { label: 'Experiencia laboral', value: 'experiencia_laboral' },
        { label: 'Idiomas', value: 'idiomas' },
        { label: 'Referencias', value: 'referencias' }
      ]
    },
    {
      label: 'Certificado de experiencia laboral',
      value: 'certificado_experiencia_laboral',
      campos: [
        { label: 'Empleado', value: 'empleado' },
        { label: 'Empresa', value: 'empresa' },
        { label: 'Experiencia', value: 'experiencia' }
      ]
    },
    {
      label: 'Certificado de experiencia docente',
      value: 'certificado_experiencia_docente',
      campos: [
        { label: 'Docente', value: 'docente' },
        { label: 'Institución', value: 'institucion' },
        { label: 'Experiencia docente', value: 'experiencia_docente' }
      ]
    },
    {
      label: 'Artículo de productividad',
      value: 'articulo_productividad',
      campos: [
        { label: 'Artículo', value: 'articulo' },
        { label: 'Clasificación', value: 'clasificacion' }
      ]
    },
    {
      label: 'Certificado de investigación',
      value: 'certificado_investigacion',
      campos: [
        { label: 'Investigador', value: 'investigador' },
        { label: 'Proyecto', value: 'proyecto' },
        { label: 'Clasificación', value: 'clasificacion' }
      ]
    },
    {
      label: 'Certificado de idiomas',
      value: 'certificado_idiomas',
      campos: [
        { label: 'Estudiante', value: 'estudiante' },
        { label: 'Certificación', value: 'certificacion' },
        { label: 'Habilidades', value: 'habilidades' }
      ]
    },
    {
      label: 'Certificado de estudios no formales',
      value: 'certificado_estudios_no_formales',
      campos: [
        { label: 'Participante', value: 'participante' },
        { label: 'Curso', value: 'curso' },
        { label: 'Institución', value: 'institucion' },
        { label: 'Certificación', value: 'certificacion' }
      ]
    }
  ];
  datos!: Documento;
  documento!: File;
  respuestaIA: any;
  choose(event: any, callback: any): void {
    callback();
  }
  seleccionaDocumento(ev: any): void {
    this.documento = ev.currentFiles[0] as File;
  }
  enviaDocumento(ev: any): void {
    if (this.datos && this.documento) {
      const salida: Payload = this.transforma();
      this.dataServicio
        .extraeDatos('documento', this.documento, salida.tipoDocumento, salida.datosExtraer)
        .subscribe((res: any) => {
          this.respuestaIA = res;
        });
    }
  }
  private transforma(): Payload {
    return {
      tipoDocumento: this.datos.value,
      datosExtraer: this.datos.campos.map((c: Info) => c.value),
    };
  }
}
