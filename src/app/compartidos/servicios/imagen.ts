import { Injectable } from '@angular/core';
import { Image } from 'image-js';

export interface CropSize {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class Imagen {
  private imagenEnProceso: ArrayBuffer | null = null;
  private imagenOriginal: ArrayBuffer | null = null;
  async procesa(imagen: File, umbral: number, crop: CropSize | null = null, original: { ancho: number, alto: number } | null = null): Promise<Blob> {
    if (!this.imagenOriginal) this.imagenOriginal = await imagen.arrayBuffer();
    if (!this.imagenEnProceso) this.imagenEnProceso = await imagen.arrayBuffer();
    let img: Image;
    if (crop && original) {
      img = await Image.load(this.imagenOriginal);
      const kAncho: number = img.width / original.ancho;
      const kAlto: number = img.height / original.alto;
      const cropFinal: CropSize = {
        x: kAncho * crop.x,
        y: kAlto * crop.y,
        width: kAncho * crop.width,
        height: kAlto * crop.height,
      };
      img = img.crop({ x: cropFinal.x, y: cropFinal.y, width: cropFinal.width, height: cropFinal.height });
    } else {
      img = await Image.load(this.imagenEnProceso);
    }
    if (img.width > 512 || img.height > 512) {
      if (img.width > 512) img = img.resize({ width: 512 });
      if (img.height > 512) img = img.resize({ height: 512 });
    }
    if (img.alpha) {
      for (let x = 0; x < img.width; x++) {
        for (let y = 0; y < img.height; y++) {
          const [r, g, b, a] = img.getPixelXY(x, y);
          if (a < 128) img.setPixelXY(x, y, [255, 255, 255, 255]);
        }
      }
    }
    const blob: Blob = await img.toBlob('image/png');
    this.imagenEnProceso = await blob.arrayBuffer();
    img = img.grey();
    const salida: Image = new Image(img.width, img.height);
    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < img.height; y++) {
        const [intensity] = img.getPixelXY(x, y);
        if (intensity > umbral) {
          salida.setPixelXY(x, y, [255, 255, 255, 0]);
        } else {
          salida.setPixelXY(x, y, [0, 0, 0, 255]);
        }
      }
    }
    return salida.toBlob('image/png');
  }
  reset(): void {
    this.imagenEnProceso = null;
    this.imagenOriginal = null;
  }
}
