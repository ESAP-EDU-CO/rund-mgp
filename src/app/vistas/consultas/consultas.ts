import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart } from '@componentes/chart/chart';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { ChartData, ChartDataset, ChartOptions, DataCategoria, DataChart, Data, DataTabla, FilaTabla } from '@servicios/data';
import { FileServicio } from '@servicios/file';
import { MenuItem, SelectItem, SelectItemGroup } from 'primeng/api';

interface DataConsulta {
  label: string | undefined;
  opciones: SelectItemGroup[];
  seleccion: string[];
  dataTabla: DataTabla | undefined;
  dataChart: DataChart;
};

@Component({
  selector: 'mgp-consultas',
  imports: [
    PrimengModule,
    FormsModule,
    Chart,
    PipesModule,
  ],
  templateUrl: './consultas.html',
  styleUrl: './consultas.scss'
})
export class Consultas implements OnInit {
  private data: Data = inject(Data);
  private fileServicio: FileServicio = inject(FileServicio);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private platID = inject(PLATFORM_ID);
  dataConsulta: DataConsulta[] = [];
  placeholders: string[] = ['Variables eje X', 'Variables eje Y'];
  numPanel: number = -1;
  menuDescarga: MenuItem[] = [
    { label: 'PDF', icon: 'pi pi-file-pdf', command: () => this.getConsultaFile('pdf') },
    { label: 'Excel', icon: 'pi pi-file-excel', command: () => this.getConsultaFile('xlsx') },
  ];
  esperando: boolean = false;
  mensajeEspera: string = '';
  datosSuficientes: boolean = false;
  ngOnInit(): void {
    this.data.dataCategorias ?
      this.creaOpciones() :
      this.data.getCategorias().subscribe((resp: DataCategoria[]) => {
        const categorias: DataCategoria[] = this.data.setCategorias(resp);
        this.datosSuficientes = categorias ? categorias.length > 1 && this.suficientesNodos(categorias[0]) : false;
        this.creaOpciones();
      });
  }
  creaOpciones(): void {
    this.dataConsulta = [];
    const categorias: DataCategoria[] = (this.data.dataCategorias as DataCategoria[]);
    this.datosSuficientes = categorias ? categorias.length > 1 && this.suficientesNodos(categorias[0]) : false;
    this.data.dataCategorias?.forEach((supercat: DataCategoria) => {
      if (supercat.label) {
        const opciones: SelectItemGroup[] = [];
        supercat.children?.forEach((categoria: DataCategoria) => {
          const hijos: boolean[] | undefined = categoria.children?.map((e: DataCategoria) => e.children ? true : false);
          const conHijos: boolean = hijos ? hijos.reduce((a: boolean, c: boolean) => a && c ? true : false) : false;
          const solo: SelectItem = { label: categoria.label as string, value: categoria.key };
          conHijos ?
            opciones.push(this.tree2sel(categoria)) :
            opciones.push({ label: categoria.label as string, items: [solo], value: categoria.key });
        });
        const panel: DataConsulta = {
          label: supercat.label,
          opciones: opciones,
          seleccion: ['', ''],
          dataTabla: undefined,
          dataChart: {} as DataChart,
        };
        if (supercat.label !== 'Documentos') this.dataConsulta.push(panel); // Las categorías de los documentos se deben organizar mejor
      }
    });
    this.cdr.detectChanges();
  }
  creaTabla(panel: DataConsulta): void {
    panel.dataTabla = undefined;
    if (!panel.seleccion.includes('')) {
      this.data.getCruce(panel.seleccion.map((s: string) => this.findData(s)?.uuid as string)).subscribe((_dataTabla: DataTabla) => {
        panel.dataTabla = _dataTabla;
        this.creaChart(panel);
        this.cdr.detectChanges();
      });
    }
  }
  creaChart(panel: DataConsulta): void {
    if (!isPlatformBrowser(this.platID)) return;
    const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    const textColor: string = documentStyle.getPropertyValue('--p-text-color');
    const datasets: ChartDataset[] = [];
    panel.dataTabla?.cols.forEach((col: string, nCol: number) => {
      datasets.push({
        label: col,
        data: panel.dataTabla?.filas.map((f: FilaTabla) => f.data[nCol]) as number[],
        backgroundColor: [this.data.getChartBackgroundColors(nCol)],
        hoverBackgroundColor: [this.data.getChartBackgroundColors(nCol, true)],
      });
    });
    const chartData: ChartData = {
      labels: panel.dataTabla?.filas.map((f: FilaTabla) => f.label) as string[],
      datasets: datasets
    };
    const chartOptions: ChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
    }
    panel.dataChart = {
      nombre: panel.dataTabla?.nomCol + ' / ' + panel.dataTabla?.nomFil,
      tipoChart: 'bar',
      data: chartData,
      opciones: chartOptions,
    };
  }
  tree2sel(nodo: DataCategoria): SelectItemGroup {
    const selGrupo: SelectItemGroup = { label: nodo.label as string, items: [], value: nodo.key };
    nodo.children?.forEach((subnodo: DataCategoria) => selGrupo.items.push(this.tree2sel(subnodo) as SelectItem));
    return selGrupo;
  }
  findData(key: string, nodes: DataCategoria[] | undefined = this.data.dataCategorias): DataCategoria | undefined {
    if (nodes) {
      for (const node of nodes) {
        if (node.key === key) return node;
        if (node.children) {
          const result: DataCategoria | undefined = this.findData(key, node.children);
          if (result) return result;
        }
      }
    }
    return undefined;
  }
  getConsultaFile(tipo: string): void {
    if (this.numPanel < 0) {
      console.log('NO SE HA DEFINIDO EL PANEL ACTUAL');
      return;
    }
    const panel: DataConsulta = this.dataConsulta[this.numPanel];
    let tipoArchivo: string = 'archivo';
    if (tipo === 'pdf') tipoArchivo = 'PDF';
    if (tipo === 'xlsx') tipoArchivo = 'Excel';
    this.esperando = true;
    this.cdr.detectChanges();
    this.mensajeEspera = 'Descargando ' + tipoArchivo + '...';
    const nombre: string = 'RUND - Consulta de ' + panel.dataTabla?.nomCol + ' contra ' + panel.dataTabla?.nomFil + '.' + tipo;
    this.data.getConsultaFile(tipo, panel.dataTabla as DataTabla).subscribe((blob: Blob) => {
      if (blob.type == 'text/html; charset=utf-8') {
        blob.text()
          .then((v: string) => console.log(v))
          .catch((e: any) => console.log(e));
        return;
      }
      this.fileServicio.descarga(blob, nombre);
      this.esperando = false;
      this.cdr.detectChanges();
      if (tipo == 'pdf') {
        this.data.delTemp().subscribe((resp: { borrados: string[], aBorrar: string[] }) => {
          if (!resp || resp.borrados.length != resp.aBorrar.length)
            console.log("Error: no se limpiaron todos los archivos temporales, solo ", resp.borrados.join(', '));
        });
      }
    });
  }
  private sumaDocs(nodo: DataCategoria, numDocs: number = 0): number {
    if (nodo.numDocs) numDocs += nodo.numDocs;
    if (nodo.children) {
      nodo.children.forEach((subnodo: DataCategoria) => {
        numDocs = this.sumaDocs(subnodo, numDocs);
      });
    }
    return numDocs;
  }
  private suficientesNodos(nodo: DataCategoria): boolean {
    const hijos: number = nodo.children ? nodo.children.length : 0;
    const numDocs: number = this.sumaDocs(nodo);
    return numDocs > (hijos * 5) && hijos > 1;
  }
}
