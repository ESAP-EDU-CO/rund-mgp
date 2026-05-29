import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, PrimengModule],
  templateUrl: './extraccion.html',
  styleUrl: './extraccion.scss'
})
export class Extraccion implements OnInit {
  private dataServicio = inject(Data);

  // ─── Estado de carga ──────────────────────────────────────────────────────
  loading   = false;
  resetting = false;
  retrying  = false;

  // ─── Métricas del índice ──────────────────────────────────────────────────
  totalDocs          = 0;
  completados        = 0;
  procesando         = 0;
  errores            = 0;
  pendientes         = 0;
  colaActiva         = 0;
  tasaExito          = 0;
  ultimaActualizacion = '';
  categorias: CategoriaStats[] = [];

  // ─── Scheduler ───────────────────────────────────────────────────────────
  schedulerHabilitado      = false;
  schedulerHoraInicio      = 22;
  schedulerHoraFin         = 6;
  schedulerUltimoRun       = '';
  schedulerCargando        = false;
  schedulerConfigVisible   = false;
  schedulerHoraInicioEditar = 22;
  schedulerHoraFinEditar    = 6;

  // ─── Labels ───────────────────────────────────────────────────────────────
  get labels(): Record<string, string> { return this.dataServicio.labels; }

  labelCategoria(nombre: string): string {
    return this.labels[nombre] ?? this.labels[nombre.toUpperCase()] ?? nombre;
  }

  ngOnInit(): void {
    this.cargar();
  }

  // ─── Carga principal ──────────────────────────────────────────────────────
  cargar(): void {
    this.loading = true;
    forkJoin({
      stats:     this.dataServicio.getExtraccionStats(),
      queue:     this.dataServicio.getQueueStats(),
      scheduler: this.dataServicio.getSchedulerStatus(),
    }).subscribe({
      next: ({ stats, queue, scheduler }) => {
        // Métricas
        const byStatus   = stats.por_estado   ?? {};
        const byCategory = stats.por_categoria ?? {};

        this.totalDocs   = stats.total_documentos ?? 0;
        this.completados = byStatus.completado    ?? 0;
        this.procesando  = byStatus.procesando    ?? 0;
        this.errores     = byStatus.error         ?? 0;
        this.pendientes  = byStatus.pendiente     ?? 0;
        this.tasaExito   = stats.tasa_exito       ?? 0;
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

        // Scheduler
        const s = scheduler.scheduler ?? {};
        this.schedulerHabilitado       = s.habilitado    ?? false;
        this.schedulerHoraInicio       = s.hora_inicio   ?? 22;
        this.schedulerHoraFin          = s.hora_fin      ?? 6;
        this.schedulerHoraInicioEditar = this.schedulerHoraInicio;
        this.schedulerHoraFinEditar    = this.schedulerHoraFin;
        this.schedulerUltimoRun        = s.ultimo_run
          ? new Date(s.ultimo_run).toLocaleString('es-CO')
          : '';

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── Acciones de cola ─────────────────────────────────────────────────────
  reencolarErrores(): void {
    this.retrying = true;
    this.dataServicio.retryErrorJobs().subscribe({
      next: () => { this.retrying = false; this.cargar(); },
      error: () => { this.retrying = false; },
    });
  }

  resetearBloqueados(): void {
    this.resetting = true;
    this.dataServicio.resetStuckJobs().subscribe({
      next: () => { this.resetting = false; this.cargar(); },
      error: () => { this.resetting = false; },
    });
  }

  // ─── Scheduler ───────────────────────────────────────────────────────────
  toggleScheduler(): void {
    this.schedulerCargando = true;
    const accion$ = this.schedulerHabilitado
      ? this.dataServicio.pauseScheduler()
      : this.dataServicio.startScheduler();

    accion$.subscribe({
      next: (res) => {
        const s = res.scheduler ?? {};
        this.schedulerHabilitado = s.habilitado ?? !this.schedulerHabilitado;
        this.schedulerCargando   = false;
      },
      error: () => { this.schedulerCargando = false; },
    });
  }

  guardarConfigScheduler(): void {
    this.schedulerCargando = true;
    this.dataServicio.configScheduler(
      this.schedulerHoraInicioEditar,
      this.schedulerHoraFinEditar
    ).subscribe({
      next: (res) => {
        const s = res.scheduler ?? {};
        this.schedulerHoraInicio   = s.hora_inicio ?? this.schedulerHoraInicioEditar;
        this.schedulerHoraFin      = s.hora_fin    ?? this.schedulerHoraFinEditar;
        this.schedulerConfigVisible = false;
        this.schedulerCargando      = false;
      },
      error: () => { this.schedulerCargando = false; },
    });
  }
}
