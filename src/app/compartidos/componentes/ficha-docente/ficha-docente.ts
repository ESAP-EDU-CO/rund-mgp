import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PipesModule } from '@modulos/pipes/pipes-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Data, DataCategoria } from '@servicios/data';

interface ModeloCategorias {
  label: string;
  value: string;
  children?: ModeloCategorias[];
}
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
export class FichaDocente implements OnChanges {
  @Input() docente: string[] = [];
  @Input() labels: string[] = [];
  @Input() claves: string[] = [];
  @Output() validado: EventEmitter<string[]> = new EventEmitter<string[]>();
  private data: Data = inject(Data);
  private catPrefix: string = '/okm:categories/RUND/DOCENTES/';
  private categorias: ModeloCategorias[] = [];
  private datosProfesor: { label: string, valor: string }[] = [];
  private convCat: { [key: string]: string } = {
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
  categoriasProfesor: Ficha.Panel[] = [];
  constructor() {
    this.data.getCategorias().subscribe((resp: DataCategoria[]) => {
      const cat: DataCategoria[] = this.data.setCategorias(resp)
        .find((cat: DataCategoria) => cat.label == 'Docentes')?.children || [];
      if (cat.length > 0) this.categorias = this.mapDataCategorias(cat);
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['docente'] && !changes['docente'].isFirstChange() && this.docente && this.docente.length > 0) {
      this.labels = this.labels.map((l: string) => this.convCat[l] || l);
      this.claves = this.claves.map((l: string) => this.convCat[l] || l);
      this.cargarDocente();
    }
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
      console.warn('Datos incompletos para cargar la ficha del docente.');
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
            return this.compara(this.simp(dato.label), this.simp(selector.label)) && this.compara(this.simp(dato.valor), this.simp(opcion.label));
          });
          if (opcionElegida) selector.selected = selector.tipo == 'single' ? opcion : [opcion];
        });
      });
    });
    this.setCategorias();
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
  /**
   * Simplifica una cadena de texto para comparación:
   * 1. Elimina espacios al inicio y al final.
   * 2. Normaliza a formato ASCII (elimina tildes y diéresis).
   * 3. Reemplaza espacios por guiones bajos.
   * 4. Convierte a mayúsculas.
   * @param texto La cadena a simplificar.
   * @returns La cadena simplificada.
   */
  private simp(texto: string): string {
    if (!texto) {
      return '';
    }
    return texto
      .replace(/\(.*\)/g, '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
  }
  /**
   * Compara dos cadenas y devuelve un puntaje de similitud entre 0 y 1.
   * Utiliza la distancia de Levenshtein.
   * @param a Primera cadena.
   * @param b Segunda cadena.
   * @returns Un número entre 0 (sin similitud) y 1 (completamente iguales).
   */
  private compara(a: string, b: string, l: number = 0.7): boolean {
    const maxLength: number = Math.max(a.length, b.length);
    if (maxLength === 0) return true;
    if (b.includes(a)) return true;
    const distance: number = this.levenshtein(a, b);
    const nivel: number = 1 - distance / maxLength;
    return nivel >= l;
  }
  /**
   * Calcula la distancia de Levenshtein entre dos cadenas.
   * @param a Primera cadena.
   * @param b Segunda cadena.
   * @returns La distancia de Levenshtein.
   */
  private levenshtein(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j += 1) {
      matrix[j][0] = j;
    }
    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    return matrix[b.length][a.length];
  }
}
