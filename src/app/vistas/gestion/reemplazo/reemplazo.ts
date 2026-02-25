import { ChangeDetectorRef, Component, inject, input, InputSignal, OnDestroy, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DatoArchivo } from '@servicios/data';
import { FileServicio } from '@servicios/file';

@Component({
  selector: 'mgp-reemplazo',
  imports: [
    PrimengModule,
    FormsModule,
  ],
  templateUrl: './reemplazo.html',
  styleUrl: './reemplazo.scss',
})
export class Reemplazo implements OnDestroy {
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private fileServicio: FileServicio = inject(FileServicio);
  private data: Data = inject(Data);
  finReemplazo: OutputEmitterRef<void> = output();
  profesor: InputSignal<any> = input<any>();
  docOriginal: InputSignal<DatoArchivo | undefined> = input<DatoArchivo>();
  archivo: File | undefined;
  prevista: { nombre: string, peso: string | undefined, miniaturaURL: string, comentario: string } | undefined;
  salida: any;
  async selecciona(ev: any): Promise<void> {
    this.archivo = ev.currentFiles[0];
    const nombre: string = this.archivo?.name as string;
    let miniaturaURL = '';
    let peso = '';
    if (this.archivo) {
      peso = this.archivo?.size < (1024 * 1024) ?
        (this.archivo?.size / 1024).toFixed(2) + ' KB' :
        (this.archivo?.size / (1024 * 1024)).toFixed(2) + ' MB';
      miniaturaURL = this.archivo?.type === 'application/pdf' ?
        await this.fileServicio.generaMiniaturaPDF(this.archivo, 240) :
        URL.createObjectURL(this.archivo);
    }
    this.prevista = {
      nombre: nombre,
      peso: peso,
      miniaturaURL: miniaturaURL,
      comentario: ''
    };
    this.cdr.detectChanges();
  }
  async reemplaza(): Promise<void> {
    const resp: any = await this.data.getArchivoProfesorUuid(this.profesor()['DOCUMENTO_DE_IDENTIDAD'] as string, this.docOriginal()?.nombre as string);
    if (!resp.success) {
      this.salida = { error: true, mensaje: 'El documento original no se encontró en el repositorio' };
      this.cdr.detectChanges();
      return;
    }
    try {
      const response: any = await this.data.reemplazaArchivo(
        resp.uuid,
        this.docOriginal()?.nombre as string,
        this.archivo as File,
        this.prevista?.comentario as string
      );
      if (response.success) {
        this.salida = { error: false, mensaje: 'El documento se ha reemplazado correctamente en el repositorio' };
        this.finReemplazo.emit();
        this.elimina(null);
      }
    } catch (error: any) {
      this.salida = { error: true, mensaje: error.error.error + ': ' + error.message };
      this.cdr.detectChanges();
    };
  }
  elimina(_ev: any): void {
    this.prevista = undefined;
    this.archivo = undefined;
    this.cdr.detectChanges();
  }
  dato(dato: 'tipo' | 'formato'): string {
    return dato === 'tipo' ?
      this.data.labels[this.docOriginal()?.tipo as string] :
      this.docOriginal()?.formato as string;
  }
  ngOnDestroy(): void {
    this.salida = undefined;
  }
}
