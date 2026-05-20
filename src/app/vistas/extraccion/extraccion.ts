import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data } from '@servicios/data';
import { forkJoin } from 'rxjs';

interface CategoriaStats {
  nombre: string;
  total: number;
  completado: number;
  procesando: number;
  error: number;
  pendiente: number;
}

@Component({
  selector: 'mgp-extraccion',
  imports: [CommonModule, PrimengModule],
  templateUrl: './extraccion.html',
  styleUrl: './extraccion.scss'
})
export class Extraccion implements OnInit {
  private dataServicio = inject(Data);

  loading = false;
  totalDocs = 0;
  completados = 0;
  procesando = 0;
  errores = 0;
  pendientes = 0;
  colaActiva = 0;
  tasaExito = 0;
  ultimaActualizacion = '';
  categorias: CategoriaStats[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    forkJoin({
      stats: this.dataServicio.getExtractionStatistics(),
      queue: this.dataServicio.getQueueStats(),
    }).subscribe({
      next: ({ stats, queue }) => {
        const statsData = stats.statistics ?? {};          // unwrap proxy wrapper
        const meta = statsData.metadata ?? {};
        const byStatus = statsData.statistics?.by_status ?? {};
        const byCategory = statsData.statistics?.by_category ?? {};

        this.totalDocs = meta.total_documents ?? 0;
        this.completados = byStatus.completado ?? 0;
        this.procesando = byStatus.procesando ?? 0;
        this.errores = byStatus.error ?? 0;
        this.pendientes = byStatus.pendiente ?? 0;
        this.tasaExito = this.totalDocs > 0
          ? Math.round((this.completados / this.totalDocs) * 100)
          : 0;
        this.ultimaActualizacion = meta.last_updated
          ? new Date(meta.last_updated).toLocaleString('es-CO')
          : '—';

        this.categorias = Object.entries(byCategory).map(([nombre, v]: [string, any]) => ({
          nombre,
          total: v.total ?? 0,
          completado: v.completado ?? 0,
          procesando: v.procesando ?? 0,
          error: v.error ?? 0,
          pendiente: v.pendiente ?? 0,
        }));

        this.colaActiva = queue.queue?.queue_size ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
