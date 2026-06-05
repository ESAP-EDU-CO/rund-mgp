import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DataCategoria, DatoDemografico, DatoArchivo } from '@servicios/data';
import { LoggerService } from '@servicios/logger.service';
import { simp, compara } from '@librerias/textos';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ModeloCategorias {
  label: string;
  value: string;
  children?: ModeloCategorias[];
}
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Ficha {
  export interface Opcion {
    label: string;
    value: string;
  }
  export interface Selector {
    label: string;
    options: Opcion[];
    tipo: 'single' | 'multiple';
    id: string;
    selected: Opcion | Opcion[];
  }
  export interface Panel {
    label: string;
    selectores: Selector[];
    requerido: boolean;
    validado: boolean;
  }
}

@Component({
  selector: 'mgp-ficha-docente',
  imports: [
    PrimengModule,
    FormsModule,
    PipesModule,
  ],
  templateUrl: './ficha-docente.html',
  styleUrl: './ficha-docente.scss'
})
export class FichaDocente implements OnChanges, OnDestroy {
  @Input() docente: string[] = [];
  @Input() labels: string[] = [];
  @Input() claves: string[] = [];
  @Input() infoProfesor: DatoDemografico = { archivosProfesor: [], datosDemograficos: [] }
  @Input() archivosProfesor: DatoArchivo[] = [];
  @Input() cedula = '';

  get archivosIAClasificados(): DatoArchivo[] {
    return this.archivosProfesor.filter(a => a.ia_clasificado);
  }
  @Output() validado: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() fechaNacimientoEmitida: EventEmitter<string | null> = new EventEmitter<string | null>();
  fechaNacimiento: Date | null = null;
  readonly hoy = new Date();
  extraccionesDocente: any[] = [];
  loadingExtracciones = false;
  validacionIssues: any[] = [];
  validacionScore: number | null = null;
  validacionResumen: any = null;
  loadingValidacion = false;
  validacionRealizada = false;
  private destroy$ = new Subject<void>();
  private data: Data = inject(Data);
  private logger: LoggerService = inject(LoggerService);
  private catPrefix = '/okm:categories/RUND/DOCENTES/';
  private categorias: ModeloCategorias[] = [];
  private datosProfesor: { label: string, valor: string }[] = [];
  private convCat: Record<string, string> = {
    'Nivel de Formación': 'Nivel educativo'
  };
  private singleCat: string[] = [
    'PERFIL_DOCENTE/GENERO',
    'PERFIL_DOCENTE/GRUPO_ETNICO',
    'PERFIL_DOCENTE/NIVEL_EDUCATIVO',
    'PERFIL_DOCENTE/RANGO_ETARIO',
    'VINCULACION_Y_CATEGORIA/CATEGORIA',
    'VINCULACION_Y_CATEGORIA/VINCULACION',
  ];
  private catProfesor: string[] = [];
  loading = true;
  categoriasProfesor: Ficha.Panel[] = [];
  constructor() {
    this.data.getCategorias().subscribe((resp: DataCategoria[]) => {
      const cat: DataCategoria[] = this.data.setCategorias(resp)
        .find((cat: DataCategoria) => cat.label == 'Docentes')?.children || [];
      if (cat.length > 0) this.categorias = this.mapDataCategorias(cat);
      this.cargarDocente();
      this.loading = false;
      
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['docente'] && this.docente && this.docente.length > 0) || changes['infoProfesor']) {
      this.actualizaDatos();
      const fechaNacStr: string | undefined = (this.infoProfesor as any)?.['FECHA_NACIMIENTO'];
      if (fechaNacStr) this.fechaNacimiento = new Date(fechaNacStr + 'T00:00:00');
    }
    if (changes['cedula'] && this.cedula) {
      this.cargarExtracciones();
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private actualizaDatos(): void {
    this.validado.emit([]);
    this.labels = this.labels.map((l: string) => this.convCat[l] || l);
    this.claves = this.claves.map((l: string) => this.convCat[l] || l);
    this.cargarDocente();
  }
  setCategorias(): void {
    this.catProfesor = [];
    this.categoriasProfesor.forEach((panel: Ficha.Panel) => {
      panel.validado = (panel.requerido && panel.selectores.every((selector: Ficha.Selector) => selector.selected)) ||
        (!panel.requerido && panel.selectores.some((selector: Ficha.Selector) => selector.selected));
      panel.selectores.forEach((selector: Ficha.Selector) => {
        if (selector.selected) {
          if (Array.isArray(selector.selected)) {
            selector.selected.forEach((opcion: Ficha.Opcion) => {
              this.catProfesor.push(opcion.value);
            });
          } else {
            this.catProfesor.push(selector.selected.value);
          }
        }
      });
    });
    const panelesValidados: number = this.categoriasProfesor.filter((panel: Ficha.Panel) => panel.validado).length;
    if (panelesValidados == this.categoriasProfesor.length) this.validado.emit(this.catProfesor);
  }
  onFechaNacimientoChange(fecha: Date | null, numPanel: number, numSelector: number): void {
    this.fechaNacimientoEmitida.emit(fecha ? fecha.toISOString().split('T')[0] : null);
    if (!fecha) return;
    const edad = this.calcularEdad(fecha);
    const selector = this.categoriasProfesor[numPanel].selectores[numSelector];
    const opcion = selector.options.find(o => this.edadEnRango(edad, o.label));
    if (opcion) { selector.selected = opcion; this.setCategorias(); }
  }
  private calcularEdad(fechaNac: Date): number {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const m = hoy.getMonth() - fechaNac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
    return edad;
  }
  private edadEnRango(edad: number, label: string): boolean {
    const nums = label.match(/\d+/g)?.map(Number) || [];
    if (nums.length === 1) return edad >= nums[0];
    if (nums.length >= 2) return edad >= nums[0] && edad <= nums[1];
    return false;
  }
  private cargarDocente(): void {
    this.datosProfesor = [];
    if (this.docente.length > 0 && this.labels.length > 0 && this.claves.length > 0) {
      this.labels.forEach((label: string) => {
        if (this.claves.includes(label)) {
          const valor: string = this.docente[this.labels.indexOf(label)] || 'NA';
          this.datosProfesor.push({ label, valor });
        }
      });
      this.completaDatos();
    } else {
      this.logger.warn('Datos incompletos para cargar la ficha del docente.');
    }
  }
  private completaDatos(): void {
    this.categoriasProfesor = this.categorias.map((panel: ModeloCategorias) => {
      return {
        label: panel.label,
        selectores: panel.children?.map((selector: ModeloCategorias) => {
          return {
            id: selector.value,
            label: selector.label,
            tipo: this.singleCat.includes(selector.value) ? 'single' : 'multiple',
            options: selector.children?.map((opcion: ModeloCategorias) => ({
              label: opcion.label,
              value: opcion.value,
            })),
          }
        }),
      }
    }) as Ficha.Panel[];
    this.categoriasProfesor.forEach((panel: Ficha.Panel) => {
      const requerido: boolean = panel.selectores.some((selector: Ficha.Selector) => selector.tipo == 'single');
      panel.requerido = requerido;
      panel.validado = false;
      panel.selectores.forEach((selector: Ficha.Selector) => {
        selector.options.forEach((opcion: Ficha.Opcion) => {
          const opcionElegida: boolean = this.datosProfesor.some(dato => {
            return compara(simp(dato.label), simp(selector.label)) && compara(simp(dato.valor), simp(opcion.label));
          });
          if (opcionElegida) {
            selector.selected = selector.tipo == 'single' ? opcion : [opcion];
          } else {
            // Evalúa si existe información relacionada con el profesor en infoProfesor
            const panelLabel: string | undefined = Object.keys(this.infoProfesor).find((key: string) => key == panel.label);
            if (panelLabel) {
              const selectorProf: Record<string, string | string[]> = this.infoProfesor[panelLabel] as Record<string, string | string[]>;
              const selectorLabel: string | undefined = Object.keys(selectorProf).find((key: string) => key == selector.label);
              if (selectorLabel) {
                const opcionProf: string | string[] = selectorProf[selectorLabel];
                const valores: string[] = Array.isArray(opcionProf) ? opcionProf : [opcionProf as string];
                if (!Array.isArray(opcionProf) && selector.tipo == 'single') {
                  const opcionSel: Ficha.Opcion = selector.options.find((opc: Ficha.Opcion) => compara(simp(opc.label), simp(opcionProf as string))) as Ficha.Opcion;
                  if (selector.selected === undefined) selector.selected = opcionSel;
                } else if (selector.tipo == 'multiple') {
                  const opcionSel: Ficha.Opcion[] = valores.map((val: string) => {
                    return selector.options.find((opc: Ficha.Opcion) => compara(simp(opc.label), simp(val))) as Ficha.Opcion;
                  }).filter(Boolean);
                  if (opcionSel.length > 0 && selector.selected === undefined) selector.selected = opcionSel;
                }
              }
            }
          }
        });
      });
    });
    this.setCategorias();
  }
  private cargarExtracciones(): void {
    this.loadingExtracciones = true;
    this.extraccionesDocente = [];
    this.data.getExtraccionDocente(this.cedula, 1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          const docs = resp.documentos ?? [];
          this.extraccionesDocente = docs.filter((d: any) => d.status === 'completado');
          this.loadingExtracciones = false;
        },
        error: () => { this.loadingExtracciones = false; }
      });
  }
  validarDocente(): void {
    if (!this.cedula || this.loadingValidacion) return;
    this.loadingValidacion = true;
    this.validacionRealizada = false;
    this.data.validateDocente(this.cedula)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.validacionIssues   = resp.issues   ?? [];
          this.validacionScore    = resp.score     ?? null;
          this.validacionResumen  = resp.resumen   ?? null;
          this.validacionRealizada = true;
          this.loadingValidacion  = false;
        },
        error: () => { this.loadingValidacion = false; }
      });
  }
  issueSeverity(severidad: string): 'danger' | 'warn' | 'secondary' | 'info' {
    const map: Record<string, 'danger' | 'warn' | 'secondary' | 'info'> = {
      critical: 'danger', high: 'danger', medium: 'warn', low: 'secondary', info: 'info'
    };
    return map[severidad] ?? 'secondary';
  }
  scoreSeverity(score: number): 'success' | 'warn' | 'danger' {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warn';
    return 'danger';
  }
  nombreDocumento(filePath: string): string {
    return filePath ? (filePath.split('/').pop() ?? filePath) : '—';
  }
  labelTipo(tipo: string): string {
    return this.data.labels[tipo] ?? this.data.labels[tipo?.toUpperCase()] ?? (tipo?.replace(/_/g, ' ') ?? '—');
  }
  get coberturaTipos(): { tipo: string; label: string; presente: boolean }[] {
    const ALIASES: Record<string, string[]> = {
      cedula: ['cedula', 'CEDULA', 'CEDULA_CIUDADANIA', 'DATOS_BASICOS'],
      certificado_laboral: [
        'certificado_laboral', 'EXPERIENCIA_DOCENTE', 'EXPERIENCIA_LABORAL',
        'CERTIFICADO_LABORAL', 'CONSTANCIA_LABORAL', 'CERTIFICADO_DOCENTE',
        'EXPERIENCIA_INVESTIGATIVA',
      ],
      certificado_academico: [
        'certificado_academico', 'TITULOS_DE_FORMACION', 'FORMACION_ACADEMICA',
        'CERTIFICADO_ACADEMICO', 'TITULO_UNIVERSITARIO', 'DIPLOMA', 'TITULO',
        'ESPECIALIZACION', 'MAESTRIA', 'DOCTORADO', 'POSTDOCTORADO',
        'PRODUCTIVIDAD_ACADEMICA', 'FORMACION_NO_FORMAL_ADICIONAL',
      ],
      resolucion: ['resolucion', 'RESOLUCION', 'RESOLUCION_NOMBRAMIENTO', 'ACTO_ADMINISTRATIVO'],
      acta: ['acta', 'ACTA', 'ACTA_EVALUACION', 'EVALUACION_DOCENTE', 'ESTUDIO_DE_HOJA_DE_VIDA'],
      certificado_idiomas: [
        'certificado_idiomas', 'IDIOMAS', 'CERTIFICADO_IDIOMAS',
        'SUFICIENCIA_IDIOMAS', 'CERTIFICACION_IDIOMAS',
      ],
    };
    const TIPOS = [
      { tipo: 'cedula',                label: 'Cédula' },
      { tipo: 'certificado_laboral',   label: 'Cert. Laboral' },
      { tipo: 'certificado_academico', label: 'Cert. Académico' },
      { tipo: 'resolucion',            label: 'Resolución' },
      { tipo: 'acta',                  label: 'Acta Evaluación' },
      { tipo: 'certificado_idiomas',   label: 'Cert. Idiomas' },
    ];
    return TIPOS.map(t => ({
      ...t,
      presente: this.extraccionesDocente.some(d =>
        (ALIASES[t.tipo] ?? [t.tipo]).includes(d.tipo_documento)
      ),
    }));
  }
  get coberturaTiposPresentes(): number {
    return this.coberturaTipos.filter(t => t.presente).length;
  }
  confianzaSeverity(score: number): 'success' | 'warn' | 'danger' {
    if (score > 85) return 'success';
    if (score > 60) return 'warn';
    return 'danger';
  }
  private mapDataCategorias(categorias: DataCategoria[]): ModeloCategorias[] {
    return categorias.map((categoria: DataCategoria) => {
      const modelo: ModeloCategorias = {
        label: categoria.label || '',
        value: categoria.path?.replace(this.catPrefix, '') || '',
      };
      if (categoria.children && categoria.children.length > 0) {
        modelo.children = this.mapDataCategorias(categoria.children);
      }
      return modelo;
    });
  }
}
