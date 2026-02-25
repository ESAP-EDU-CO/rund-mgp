import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';

@Injectable({
  providedIn: 'root'
})
export class FileServicio {
  private readonly platID: object = inject(PLATFORM_ID);
  private pdfjsLib: typeof import('pdfjs-dist') | null = null;
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
  async generaMiniaturaPDF(archivoPDF: File, maxWidth = 80): Promise<string> {
    if (!isPlatformBrowser(this.platID)) return '';
    await this.loadPdfJs();
    if (!this.pdfjsLib) throw new Error('No se pudo cargar pdfjs-dist');
    const arrayBuffer: ArrayBuffer = await this.fileToArrayBuffer(archivoPDF);
    const pdf: PDFDocumentProxy = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page: PDFPageProxy = await pdf.getPage(1);
    const viewportOriginal = page.getViewport({ scale: 1 });
    const scale: number = maxWidth / viewportOriginal.width;
    const viewportEscalado = page.getViewport({ scale });
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = viewportEscalado.width;
    canvas.height = viewportEscalado.height;
    const context: CanvasRenderingContext2D = canvas.getContext('2d')!;
    const renderParams: RenderParameters = {
      canvasContext: context,
      viewport: viewportEscalado,
      canvas: canvas
    };
    await page.render(renderParams).promise;
    const thumbnailDataUrl: string = canvas.toDataURL('image/png');
    return thumbnailDataUrl;
  }
  private async loadPdfJs(): Promise<void> {
    if (this.pdfjsLib) return;
    this.pdfjsLib = await import('pdfjs-dist');
    this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.mjs';
  }
  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader: FileReader = new FileReader();
      reader.onload = (): void => resolve(reader.result as ArrayBuffer);
      reader.onerror = (): void => reject(new Error('Error al leer el archivo PDF'));
      reader.readAsArrayBuffer(file as unknown as Blob);
    });
  }
}