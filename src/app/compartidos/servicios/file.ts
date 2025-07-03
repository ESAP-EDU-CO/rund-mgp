import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class File {
  descarga(blob: Blob, nombre: string): void {
    saveAs(blob, nombre);
  }
}
