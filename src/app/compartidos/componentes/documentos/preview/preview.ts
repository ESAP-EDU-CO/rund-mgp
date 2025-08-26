import { NgStyle } from '@angular/common';
import { AfterViewInit, Component, Input } from '@angular/core';
import { FirmaCertificado } from '@componentes/firma-certificado/firma-certificado';
import { Prevista } from '@vistas/documentos/documentos';

@Component({
  selector: 'mgp-preview',
  imports: [
    NgStyle,
    FirmaCertificado,
  ],
  templateUrl: './preview.html',
  styleUrl: './preview.scss'
})
export class Preview implements AfterViewInit {
  @Input() preview: Prevista | undefined;
  fontSize: string = '10px';
  elemento: HTMLElement = document.querySelector('.preview .vista') as HTMLElement;
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.fontSize = this.estableceEM();
      const resize: ResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
              this.fontSize = this.estableceEM();
            }
          }
        }
      });
      resize.observe(this.elemento);
    });
  }
  estableceEM(): string {
    const size: number = 10; // Tamaño estándar relativo de caracter
    this.elemento = document.querySelector('.preview .vista') as HTMLElement;
    const anchoRegular: number = this.elemento.offsetWidth / 60; // A lo ancho, una hoja carta tiene 60 caracteres de 10px
    return '' + Math.round(anchoRegular / 10 * size) + 'px';
  }
}
