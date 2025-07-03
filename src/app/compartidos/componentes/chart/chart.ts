import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { DataChart } from '@servicios/data';

@Component({
  selector: 'mgp-chart',
  imports: [
    PrimengModule,
    NgClass,
  ],
  templateUrl: './chart.html',
  styleUrl: './chart.scss'
})
export class Chart {
  @Input() data!: DataChart;
}
