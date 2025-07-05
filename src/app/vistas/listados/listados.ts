import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VistaExcel } from '@componentes/vista-excel/vista-excel';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { ListadoProps, TipoListado, Data } from '@servicios/data';
import { ConfirmationService } from 'primeng/api';

type Dupe = {
  nombre: boolean,
  ruta: boolean,
  size: boolean,
  creado: boolean | string,
  uuid: string
};

@Component({
  selector: 'mgp-listados',
  imports: [
    PrimengModule,
    PipesModule,
    VistaExcel,
    FormsModule
  ],
  providers: [
    ConfirmationService
  ],
  templateUrl: './listados.html',
  styleUrl: './listados.scss'
})
export class Listados {
  loadList: string = '';
  archivo: File | undefined;
  listadoProps: ListadoProps[] = [];
  propsNoVisibles: string[] = ['Size', 'Uuid', 'Duplicado'];
  csvData: Array<string | number>[] = [];
  loadingDialog: boolean = false;
  constructor(
    private data: Data,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.loadList = this.data.host + 'loadList';
  }
  acciones(ev: any, funcion: Function): void {
    if (funcion.name != 'bound upload') {
      funcion();
    } else {
      this.cargaFile(ev);
    }
  }
  cargaFile(ev: any): void {
    this.loadingDialog = true;
    this.data.postFile(this.loadList, this.listadoProps, 'cargar', this.archivo)
      .subscribe((resp: any) => {
        this.loadingDialog = false;
        if (!resp.error || resp.error == 0) this.cargaCorrecta();
        else this.errorCarga(resp);
        this.cdr.detectChanges();
      });
    if (this.csvData) {
      const { archivo, propiedades } = this.generaCSV(this.csvData);
      this.data.apiGet(this.loadList, { accion: 'duplicado', propiedades: JSON.stringify(propiedades) })
        .subscribe((dupeResp: any) => {
          const dupe: Dupe = dupeResp.duplicado;
          if (Object.values(dupe).findIndex((v: string | boolean) => v != false) > -1) {
            propiedades.push({ label: 'Uuid', valor: dupe.uuid });
            propiedades.push({ label: 'Duplicado', valor: true });
            propiedades.push({ label: 'Comentario', valor: this.extraeProp('Comentario') });
          }
          this.data.postFile(this.loadList, propiedades, 'cargar', archivo)
            .subscribe((resp: any) => {
              // Se carga el CSV side-car con control de versiones
            });
        });
    }
  }
  varComentario(): ListadoProps {
    return this.listadoProps.find((v: ListadoProps) => v.label == 'Comentario') as ListadoProps;
  }
  cargaHandler(ev: any): void { }
  seleccionaFile(ev: any): void {
    this.loadingDialog = true;
    this.archivo = ev.files[0];
    this.cdr.detectChanges();
  }
  borraFile(ev: any): void {
    this.archivo = undefined;
    this.listadoProps = [];
    this.csvData = [];
    document.getElementById('call-clear-callback')?.click();
  }
  reconoceTipoListado(tipo: TipoListado.Propiedades): void {
    this.listadoProps = [
      { label: 'Nombre', valor: tipo.nombre + tipo.extension },
      { label: 'Tipo', valor: tipo.tipo },
      { label: 'Origen', valor: tipo.origen },
      { label: 'Formato', valor: tipo.formato },
      { label: 'Tamaño', valor: this.formatSize(this.archivo ? this.archivo?.size : 0) },
      { label: 'Size', valor: (this.archivo ? this.archivo?.size : 0) },
    ];
    this.data.apiGet(this.loadList, { accion: 'duplicado', propiedades: JSON.stringify(this.listadoProps) })
      .subscribe((resp: any) => {
        this.loadingDialog = false;
        const dupe: Dupe = resp.duplicado;
        if (Object.values(dupe).findIndex((v: string | boolean) => v != false) > -1) {
          let mensaje: string = '<p class="mensaje-confirma-reemplazo">Ya existe un documento con el mismo nombre (';
          mensaje += this.extraeProp('Nombre') + ') en el RUND';
          if (dupe.ruta) mensaje += ', del mismo tipo (' + this.extraeProp('Tipo') + ')';
          if (dupe.size) mensaje += ', con el mismo contenido';
          if (typeof dupe.creado == 'string') mensaje += ', creado el ' + (new Date(dupe.creado)).toLocaleDateString();
          mensaje += '.</p><p class="resalto-confirma-reemplazo">¿Desea continuar y reemplazar el existente?</p>';
          this.listadoProps.push({ label: 'Uuid', valor: dupe.uuid });
          this.confirmarReemplazo(mensaje);
        }
        this.cdr.detectChanges();
      });
  }
  recibeCSV(csv: Array<string | number>[]): void {
    this.csvData = csv;
  }
  generaCSV(csv: Array<string | number>[]): { archivo: File, propiedades: ListadoProps[] } {
    const dataArray: string[] = [];
    csv.forEach((fila: any[]) => {
      const filas: Array<string | number> = [];
      fila.forEach((celda: string | number) => filas.push('"' + celda.toString().replace(/"/g, '""') + '"'));
      dataArray.push(filas.join(','));
    });
    const csvPlano: string = dataArray.join('\n');
    const nombreCsv: string = this.extraeProp('Nombre').split('.')[0] + '.csv';
    const blob: Blob = new Blob([csvPlano], { type: 'text/csv' });
    const file: File = new File([blob], nombreCsv, { type: 'text/csv' });
    const propiedades: ListadoProps[] = [
      { label: 'Nombre', valor: nombreCsv },
      { label: 'Tipo', valor: this.extraeProp('Tipo') },
      { label: 'Origen', valor: 'RUND Side-car' },
      { label: 'Formato', valor: 'CSV' },
      { label: 'Tamaño', valor: this.formatSize(file.size) },
      { label: 'Size', valor: file.size },
    ];
    return { archivo: file, propiedades: propiedades };
  }
  confirmarReemplazo(mensaje: string): void {
    this.confirmationService.confirm({
      header: 'Documento existente en el RUND',
      message: mensaje,
      icon: 'pi pi-exclamation-triangle',
      acceptIcon: 'pi pi-check',
      acceptLabel: 'Continuar',
      acceptButtonStyleClass: 'separado',
      rejectIcon: 'pi pi-times',
      rejectLabel: 'Descartar documento',
      rejectButtonStyleClass: 'p-button-text separado',
      defaultFocus: 'reject',
      accept: () => {
        this.listadoProps.push({ label: 'Duplicado', valor: true });
        this.listadoProps.push({ label: 'Comentario', valor: '' });
      },
      reject: () => this.borraFile(null),
    });
  }
  cargaCorrecta(): void {
    this.confirmationService.confirm({
      header: 'Documento cargado correctamete',
      message: 'El documento ha sido cargado exitosamente.',
      icon: 'pi pi-verified',
      acceptLabel: 'Cerrar',
      rejectVisible: false,
      accept: () => this.borraFile(null),
    });
  }
  errorCarga(resp: any): void {
    this.loadingDialog = false;
    this.confirmationService.confirm({
      header: 'Error en la carga del documento',
      message: 'Ha habido un error en la carga del documento. Informe al administrador del sistema:<br>' + JSON.stringify(resp),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cerrar',
      rejectVisible: false,
    });
    this.cdr.detectChanges();
  }
  formatSize(bytes: number): string {
    const k: number = 1024;
    const dm: number = 3;
    if (bytes === 0) return `0 KB`;
    const i: number = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedSize: number = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${formattedSize} KB`;
  }
  extraeProp(label: string): string {
    const prop: ListadoProps | undefined = this.listadoProps.find((p: ListadoProps) => p.label == label);
    return prop ? prop.valor : '';
  }
}
