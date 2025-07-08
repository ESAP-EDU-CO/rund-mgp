import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Documento } from '@servicios/data';
import { Firma } from '@servicios/firmas';

interface DatoFirma extends Firma.Firma {
  funcionario: string;
}

@Component({
  selector: 'mgp-vista-datos',
  imports: [
    PrimengModule,
    FormsModule,
  ],
  templateUrl: './vista-datos.html',
  styleUrl: './vista-datos.scss'
})
export class VistaDatos implements OnInit, AfterViewInit {
  @Input() estructura: Documento.Estructura[] = [];
  @Input() listaFirmas: Firma.Firma[] = [];
  @ViewChild('vistaDatos') private vistaDatos: ElementRef | undefined;
  datosFirmas: DatoFirma[] = [];
  firmaSeleccionada!: DatoFirma;
  ngOnInit(): void {
    this.datosFirmas = [];
    this.listaFirmas.forEach((firma: Firma.Firma) =>
      this.datosFirmas.push({
        ...firma,
        funcionario: firma.metadata?.nombres + ' ' + firma.metadata?.apellidos,
      })
    );
    this.datosFirmas.sort((a: DatoFirma, b: DatoFirma) => a.funcionario.localeCompare(b.funcionario));
    this.ajustaFirma();
  }
  ngAfterViewInit(): void {
    if (this.vistaDatos && this.vistaDatos.nativeElement) {
      const ve: HTMLElement = this.vistaDatos.nativeElement as HTMLElement;
      const anchoMax: number = ve?.parentElement?.parentElement?.parentElement?.parentElement?.offsetWidth as number;
      ve.style.maxWidth = Math.floor((anchoMax * 65 / 100) - 8) + 'px';
    }
  }
  ajustaFirma(uuid: string | undefined = undefined): void {
    const posFirma: number = this.estructura.findIndex((el: Documento.Estructura) => el.tipo == 'firma');
    const elFirma: Documento.Firma = this.estructura[posFirma].value;
    if (!uuid) uuid = elFirma.uuid;
    const firma: Firma.Firma | undefined = this.listaFirmas.find((f: Firma.Firma) => f.uuid == uuid);
    if (firma && firma.metadata) {
      elFirma.nombre = firma.metadata.nombres + ' ' + firma.metadata.apellidos;
      elFirma.cargo = firma.metadata.cargo;
      elFirma.imagen = firma.url as string;
    }
    if (firma) {
      this.firmaSeleccionada = {
        ...firma,
        funcionario: elFirma.nombre,
      };
    }
    const numBloqueFirma: number = this.estructura.findIndex((el: Documento.Estructura) => el.tipo == 'firma');
    if (numBloqueFirma > -1) this.estructura[numBloqueFirma].value.uuid = uuid;
  }
}
