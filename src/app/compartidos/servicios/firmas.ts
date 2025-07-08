import { Injectable } from '@angular/core';
import { Data } from '@servicios/data';
import { BehaviorSubject } from 'rxjs';

export namespace Firma {
  export interface FirmaMetadata {
    nombres: string;
    apellidos: string;
    cargo: string;
    fecha: Date;
    firma?: string;
    uuid?: string;
  }
  export interface Firma {
    nombre: string;
    url: String;
    uuid?: string;
    metadata?: FirmaMetadata;
  }
}

@Injectable({
  providedIn: 'root'
})
export class Firmas {
  private firmas: Firma.Firma[] = [];
  private archivos: Firma.Firma[] = [];
  private metadatos: Firma.FirmaMetadata[] = [];
  private todasFirmas: BehaviorSubject<Firma.Firma[]> = new BehaviorSubject<Firma.Firma[]>([]);
  constructor(private dataServicio: Data) { }
  getFirmas(): BehaviorSubject<Firma.Firma[]> {
    this.listFirmas();
    return this.todasFirmas;
  }
  private listFirmas(): void {
    this.metadatos = [];
    this.archivos = [];
    this.dataServicio
      .apiGet(this.dataServicio.host + 'getFirmas', {})
      .subscribe((firmas: any[]) => this.getFirma(firmas, 0));
  }
  private getFirma(firmas: any[], numFirma: number): void {
    const totalFirmas: number = firmas.length - 1;
    if (totalFirmas > -1) {
      const firma: any = firmas[numFirma];
      const params: { [key: string]: any } = { uuid: firma.uuid, mimeType: firma.mimeType };
      const opciones: { [key: string]: any } | undefined = (firma.mimeType != 'application/json') ? { responseType: 'blob', observe: 'response' } : undefined;
      this.dataServicio
        .apiGet(this.dataServicio.host + 'getFirmas', params, opciones)
        .subscribe((resp: any) => {
          if (firma.mimeType == 'application/json') {
            const metadato: Firma.FirmaMetadata = this.labelToKey(resp) as Firma.FirmaMetadata;
            metadato.uuid = firma.uuid;
            this.metadatos.push(metadato);
          } else {
            const blob: Blob = resp.body as Blob;
            const firmaPNG: Firma.Firma = {
              nombre: firma.nombre,
              url: URL.createObjectURL(blob),
              uuid: firma.uuid,
            };
            this.archivos.push(firmaPNG);
          }
          if (numFirma < totalFirmas) {
            numFirma++;
            this.getFirma(firmas, numFirma);
          } else {
            this.addMetadata();
          }
        });
    }
  }
  private addMetadata(): void {
    this.firmas = [];
    this.archivos.forEach((firma: Firma.Firma) => {
      firma.metadata = this.metadatos.find((metadato: Firma.FirmaMetadata) => metadato.firma == firma.nombre);
      this.firmas.push(firma);
    });
    this.todasFirmas.next(this.firmas);
  }
  private labelToKey(objeto: { label: string, valor: string }[]): { [key: string]: string } | Firma.FirmaMetadata {
    const obj: { [key: string]: string } = {};
    objeto.forEach((item: { label: string, valor: string }) => obj[item.label] = item.valor);
    return obj;
  }
}
