import { NgClass } from '@angular/common';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Excel } from '@servicios/excel';
import { TipoListado } from '@servicios/data';

interface ReporteARCA {
  encabezado: string;
  reporte: string;
}

@Component({
  selector: 'mgp-vista-excel',
  imports: [
    PrimengModule,
    NgClass,
  ],
  templateUrl: './vista-excel.html',
  styleUrl: './vista-excel.scss'
})
export class VistaExcel implements OnInit {
  @Input() archivo: File | undefined;
  @Output() reconoceTipo: EventEmitter<TipoListado.Propiedades> = new EventEmitter<TipoListado.Propiedades>();
  @Output() emiteCSV: EventEmitter<Array<string | number>[]> = new EventEmitter<Array<string | number>[]>();
  data: Array<string | number>[] = [];
  encabezados: Array<string | number> = [];
  anchoCeldas: string[] = [];
  tipos: TipoListado.Propiedades[] = [
    {
      tipo: 'Listado de docentes',
      nombre: 'ListadoGeneralDocente',
      origen: 'OneDrive ESAP',
      formato: 'Excel XLSX',
      extension: '.xlsx',
      encabezados: [
        'Documento de identidad',
        'Vinculación',
        'Nombre completo',
        'Territorial',
        'Categoría',
        'Núcleo Temático',
        'Nivel de Formación',
        'Perfil académico',
        'Pregrado',
        'Especialización',
        'Maestría',
        'Doctorado',
        'PosDoctorado',
        'Investigación 2024',
        'Origen de vinculación',
        'Acto Administrativo de Vinculación',
        'Correo Institucional',
        'Correo personal',
        'Telefono',
        'Última Evaluación',
        'Dedicación',
        'Situación Administrativa',
        'Inicio de Vinculación',
        'Fin de Vinculación',
        'Puntaje Salarial',
      ]
    },
    {
      tipo: 'Tablero de control docente',
      nombre: 'TableroControlDocente',
      origen: 'OneDrive ESAP',
      formato: 'Excel XLSX',
      extension: '.xlsx',
      encabezados: [
        'NOMBRE DOCENTE',
        'TERRITORIAL DE VINCULACIÓN',
        'FORMA DE VINCULACIÓN',
        'HORAS A PROGRAMAR',
        'Horas Pregrado',
        'Total Asignaturas Pregrado',
        'Promedio Horas en Pregrado',
        'Horas Posgrado',
        'Total Asignaturas Posgrado',
        'Promedio Horas en Posgrado',
        'Horas Investigación',
        'Horas Actividades Complementarias',
        'Horas Extensión Académica\n(Capacitación)',
        'Horas Extensión Académica\n(Procesos Selección)',
        'Horas Extensión Académica\n(Gestión Estatal)',
        'Horas Extensión Académica\n(Alto Gobierno)',
        'Horas Administrativas',
        'TOTAL HORAS PROGRAMADAS',
        'GGP',
        'PORCENTAJE DE PROGRAMACIÓN',
        'RESULTADO',
        'Horas Excedidas en Programación',
        'Horas Pendientes por Programar',
        '0',
        'Fecha Actualización GGP ',
        'Flujo de aprobación DOCENTE',
        'Flujo de aprobación RESP.PROG',
        'Flujo de aprobación JEFE',
        '% Aprobación',
        'Fecha Cierre Definitivo',
        'OBSERVACIONES',
        'Columna1'
      ]
    },
    {
      tipo: 'Evaluación consolidada por período EVAR46',
      nombre: 'EvaluacionDocentePeriodoAcademico-EVAR46',
      origen: 'ARCA',
      formato: 'Excel XLSX',
      extension: '.xlsx',
      encabezados: [
        'Docente',
        'Número de cédula',
        'Tipo de vinculación',
        'Territorial',
        'Cetap',
        'Asignatura',
        'Grupo',
        'Créditos',
        'Horas docencia presencial',
        'Categoria docente',
        'Número de estudiantes a cargo del docente',
        'Número de estudiantes que calificaron al docente',
        '30',
        '30',
        '10',
        '10',
        '50',
        '50',
        '10',
        '10',
        'Total Definitiva',
        'Puntaje según al articulo 90 del acuerdo 009 de 2004',
        'Calificación',
        'Total definitiva',
        'Calificación definitiva'
      ]
    }
  ];
  reportesARCA: ReporteARCA[] = [
    {
      encabezado: 'Evaluación consolidada período académico',
      reporte: 'EVAR46'
    }
  ];
  constructor(private excel: Excel) { }
  ngOnInit(): void {
    if (this.archivo) this.excel.lee(this.archivo, 0).then((datos: any[]) => {
      const matchARCA: ReporteARCA[] = this.reportesARCA.filter((r: ReporteARCA) => datos[0][1].toString().includes(r.encabezado));
      if (matchARCA.length > 0) datos = this.formateaReporteARCA(datos, matchARCA[0].reporte);
      this.encabezados = datos.shift();
      const tipoListado: TipoListado.Propiedades = this.determinaTipoListado();
      this.encabezados.splice(0, 1);
      datos.forEach((d: any[]) => d.splice(0, 1));
      const indicesValidos: number[] = this.encabezados
        .map((encabezado: string | number, index: number) => (encabezado.toString().length > 0) ? index : -1)
        .filter((index: number) => index !== -1);
      this.encabezados = indicesValidos.map(index => this.encabezados[index]);
      this.encabezados.forEach((e: string | number, index: number) => this.encabezados[index] = (e == 0) ? '#' : e);
      datos = datos.map(fila => indicesValidos.map(index => fila[index]));
      this.data = this.excel.normaliza(datos);
      this.data[0].forEach((celda: any, num: number) => {
        this.anchoCeldas[num] = 'minimo';
        if ((typeof celda) == 'string') {
          if (celda.length > 99) this.anchoCeldas[num] = 'maximo';
          if (celda.length < 100 && celda.length > 19) this.anchoCeldas[num] = 'medio';
        }
      });
      this.encabezados = this.excel.normaliza([this.encabezados])[0];
      this.emiteCSV.emit([this.encabezados].concat(this.data));
    });
  }
  determinaTipoListado(): TipoListado.Propiedades { // Determina el tipo de listado según el mayor número de coincidencias en el encabezado
    const coincidencias: number[] = [];
    this.tipos.forEach((tipo: TipoListado.Propiedades) => {
      let coincidencia: number = 0;
      this.encabezados.forEach((enc: string | number) => {
        if (tipo.encabezados.includes(enc)) coincidencia++;
      });
      coincidencia = coincidencia / this.encabezados.length; // Según el porcentaje de coincidencias
      coincidencias.push(coincidencia);
    });
    const pos: number = coincidencias.reduce((indiceMayor, valorActual, indiceActual, array) => {
      return valorActual > array[indiceMayor] ? indiceActual : indiceMayor;
    }, 0);
    this.reconoceTipo.emit(this.tipos[pos]);
    return this.tipos[pos];
  }
  formateaReporteARCA(datos: any[][], codReporte: string): any[][] { // Formatea el desorden de reporte ARCA
    this.tipos.forEach((tipo: TipoListado.Propiedades) => {
      if (tipo.tipo.includes(codReporte)) {
        tipo.nombre += '_' + datos[1][2] + '_' + datos[2][2];
        //tipo.tipo += ' - ' + datos[1][2] + ' - ' + datos[2][2];
      }
    });
    const enc1: any[] = datos[4];
    const enc2: any[] = datos[5];
    enc2.forEach((celda: any, numCelda: number) => {
      if (celda != enc1[numCelda]) {
        datos[5][numCelda] = celda + ' / ' + enc1[numCelda];
      }
    });
    datos.splice(0, 5);
    return datos;
  }
}
