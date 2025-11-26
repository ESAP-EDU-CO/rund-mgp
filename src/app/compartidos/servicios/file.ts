import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

@Injectable({
  providedIn: 'root'
})
export class File {
  descarga(blob: Blob, nombre: string): void {
    try {
      saveAs(blob, nombre);
    } catch (error) {
      console.error('Error creando archivo:', error);
      throw error;
    }
  }
  async creaZipDesdeBlobs(blobs: { blob: Blob | undefined, nombre: string }[]): Promise<Blob> {
    const zip: JSZip = new JSZip();
    blobs.forEach((archivo: { blob: Blob | undefined, nombre: string }) => {
      if (archivo.blob) zip.file(archivo.nombre, archivo.blob);
    });
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }
}