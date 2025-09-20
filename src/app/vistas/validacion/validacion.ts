import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { tap } from 'rxjs';
import { AutofillEvent, AutofillMonitor } from '@angular/cdk/text-field';
import { Data, Documento } from '@servicios/data';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { File } from '@servicios/file';

interface DataCert {
  plantilla: string;
  data: Documento.Estructura[] | string;
  fecha: string;
  nombre: string;
  id: string;
  tipo?: 'certificado' | 'reporte' | 'consulta';
  formato?: 'pdf' | 'docx' | 'xlsx';
  error?: string;
}

@Component({
  selector: 'mgp-validacion',
  imports: [
    PrimengModule,
    FormsModule,
    PipesModule,
  ],
  templateUrl: './validacion.html',
  styleUrl: './validacion.scss'
})
export class Validacion implements AfterViewInit, OnDestroy {
  @ViewChild('inputIdCertificado', { read: ElementRef }) private inputIdCertificado: ElementRef<HTMLInputElement> | undefined;
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private autoFillMonitor: AutofillMonitor = inject(AutofillMonitor);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private dataServicio: Data = inject(Data);
  private fileServicio: File = inject(File);
  idLen: number = 16;
  certificado: string | null = null;
  idCertificado: string = '';
  dataCertificado: any[] | null = null;
  constructor() {
    this.router.events.pipe(
      tap((ev: any) => {
        if (ev instanceof NavigationEnd) this.obtieneIdCertificado();
      })
    ).subscribe();
    this.obtieneIdCertificado();
  }
  ngAfterViewInit(): void {
    if (this.inputIdCertificado) {
      this.autoFillMonitor
        .monitor(this.inputIdCertificado)
        .subscribe((ev: AutofillEvent) => {
          if (ev.isAutofilled) {
            const intervalo: any = setInterval(() => {
              if ((ev.target as HTMLInputElement).value.length > 0) {
                clearInterval(intervalo);
                this.validaID();
              }
            });
          }
        });
    }
  }
  oprimeTecla(ev: KeyboardEvent): void {
    if (ev.key == 'Enter') this.validaID();
  }
  validaID(): void {
    if (this.idCertificado.length == this.idLen) {
      this.router.navigateByUrl('validacion?certificado=' + this.idCertificado);
    }
  }
  descargarCertificado(tipo: string): void {
    if (this.dataCertificado) {
      const datos: DataCert = this.dataCertificado[0] as DataCert;
      this.dataServicio.getCertificadoFile(tipo, datos.plantilla, (datos.data as Documento.Estructura[]), datos.fecha, datos.nombre, datos.id)
        .subscribe((blob: Blob) => {
          if (blob.type == 'application/json; charset=utf-8') {
            blob.text()
              .then((v: string) => console.log(v))
              .catch((e: any) => console.log(e));
            return;
          }
          const nombreArchivo: string = datos.nombre + '_' + datos.fecha + '.' + tipo
          this.fileServicio.descarga(blob, nombreArchivo);
          this.cdr.detectChanges();
        });
    }
  }
  private obtieneIdCertificado(): void {
    this.certificado = this.activatedRoute.snapshot.queryParamMap.get('certificado');
    if (this.certificado) {
      this.idCertificado = this.certificado;
      this.dataServicio.getCertificadoInfo(this.certificado).subscribe((data: any) => {
        const respuesta: DataCert = data.certificado;
        if (Object.keys(data).length > 1 && !respuesta.error) {
          this.dataCertificado = [respuesta];
          this.dataCertificado[0].id = this.certificado;
          this.dataCertificado[0].data = JSON.parse(respuesta.data as string);
        } else {
          this.dataCertificado = null;
        }
        this.cdr.detectChanges();
      });
    }
  }
  ngOnDestroy(): void {
    this.autoFillMonitor.ngOnDestroy();
  }
}
