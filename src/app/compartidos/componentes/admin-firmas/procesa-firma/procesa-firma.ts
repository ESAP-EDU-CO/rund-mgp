import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Firma } from '@servicios/firmas';
import { CropSize, Imagen } from '@servicios/imagen';
import { Popover } from 'primeng/popover';

type Coordenadas = 'top' | 'bottom' | 'left' | 'right' | 'free';

@Component({
  selector: 'mgp-procesa-firma',
  imports: [
    PrimengModule,
    FormsModule,
  ],
  templateUrl: './procesa-firma.html',
  styleUrl: './procesa-firma.scss'
})
export class ProcesaFirma implements OnDestroy, OnChanges {
  @Input() archivo!: File;
  @Output() cancela: EventEmitter<void> = new EventEmitter<void>();
  @Output() procesa: EventEmitter<{ datos: Firma.FirmaMetadata, blob: Blob }> = new EventEmitter<{ datos: Firma.FirmaMetadata, blob: Blob }>();
  @ViewChild('imgFirma') private imagen: ElementRef | undefined;
  @ViewChild('instrucciones') private instruccionesFirma!: Popover;
  umbral: number = 128;
  imagenProcesadaUrl: string | null = null;
  datos: Firma.FirmaMetadata = { nombres: '', apellidos: '', cargo: '', fecha: new Date() };
  blob!: Blob;
  cropSize: CropSize | undefined;
  imagenHTML: HTMLImageElement | undefined;
  origenCrop: { x: number, y: number } | undefined;
  constructor(private imagenServicio: Imagen) { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['archivo']) {
      if (this.archivo) this.procesarImagen();
    }
  }
  ngOnDestroy() {
    this.revocarUrl();
    this.resetImagen();
  }
  cambiaUmbral(): void {
    this.procesarImagen();
  }
  private async procesarImagen(): Promise<void> {
    this.revocarUrl();
    try {
      this.blob = await this.imagenServicio.procesa(this.archivo, this.umbral);
      this.imagenProcesadaUrl = URL.createObjectURL(this.blob);
    } catch (error) {
      console.error('Error procesando imagen:', error);
      this.imagenProcesadaUrl = null;
    }
  }
  firmaCargada(): void {
    this.imagenHTML = this.imagen?.nativeElement as HTMLImageElement;
    this.cropSize = { x: 0, y: 0, width: this.imagenHTML.width, height: this.imagenHTML.height };
  }
  haceCrop(eje: Coordenadas, dg: DragEvent): void {
    if (dg.type == 'dragstart') {
      this.origenCrop = { x: dg.x, y: dg.y };
    }
    if (dg.type == 'drag' && this.origenCrop && this.cropSize) {
      if (this.imagenHTML) {
        const delta: { x: number, y: number } = { x: dg.x - this.origenCrop.x, y: dg.y - this.origenCrop.y };
        let posX: number = this.cropSize.x + delta.x;
        let posY: number = this.cropSize.y + delta.y;
        let ancho: number = eje == 'right' ? this.cropSize.width + delta.x : this.cropSize.width - delta.x;
        let alto: number = eje == 'bottom' ? this.cropSize.height + delta.y : this.cropSize.height - delta.y;
        if (posX < 0) posX = 0;
        if (ancho > (this.imagenHTML.width - posX)) ancho = this.imagenHTML.width - posX;
        if (posY < 0) posY = 0;
        if (alto > (this.imagenHTML.height - posY)) alto = this.imagenHTML.height - posY;
        switch (eje) {
          case 'top':
            if (dg.y !== 0) {
              this.cropSize.y = posY;
              this.cropSize.height = alto;
            }
            break;
          case 'bottom':
            if (dg.y !== 0) {
              this.cropSize.height = alto;
            }
            break;
          case 'left':
            if (dg.x !== 0) {
              this.cropSize.x = posX;
              this.cropSize.width = ancho;
            }
            break;
          case 'right':
            if (dg.x !== 0) {
              this.cropSize.width = ancho;
            }
            break;
          case 'free':
            if (posX + ancho >= this.imagenHTML.width) posX = this.imagenHTML.width - ancho - 1;
            if (posY + alto >= this.imagenHTML.height) posY = this.imagenHTML.height - alto - 1;
            if (dg.x !== 0) this.cropSize.x = posX;
            if (dg.y !== 0) this.cropSize.y = posY;;
            break;
        }
        this.origenCrop = { x: dg.x, y: dg.y };
      }
    }
  }
  private revocarUrl() {
    if (this.imagenProcesadaUrl) URL.revokeObjectURL(this.imagenProcesadaUrl);
  }
  guardar(): void {
    this.datos.fecha = new Date();
    const archImagen: File = new File([this.blob], this.normalizaNombre(this.datos.nombres + '-' + this.datos.apellidos));
    this.finalizaImagen(archImagen);
  }
  private async finalizaImagen(archImagen: File): Promise<void> {
    this.blob = await this.imagenServicio.procesa(
      archImagen,
      this.umbral,
      this.cropSize,
      { ancho: this.imagenHTML?.width as number, alto: this.imagenHTML?.height as number }
    );
    this.procesa.emit({ datos: this.datos, blob: this.blob });
  }
  cancelar(): void {
    this.revocarUrl();
    this.resetImagen();
    this.cancela.emit();
  }
  resetImagen(): void {
    this.imagenServicio.reset();
    this.cropSize = undefined;
    this.imagenHTML = undefined;
    this.origenCrop = undefined;
  }
  private normalizaNombre(nombre: string): string {
    return nombre.trim().replace(/\s+/g, '_').toUpperCase();
  }
}
