import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Chart } from '@componentes/chart/chart';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { ChartData, ChartOptions, DataCategoria, DataChart, Data } from '@servicios/data';

@Component({
  selector: 'mgp-dashboard',
  imports: [
    PrimengModule,
    Chart,
    PipesModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  categorias!: DataCategoria[];
  private platID = inject(PLATFORM_ID);
  private data = inject(Data);
ngOnInit(): void {
    this.init();
  }
  init(): void {
    if (isPlatformBrowser(this.platID)) {
      if (this.data.dataCategorias) {
        this.categorias = this.data.dataCategorias.filter((d:DataCategoria) => d.label !== null && d.label !== 'Documentos'); // Si no tiene label, no se incluye
        
      } else {
        this.data.getCategorias().subscribe((resp: DataCategoria[]) => {
          this.categorias = this.data.setCategorias(resp).filter((d:DataCategoria) => d.label !== null && d.label !== 'Documentos'); // Si no tiene label, no se incluye
          
        });
      }
    }
  }
  calculaTotales(numCat:number):{ label:string, cantidad:number } {
    const cat:DataCategoria = this.categorias[numCat];
    const label:string = cat.label as string;
    let cantidad = 0;
    if (cat.children && cat.children[0].children && cat.children[0].children[0].children)
      cat.children[0].children[0].children.forEach((hijo:any) => cantidad += hijo.numDocs);
    return { label:label, cantidad:cantidad };
  }
  nodeData(nodo: DataCategoria, labelData:string | undefined): DataChart {
    const documentStyle: CSSStyleDeclaration = isPlatformBrowser(this.platID)
      ? getComputedStyle(document.documentElement)
      : ({ getPropertyValue: () => '' } as any);
    const textColor: string = documentStyle.getPropertyValue('--p-text-color');
    const nombre: string = nodo.label ?? '';
    const data: ChartData = { labels: [], datasets: [{ label: (labelData as string), data: [], backgroundColor: [], hoverBackgroundColor: [] }] };
    const tipoChart: 'pie' | 'bar' = nodo.children && nodo.children?.length > 6 ? 'bar' : 'pie';
    this.data.chartColors = this.data.chartColors.length < 22 ? this.data.chartColors.concat(this.data.chartColors) : this.data.chartColors;
    nodo.children?.forEach((subnodo: DataCategoria, num: number) => {
      data.labels.push(subnodo.label ?? '');
      data.datasets[0].data.push(subnodo.numDocs ?? 0);
      data.datasets[0].backgroundColor.push(documentStyle.getPropertyValue('--p-' + this.data.chartColors[num] + '-500'));
      data.datasets[0].hoverBackgroundColor.push(documentStyle.getPropertyValue('--p-' + this.data.chartColors[num] + '-300'));
    });
    const pos: string = data.labels.join('').length > 200 ? 'left' : 'top';
    const opciones: ChartOptions = {
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            color: textColor,
          },
          position: pos
        }
      }
    };
    return { nombre, data, opciones, tipoChart };
  }
  private sumaDocs(nodo: DataCategoria, numDocs = 0): number {
    if (nodo.numDocs) numDocs += nodo.numDocs;
    if (nodo.children) {
      nodo.children.forEach((subnodo: DataCategoria) => {
        numDocs = this.sumaDocs(subnodo, numDocs);
      });
    }
    return numDocs;
  }
  suficientesNodos(nodo: DataCategoria): boolean {
    const _hijos: number = nodo.children ? nodo.children.length : 0;
    const _numDocs: number = this.sumaDocs(nodo);
    return true;
    //return numDocs > (hijos * 5) && hijos > 1;
  }
}
