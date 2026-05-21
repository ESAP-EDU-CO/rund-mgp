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

  get labels(): Record<string, string> { return this.dataServicio.labels; }

  labelCategoria(nombre: string): string {
    return this.labels[nombre] ?? this.labels[nombre.toUpperCase()] ?? nombre;
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    forkJoin({
      stats: this.dataServicio.getExtraccionStats(),
      queue: this.dataServicio.getQueueStats(),
    }).subscribe({
      next: ({ stats, queue }) => {
        const byStatus   = stats.por_estado   ?? {};
        const byCategory = stats.por_categoria ?? {};

        this.totalDocs  = stats.total_documentos ?? 0;
        this.completados = byStatus.completado ?? 0;
        this.procesando  = byStatus.procesando ?? 0;
        this.errores     = byStatus.error      ?? 0;
        this.pendientes  = byStatus.pendiente  ?? 0;
        this.tasaExito   = stats.tasa_exito    ?? 0;
        this.ultimaActualizacion = stats.ultima_actualizacion
          ? new Date(stats.ultima_actualizacion).toLocaleString('es-CO')
          : '—';

        this.categorias = Object.entries(byCategory).map(([nombre, v]: [string, any]) => ({
          nombre,
          total:      v.total      ?? 0,
          completado: v.completado ?? 0,
          procesando: v.procesando ?? 0,
          error:      v.error      ?? 0,
          pendiente:  v.pendiente  ?? 0,
        }));

        this.colaActiva = queue.queue?.queue_size ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
