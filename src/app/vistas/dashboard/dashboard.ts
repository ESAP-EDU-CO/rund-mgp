import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
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
  constructor(
    @Inject(PLATFORM_ID) private platID: any,
    private data: Data,
    private cdr: ChangeDetectorRef,
  ) { }
  ngOnInit(): void {
    this.init();
  }
  init(): void {
    if (isPlatformBrowser(this.platID)) {
      if (this.data.dataCategorias) {
        this.categorias = this.data.dataCategorias;
        this.cdr.detectChanges();
      } else {
        this.data.getCategorias().subscribe((resp: DataCategoria[]) => {
          this.categorias = this.data.setCategorias(resp);
          this.cdr.detectChanges();
        });
      }
    }
  }
  nodeData(nodo: DataCategoria): DataChart {
    const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    const textColor: string = documentStyle.getPropertyValue('--p-text-color');
    const nombre: string = nodo.label ?? '';
    const data: ChartData = { labels: [], datasets: [{ label: 'Número de docentes', data: [], backgroundColor: [], hoverBackgroundColor: [] }] };
    const tipoChart: 'pie' | 'bar' = nodo.children && nodo.children?.length > 6 ? 'bar' : 'pie';
    this.data.chartColors = this.data.chartColors.length < 22 ? this.data.chartColors.concat(this.data.chartColors) : this.data.chartColors;
    nodo.children?.forEach((subnodo: DataCategoria, num: number) => {
      data.labels.push(subnodo.label ?? '');
      if (subnodo.numDocs) data.datasets[0].data.push(subnodo.numDocs);
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
}
