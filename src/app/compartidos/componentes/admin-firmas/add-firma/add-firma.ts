import { Component, Input, OnChanges, Output, SimpleChanges, EventEmitter } from '@angular/core';
import { ProcesaFirma } from '../procesa-firma/procesa-firma';
import { animate, style, transition, trigger } from '@angular/animations';
import { Data } from '@servicios/data';
import { Firma } from '@servicios/firmas';
import { PrimengModule } from '@modulos/primeng/primeng-module';

type Etapa = 'carga' | 'procesamiento' | 'cargando' | 'grabado';

@Component({
  selector: 'mgp-add-firma',
  imports: [
    PrimengModule,
    ProcesaFirma
  ],
  templateUrl: './add-firma.html',
  styleUrl: './add-firma.scss',
  animations: [
    trigger('cortina', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(-100%)' })),
      ]),
    ]),
  ]
})
export class AddFirma implements OnChanges {
  @Input() activo: boolean = true;
  @Output() cerrar: EventEmitter<void> = new EventEmitter<void>();
  etapa: Etapa | undefined = 'carga';
  archivo!: File;
  urlImagenFinal: string | undefined;
  datosFirma: Firma.FirmaMetadata | undefined;
  erroresCarga: { png: string | boolean, json: string | boolean } = { png: false, json: false };
  constructor(private dataServicio: Data) { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activo'].currentValue && !changes['activo'].previousValue) {
      this.etapa = undefined;
      setTimeout(() => {
        this.etapa = 'carga';
      });
    }
  }
  seleccionaImagen(ev: any): void {
    this.archivo = ev.currentFiles[0];
  }
  procesaImagen(ev: any): void {
    this.cambiaEtapa('procesamiento');
  }
  eliminaImagen(ev: any): void {
    if (ev === null) this.cambiaEtapa('carga');
  }
  guardarFirma(firma: { datos: Firma.FirmaMetadata, blob: Blob }): void {
    this.urlImagenFinal = URL.createObjectURL(firma.blob);
    this.datosFirma = firma.datos;
    this.cambiaEtapa('cargando');
    this.dataServicio.postFirma(firma.datos, firma.blob).subscribe((resp: any) => {
      this.erroresCarga = { json: resp.cargaJSON.error, png: resp.cargaPNG.error };
      this.cambiaEtapa('grabado');
    });
  }
  cierraDialogo(): void {
    this.cerrar.emit();
  }
  private cambiaEtapa(etapa: Etapa): void {
    this.etapa = undefined;
    setTimeout(() => {
      this.etapa = etapa;
    }, 500);
  }
}
