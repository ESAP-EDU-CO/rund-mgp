import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VistaDatos } from '@componentes/documentos/vista-datos/vista-datos';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, Documento } from '@servicios/data';
import { ConfigService } from '@servicios/config.service';
import { FileServicio } from '@servicios/file';
import { SelectItemGroup } from 'primeng/api';
import { Preview } from "@componentes/documentos/preview/preview";
import { PipesModule } from '@modulos/pipes/pipes-module';
import { Firma, Firmas } from '@servicios/firmas';

export interface Prevista {
  background: string;
  estructura: Documento.Estructura[];
  paddingTop: string;
  plantilla: string;
}

@Component({
  selector: 'mgp-certificados',
  imports: [
    PrimengModule,
    FormsModule,
    VistaDatos,
    Preview,
    PipesModule,
  ],
  templateUrl: './certificados.html',
  styleUrl: './certificados.scss'
})
export class Certificados implements OnInit {
  listaCertificados: SelectItemGroup[] = [];
  certificadoSeleccionado: number[] = [];
  filtros: Documento.Dato[] | undefined;
  columnas: any;
  preview: Prevista | undefined;
  listaFirmas: Firma.Firma[] = [];
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private dataServicio: Data = inject(Data);
  private fileServicio: FileServicio = inject(FileServicio);
  private firmasServicio: Firmas = inject(Firmas);
  private configService = inject(ConfigService);
  ngOnInit(): void {
    this.dataServicio.loadDocumentos().then((resp: boolean) => {
      if (resp) {
        this.listaCertificados = this.dataServicio.documentos.grupos;
        this.cdr.detectChanges();
      }
    });
    this.firmasServicio.getFirmas().subscribe((firmas: Firma.Firma[]) => {
      this.listaFirmas = [];
      if (firmas.length > 0) this.listaFirmas = firmas;
      this.cdr.detectChanges();
    });
  }
  seleccionaCertificado(origenes: number[]): void {
    this.dataServicio.documentos.datos.forEach((dato: Documento.Dato) => {
      this.filtros = undefined;
      this.columnas = {};
      this.preview = undefined;
      if (dato.origen) this.dataServicio.getCsvData(dato.origen)
        .subscribe((resp: any) => {
          this.columnas = resp.csv.columnasCSV;
          this.filtros = origenes.map((origen: number) => {
            const filtro: Documento.Dato = this.dataServicio.documentos.datos[origen];
            if (
              filtro.type == 'multi' ||
              filtro.type == 'select'
            ) filtro.options = this.columnas[filtro.label].map((val: any, pos: number) => {
              return { label: val, value: pos };
            });
            return filtro;
          });
          this.cdr.detectChanges();
        });
    });
  }
  descargaCertificado(tipo: 'docx' | 'pdf'): void {
    const labelCert: string = this.listaCertificados[0].items[this.certificadoSeleccionado[1]].label as string; // OJO: Controlar grupos en SelectItemGroup
    const hoy: Date = new Date();
    const fecha: string = hoy.getFullYear().toString() + ("0" + (hoy.getMonth() + 1)).slice(-2) + ("0" + hoy.getDate()).slice(-2);
    if (this.preview) {
      this.dataServicio.getCertificadoFile(tipo, this.preview.plantilla, this.preview.estructura, Date.now().toString(), labelCert)
        .subscribe((blob: Blob) => {
          if (blob.type == 'application/json; charset=utf-8') {
            blob.text()
              .then((v: string) => console.log(v))
              .catch((e: any) => console.log(e));
            return;
          }
          const nombreArchivo: string = labelCert + '_' + fecha + '.' + tipo
          this.fileServicio.descarga(blob, nombreArchivo);
          this.cdr.detectChanges();
        });
    }
  }
  seleccionaOpcion(dato: Documento.Dato): void {
    this.preview = {
      // En background se almacena una ruta que es un request directo, sin pasar por data.ts, que usará compartidos/componentes/documentos/preview/preview.html
      // Usar alias corto v2 para mejor performance y URL más limpia
      background: this.configService.getApiBaseUrl() + '/img/base.jpg',
      paddingTop: '7em',
      estructura: {} as Documento.Estructura[],
      plantilla: ''
    };
    let datosCertificado: any;
    switch (dato.plantilla.plantilla) {
      case '1050':
        datosCertificado = [];
        dato.value.forEach((sel: { label: string, value: number }) => {
          const fila: string[] = [];
          dato.encabezados.forEach((encabezado: string) => fila.push(this.columnas[encabezado][sel.value]));
          datosCertificado.push(fila);
        });
        dato.plantilla = this.ajustaCert1050(dato, datosCertificado);
        break;
      case '1231':
        datosCertificado = {
          nombre: this.columnas['Nombre completo'][dato.value.value],
          cedula: this.columnas['Documento de identidad'][dato.value.value],
          filas: [
            [
              'DIRECCIÓN INDIVIDUAL   DE   TESIS:\nGestión pública y acceso a los servicios de salud en la pandemia por covid 19 Medellín, 2020-2022\nPrograma: Maestría en Administración Pública de la ESAP\nEstado: Tesis aprobada, julio 2024\nEstudiante: Yamileth Mena Angulo.',
              36,
              'Decreto 1279 de 2002, Articulo 20, ASIGNACIÓN DE PUNTOS DE BONIFICACIÓN. numeral I, literal h, Direcciones de tesis\n\nDecreto 1279 de 2002, Articulo 20, Numeral II, literal h',
            ]
          ]
        };
        dato.plantilla = this.ajustaCert1231(dato, datosCertificado);
        break;
      case '1051':
        console.log(this.columnas);
        datosCertificado = [];
        dato.value.forEach((sel: { label: string, value: number }) => {
          const fila: string[] = [];
          dato.encabezados.forEach((encabezado: string) => {
            switch (encabezado) {
              case 'No.':
                const numDatos: number = datosCertificado.length + 1;
                fila.push(numDatos.toString());
                break;
              case 'Acta':
                fila.push(this.columnas['Acto Administrativo de Vinculación'][sel.value]);
                break;
              default:
                fila.push(this.columnas[encabezado][sel.value]);
            }
          });
          datosCertificado.push(fila);
        });
        dato.plantilla = this.ajustaCert1051(dato, datosCertificado);
        break;
      default:
        console.log('No se encontró el label del grupo ', this.certificadoSeleccionado);
        break;
    }
    this.preview.estructura = dato.plantilla.estructura;
    this.preview.plantilla = dato.plantilla.plantilla;
    this.cdr.detectChanges();
  }
  private ajustaCert1231(dato: Documento.Dato, datosCertificado: any): Documento.Plantilla { // Ajusta los datos según esta plantilla particular
    const posTabla: number = dato.plantilla.estructura.findIndex((val: Documento.Estructura) => val.tipo == 'tabla');
    const posFecha: number = posTabla + 1;
    const posNombre: number = posTabla - 1; // La posición del párrafo con el nombre e identificación del docente
    const tabla: Documento.Tabla = {
      encabezados: dato.encabezados.map((e: string) => e.toLocaleUpperCase()),
      filas: datosCertificado.filas.map((fila: any[], index: number) => [index + 1].concat(fila)),
      pie: [
        { colspan: 2, texto: 'TOTAL, PUNTOS POR BONIFICACIÓN' },
        { colspan: 2, texto: datosCertificado.filas.map((fila: any[]) => fila[1]).reduce((a: number, c: number) => a + c, 0) + ' PUNTOS POR BONIFICACIÓN' },
      ]
    };
    console.log(tabla);
    dato.plantilla.estructura[posTabla].value = tabla;
    if (dato.plantilla.estructura[posNombre].value && typeof dato.plantilla.estructura[posNombre].value == 'string')
      dato.plantilla.estructura[posNombre].value = dato.plantilla.estructura[posNombre].value
        .replace('{nombreCompleto}', datosCertificado.nombre).replace('{cedula}', datosCertificado.cedula);
    const hoy: Date = new Date();
    const alDia: string = this.numeroMesToPalabra(hoy.getDate());
    const mes: string = hoy.toLocaleDateString('es-CO', { month: 'long' });
    const año: string = hoy.getFullYear().toString();
    if (dato.plantilla.estructura[posFecha].value && typeof dato.plantilla.estructura[posFecha].value == 'string')
      dato.plantilla.estructura[posFecha].value = dato.plantilla.estructura[posFecha].value
        .replace('{alDia}', alDia).replace('{mes}', mes).replace('{año}', año);
    return dato.plantilla;
  }
  private ajustaCert1050(dato: Documento.Dato, datosCertificado: any): Documento.Plantilla { // Ajusta los datos según esta plantilla particular
    const posTabla: number = dato.plantilla.estructura.findIndex((val: Documento.Estructura) => val.tipo == 'tabla');
    const posFecha: number = posTabla + 1; // La posición en el array de elementos en la que aparece el texto de "La presente certificación se expide..."
    const encabezados: string[] = [];
    dato.encabezados.forEach((encabezado: string, index: number) => {
      if (encabezado == 'Última Evaluación') {
        encabezados.push('Evaluación');
        encabezados.push('Periodo');
        datosCertificado.forEach((fila: string[]) => {
          const evaPer: string[] = fila[index].split(' ');
          if (evaPer[1].substring(0, 2) == '20') {
            fila[index] = evaPer[0];
            fila.push(evaPer[1]);
          } else {
            fila[index] = 'No aplica';
            fila.push('No aplica');
          }
        });
      } else {
        encabezados.push(encabezado);
      }
    });
    const tabla: Documento.Tabla = {
      encabezados: encabezados.map((e: string) => e.toLocaleUpperCase()),
      filas: datosCertificado,
    };
    dato.plantilla.estructura[posTabla].value = tabla;
    const hoy: Date = new Date();
    const alDia: string = this.numeroMesToPalabra(hoy.getDate());
    const mes: string = hoy.toLocaleDateString('es-CO', { month: 'long' });
    const año: string = hoy.getFullYear().toString();
    if (dato.plantilla.estructura[posFecha].value && typeof dato.plantilla.estructura[posFecha].value == 'string')
      dato.plantilla.estructura[posFecha].value = dato.plantilla.estructura[posFecha].value
        .replace('{alDia}', alDia).replace('{mes}', mes).replace('{año}', año);
    return dato.plantilla;
  }
  private ajustaCert1051(dato: Documento.Dato, datosCertificado: any): Documento.Plantilla { // Ajusta los datos según esta plantilla particular
    const posTabla: number = dato.plantilla.estructura.findIndex((val: Documento.Estructura) => val.tipo == 'tabla');
    const posFecha: number = posTabla + 1; // La posición en el array de elementos en la que aparece el texto de "La presente certificación se expide..."
    const encabezados: string[] = [];
    dato.encabezados.forEach((encabezado: string) => encabezados.push(encabezado));
    const tabla: Documento.Tabla = {
      encabezados: encabezados.map((e: string) => e.toLocaleUpperCase()),
      filas: datosCertificado,
    };
    dato.plantilla.estructura[posTabla].value = tabla;
    const hoy: Date = new Date();
    const alDia: string = this.numeroMesToPalabra(hoy.getDate());
    const mes: string = hoy.toLocaleDateString('es-CO', { month: 'long' });
    const año: string = hoy.getFullYear().toString();
    if (dato.plantilla.estructura[posFecha].value && typeof dato.plantilla.estructura[posFecha].value == 'string')
      dato.plantilla.estructura[posFecha].value = dato.plantilla.estructura[posFecha].value
        .replace('{alDia}', alDia).replace('{mes}', mes).replace('{año}', año);
    return dato.plantilla;
  }
  private numeroMesToPalabra(num: number): string {
    const np: string[] = [
      'cero', 'primer', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
      'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
      'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés',
      'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho',
      'veintinueve', 'treinta', 'treinta y un'
    ];
    return 'a' + (num > 1 ? ' los ' : 'l ') + np[num] + ' (' + num + ') día' + (num > 1 ? 's' : '');
  }
}
