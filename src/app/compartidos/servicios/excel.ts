import { Injectable } from '@angular/core';
import ExcelJS, { Workbook } from 'exceljs';

type TipoCelda = 'number' | 'string' | 'mixed';

@Injectable({
  providedIn: 'root'
})
export class Excel {
  lee(archivo: File, numHoja: number): Promise<any[]> {
    return new Promise<any[]>((resolve: any, _reject: any) => {
      const excel: Workbook = new ExcelJS.Workbook();
      const data: any[] = [];
      archivo.arrayBuffer().then((buffer: ArrayBuffer) => {
        excel.xlsx.load(buffer).then((_val: ExcelJS.Workbook) => {
          const hoja: ExcelJS.Worksheet = excel.worksheets[numHoja];
          hoja.eachRow((fila: ExcelJS.Row) => data.push(fila.values));
          resolve(data);
        });
      });
    });
  }
  normaliza(data: any[][]): (string | number)[][] {
    const datos: (string | number)[][] = [];
    const colTipo: TipoCelda[] = this.tipoFila(data);
    data.forEach((fila: any[]) => {
      const celdas: (string | number)[] = [];
      fila.forEach((celda: any, numCelda: number) => celdas.push(this.aCadena(celda, colTipo[numCelda] == 'number' ? 0 : 'N/A')));
      datos.push(celdas);
    });
    return datos;
  }
  private aCadena(el: any, valorNull: string | number): string | number {
    const dateRE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
    const txstRE: RegExp[] = [/\\n/, /\s+/];
    if (!el) return valorNull;
    if (el.toString().match(dateRE)) return new Date(el).toLocaleDateString('es-CO');
    if (el instanceof Date) return el.toLocaleDateString('es-CO');
    if ((typeof el) == 'number' && el == 0) return valorNull;
    if ((typeof el) == 'number') return el;
    if (el instanceof Object) {
      if (el.text) return el.text.toString();
      if (el.result) {
        if (el.result.error) return valorNull;
        return el.result;
      }
      if (el.richText) return el.richText.map((e: any) => e.text).join('');
    }
    if ((typeof el) == 'string') {
      txstRE.forEach((r: RegExp) => el = el.replace(r, ' '));
      return el.trim();
    }
    return '';
  }
  private tipoFila(data: any[][]): TipoCelda[] {
    const numFilas: number = data.length;
    const conteo: { textos: number, numeros: number }[] = data[0].map((_celda: any) => { return { textos: 0, numeros: 0 } });
    data.forEach((fila: any[]) => {
      fila.forEach((celda: any, numCol: number) => this.tipoCelda(celda) == 'number' ? conteo[numCol].numeros++ : conteo[numCol].textos++);
    });
    return conteo.map((val: { textos: number, numeros: number }) => {
      if ((val.numeros / numFilas) > .8) return 'number';
      if ((val.textos / numFilas) > .8) return 'string';
      return 'mixed';
    });
  }
  private tipoCelda(celda: any): TipoCelda {
    if (celda instanceof Object) {
      if (celda.text) return 'string';
      if (celda.result) return 'number';
    }
    if ((typeof celda) == 'number') return 'number';
    if ((typeof celda) == 'string') return 'string';
    return 'mixed';
  }
}
