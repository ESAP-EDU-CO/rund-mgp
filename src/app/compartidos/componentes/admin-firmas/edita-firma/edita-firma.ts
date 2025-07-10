import { ChangeDetectorRef, Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data } from '@servicios/data';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { animate, style, transition, trigger } from '@angular/animations';
import { Firma, Firmas } from '@servicios/firmas';

@Component({
  selector: 'mgp-edita-firma',
  imports: [
    PrimengModule,
    PipesModule,
  ],
  templateUrl: './edita-firma.html',
  styleUrl: './edita-firma.scss',
  animations: [
    trigger('confirm', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('200ms ease-in', style({ transform: 'translateY(0%)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)' }))
      ]),
    ]),
  ]
})
export class EditaFirma implements OnInit, OnChanges {
  @Input() activo: boolean = false;
  firmas: Firma.Firma[] = [];
  archivos: Firma.Firma[] = [];
  metadatos: Firma.FirmaMetadata[] = [];
  hayFirmas: boolean = false;
  confirmaciones: boolean[] = [];
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  constructor(
    private dataServicio: Data,
    private firmasServicio: Firmas,
  ) { }
  ngOnInit(): void {
    this.listaFirmas();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activo'].currentValue && !changes['activo'].previousValue) this.listaFirmas();
  }
  private listaFirmas(): void {
    this.firmas = [];
    this.firmasServicio.getFirmas().subscribe((firmas: Firma.Firma[]) => {
      this.firmas = firmas;
      this.confirmaciones = Array(this.firmas.length).fill(false);
      //setTimeout(() => this.hayFirmas = this.firmas.filter((firma: Firma.Firma) => !firma.metadata).length == 0 && this.firmas.length > 0, 500);
      this.hayFirmas = this.firmas.filter((firma: Firma.Firma) => !firma.metadata).length == 0 && this.firmas.length > 0;
      this.cdr.detectChanges();
    });
  }
  confirmaEliminacion(index: number): void {
    this.confirmaciones[index] = true;
  }
  eliminaFirma(firma: Firma.Firma, index: number): void {
    this.confirmaciones[index] = false;
    // firma.uuid -> PNG
    // firma.metadata.uuid -> JSON
    if (firma.uuid) {
      this.dataServicio.deleteFile(firma.uuid)
        .subscribe((delPNG: any) => {
          if (!delPNG.error) {
            if (firma.metadata?.uuid) {
              this.dataServicio.deleteFile(firma.metadata.uuid)
                .subscribe((delJSON: any) => {
                  if (!delJSON.error) {
                    this.listaFirmas();
                    //this.getFirmas();
                  } else {
                    console.log('Error al borrar el JSON');
                  }
                });
            }
          } else {
            console.log('Error al borrar el PNG');
          }
        });
    }
  }
}