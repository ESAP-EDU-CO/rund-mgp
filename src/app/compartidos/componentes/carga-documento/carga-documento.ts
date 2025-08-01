import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { simp, compara } from '@librerias/textos';
import { IconsModule } from '@modulos/icons/icons-module';
import { FormsModule } from '@angular/forms';

interface DocumentoCargado {
  ruta: string; // Ruta del archivo
  archivo: File; // Archivo cargado
}
interface DatosCarpeta {
  origen: string[]; // Posibles nombres usados para nombrar la carpeta
  categoria: string; // Categoría del archivo
  label: string; // Etiqueta de categoría para mostrar
}
export interface ArchivoDocente {
  archivo: File; // Archivo a cargar
  taxonomia: DatosCarpeta; // Ruta del archivo en la carpeta del docente
  tipo: string; // La misma taxonomía
  formato: string; // Formato del archivo (ej. 'PDF', 'DOCX', etc.)
  origen: string; // En todos los casos, ONEDRIVE_ESAP
  esCedula: boolean; // Indica si el archivo es la cédula
}

@Component({
  selector: 'mgp-carga-documento',
  imports: [
    PrimengModule,
    NgClass,
    IconsModule,
    FormsModule,
  ],
  templateUrl: './carga-documento.html',
  styleUrl: './carga-documento.scss'
})
export class CargaDocumento {
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef); // Para detectar cambios en la vista cuando se usa Angular Zoneless
  @Input() carpetas: DatosCarpeta[] = [
    { origen: ['DATOS BASICOS'], categoria: 'DATOS_BASICOS', label: 'Datos básicos' },
    { origen: ['TITULOS DE FORMACION', 'FORMACION ACADEMICA'], categoria: 'TITULOS_DE_FORMACION', label: 'Títulos de formación' },
    { origen: ['EXPERIENCIA DOCENTE'], categoria: 'EXPERIENCIA_DOCENTE', label: 'Experiencia docente' },
    { origen: ['EXPERIENCIA LABORAL'], categoria: 'EXPERIENCIA_LABORAL', label: 'Experiencia laboral' },
    { origen: ['EXPERIENCIA INVESTIGATIVA'], categoria: 'EXPERIENCIA_INVESTIGATIVA', label: 'Experiencia investigativa' },
    { origen: ['PRODUCTIVIDAD ACADEMICA', 'PRODUCTIVIDAD INTELECTUAL'], categoria: 'PRODUCTIVIDAD_ACADEMICA', label: 'Productividad académica' },
    { origen: ['DOCUMENTOS INVALIDOS'], categoria: 'DOCUMENTOS_INVALIDOS', label: 'Documentos inválidos' },
    { origen: ['IDIOMAS'], categoria: 'IDIOMAS', label: 'Idiomas' },
    { origen: ['FORMACION NO FORMAL ADICIONAL'], categoria: 'FORMACION_NO_FORMAL_ADICIONAL', label: 'Formación no formal adicional' },
    { origen: ['ESTUDIO DE HOJA DE VIDA'], categoria: 'ESTUDIO_DE_HOJA_DE_VIDA', label: 'Estudio de hoja de vida' },
    { origen: ['DOCUMENTOS ADICIONALES'], categoria: 'DOCUMENTOS_ADICIONALES', label: 'Documentos adicionales' },
  ];
  @Input() mimeTypes: { [key: string]: string }[] = [
    { 'application/pdf': 'PDF' },
    { 'application/msword': 'WORD_DOC' },
    { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'WORD_DOCX' },
    { 'application/vnd.ms-excel': 'EXCEL_XLS' },
    { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'EXCEL_XLSX' },
    { 'application/vnd.ms-powerpoint': 'POWERPOINT_PPTX' },
    { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'POWERPOINT_PPTX' },
    { 'application/vnd.oasis.opendocument.text': 'ODT' },
    { 'application/vnd.oasis.opendocument.spreadsheet': 'ODS' },
    { 'application/vnd.oasis.opendocument.presentation': 'ODP' },
    { 'application/vnd.oasis.opendocument.graphics': 'ODG' },
  ]; // Tipos MIME permitidos
  @Input() archivosCargados: number[] = [];; // Archivo docente que ya se ha cargado, para que se elimine de la lista de archivos a cargar
  @Input() cedulaRequerida: boolean = true; // Indica si se requiere al menos un archivo marcado como cédula
  @Output() documentos: EventEmitter<ArchivoDocente[]> = new EventEmitter<ArchivoDocente[]>(); // Emite los archivos que se deben cargar al componente padre
  @Output() cleanArchivos: EventEmitter<boolean> = new EventEmitter<boolean>(); // Emite un evento para limpiar los archivos cargados
  @Output() todosCargados: EventEmitter<boolean> = new EventEmitter<boolean>(); // Emite un evento cuando todos los archivos han sido cargados
  archivos: ArchivoDocente[] = []; // Lista de archivos que serán cargados al RUND
  dragging: boolean = false; // Indica si se está arrastrando un archivo
  loading: boolean = false; // Indica si se está en el modo de carga de archivos
  progresoCarga(): number {
    if (this.archivos.length === 0) return 0; // Evita división por cero
    const porcentaje: number = Math.floor(this.archivosCargados.length / this.archivos.length * 100);
    if (porcentaje >= 100) {
      this.loading = false; // Detiene el modo de carga si se ha alcanzado el 100%
      this.cdr.detectChanges();
      this.todosCargados.emit(true); // Emite un evento indicando que todos los archivos han sido cargados
      return 100; // Asegura que el porcentaje no supere el 100%
    }
    return porcentaje;
  }
  /**
   * Inicia el proceso de carga de archivos al RUND. Se emite el objeto archivos que es del tipo ArchivoDocente[].
   */
  subir(): void {
    if (!this.hayCedula()) return; // Si es requerido, debe haber al menos un archivo marcado como cédula
    this.loading = true; // Inicia el modo de carga
    this.documentos.emit(this.archivos); // Emite los archivos al componente padre
  }
  /**
   * Verifica si hay al menos un archivo marcado como cédula
   * @return true si hay al menos un archivo marcado como cédula, false en caso contrario
  */
  hayCedula(): boolean {
    return this.cedulaRequerida ? this.archivos.some((a: ArchivoDocente) => a.esCedula) : true;
  }
  /**
   * Limpia uno o todos los archivos de la lista de archivos a cargar
   * @param num Opcional. Número del archivo a limpiar. Si es null (o no se indica), limpia todos los archivos.
   */
  limpiar(num: number | null = null): void {
    this.archivos = this.archivos.filter((v: ArchivoDocente, i: number) => i !== (num ?? i));
    if (this.archivos.length === 0) { // Si se limpian todos los archivos, también se limpia la lista de archivos cargados
      this.cleanArchivos.emit(true); // Emite un evento para limpiar los archivos cargados
    }
    this.cdr.detectChanges();
  }
  /**
   * Marca un archivo como cédula, actualizando su propiedad esCedula; marca todos los demás archivos como no cédula
   * @param ev Evento que contiene el índice del archivo seleccionado
   */
  marcaCedula(ev: any): void {
    this.archivos.forEach((a: ArchivoDocente, i: number) => a.esCedula = i == ev.value);
    this.cdr.detectChanges();
  }
  /**
   * Cambia la carpeta de un archivo cargado, actualizando su taxonomía y tipo
   * @param carpeta La nueva carpeta a la que se moverá el archivo
   * @param numArchivo El índice del archivo en la lista de archivos cargados
   */
  cambiaCarpeta(carpeta: DatosCarpeta, numArchivo: number): void {
    if (numArchivo < 0 || numArchivo >= this.archivos.length) return; // Validar índice
    const archivo: ArchivoDocente = this.archivos[numArchivo];
    archivo.taxonomia = carpeta;
    archivo.tipo = carpeta.categoria;
    this.cdr.detectChanges();
  }
  /**
   * Devuelve el icono correspondiente al tipo de archivo basado en el valor de la variable mimeTypes
   * @param ext Extensión del archivo
   * @returns Nombre del icono a mostrar
   */
  icono(ext: string): string {
    const tipos: string[] = ['pdf', 'word', 'excel', 'powerpoint'];
    const tipo: string = ext.toLowerCase().split('_')[0];
    return tipos.includes(tipo) ? 'file-' + tipo : 'file';
  }
  /**
 * Maneja la selección de carpetas usando un input nativo
 * @param event Evento del input file con webkitdirectory
 */
  seleccionaCarpeta(event: any): void {
    const files: any = event.target.files;
    if (files) this.procesarArchivosConRuta(Array.from(files));
  }
  /**
   * Añade un archivo a la lista de archivos cargados infiriendo los valores a partir de la ruta
   * @param archivo El archivo tipo File
   * @param ruta La ruta original de donde se obtuvo el archivo
   */
  private procesaArchivo(archivo: File, ruta: string): void {
    const mimeType: { [key: string]: string } | undefined = this.mimeTypes.find((m: { [key: string]: string }) => m[archivo.type]);
    if (!mimeType) return; // Si el tipo MIME no está permitido, no procesar el archivo
    const taxOr: string = ruta.trim().replace('/' + archivo.name, '').split('/').pop()?.replace(/\d\.\s/g, '') || 'DOCUMENTOS ADICIONALES';
    const carpeta: DatosCarpeta = this.carpetas.find(
      (c: DatosCarpeta) => c.origen.some((o: string) => compara(simp(o), simp(taxOr)))
    ) || this.carpetas[this.carpetas.length - 1];
    const origen: string = 'ONEDRIVE_ESAP';
    // Normalizar el nombre del archivo para evitar problemas con mayúsculas y minúsculas
    const nombreLimpio = archivo.name.toLowerCase().replace(/\.[^/.]+$/, '');
    // Verificar si el archivo es una cédula basándose en el nombre del archivo
    // Se considera cédula si contiene 'cc', 'cedula' o es un número de cédula válido
    // Un número de cédula válido es un número entre 6 y 11 dígitos
    const contienePalabraClave = nombreLimpio.includes('cc') || nombreLimpio.includes('cedula');
    const esNumeroCedula = /^\d{6,11}$/.test(nombreLimpio);
    const esCedula = (contienePalabraClave || esNumeroCedula) && !this.archivos.some((a: ArchivoDocente) => a.esCedula);
    this.archivos.push({
      archivo: archivo,
      taxonomia: carpeta,
      tipo: carpeta.categoria,
      formato: mimeType[archivo.type],
      origen: origen,
      esCedula: esCedula,
    });
  }
  /**
 * Procesa archivos que ya tienen información de ruta (desde input con webkitdirectory)
 * @param files Array de archivos con webkitRelativePath
 */
  private procesarArchivosConRuta(files: File[]): void {
    files.forEach(file => {
      const ruta = (file as any).webkitRelativePath || file.name;
      this.procesaArchivo(file, ruta);
    });
    this.cdr.detectChanges();
  }
  /**
     * Maneja la selección de archivos y carpetas del FileUpload
     * @param ev Evento del FileUpload de PrimeNG
     */
  async seleccionaDocumentos(ev: any): Promise<void> {
    try {
      // Intentar obtener archivos del evento de diferentes maneras
      let files: FileList | File[] = ev.files;
      // Si ev.files no está disponible, intentar con ev.target.files
      if (!files && ev.target && ev.target.files) {
        files = ev.target.files;
      }
      // Si aún no hay archivos, intentar con el evento original
      if (!files && ev.originalEvent && ev.originalEvent.target && ev.originalEvent.target.files) {
        files = ev.originalEvent.target.target.files;
      }
      if (files) {
        // Convertir FileList a Array si es necesario
        const filesArray: File[] = Array.from(files);
        for (const file of filesArray) await this.procesarArchivo(file);
      }
    } catch (error) {
      console.error('Error al procesar los archivos:', error);
    }
  }
  /**
     * Procesa un archivo individual, extrayendo la ruta completa
     * @param file Archivo a procesar
     */
  private async procesarArchivo(file: File): Promise<void> {
    // Obtener la ruta completa del archivo
    const ruta: string = this.obtenerRutaCompleta(file);
    // Agregar el archivo con su ruta a la lista
    this.procesaArchivo(file, ruta);
    this.cdr.detectChanges();
  }
  /**
     * Extrae la ruta completa del archivo, incluyendo carpetas y subcarpetas
     * @param file Archivo del cual extraer la ruta
     * @returns Ruta completa del archivo
     */
  private obtenerRutaCompleta(file: File): string {
    // Verificar si webkitRelativePath está disponible y no está vacío
    const webkitPath: any = (file as any).webkitRelativePath;
    if (webkitPath && webkitPath.trim() !== '') return webkitPath;
    // Intentar obtener la ruta de otras propiedades del archivo
    const fileName: string = file.name;
    // Si el archivo tiene una ruta en el nombre (algunos browsers la incluyen)
    if (fileName.includes('/') || fileName.includes('\\')) {
      return fileName.replace(/\\/g, '/'); // Normalizar separadores
    }
    // Verificar si hay información de directorio en propiedades no estándar
    if ((file as any).fullPath) return (file as any).fullPath;
    if ((file as any).path) return (file as any).path;
    // Como último recurso, intentar inferir de la estructura del nombre
    // Esto es útil cuando se arrastran carpetas en algunos navegadores
    if (fileName.length > 0) {
      // Buscar patrones que indiquen estructura de carpetas
      const possiblePath: string = this.inferirRutaDesdreNombre(fileName, file);
      if (possiblePath !== fileName) return possiblePath;
    }
    // Si no hay ruta relativa disponible, devolver solo el nombre del archivo
    return fileName;
  }
  /**
   * Intenta inferir la ruta basándose en el nombre del archivo y otras propiedades
   * @param fileName Nombre del archivo
   * @param file Objeto File
   * @returns Ruta inferida o nombre del archivo
   */
  private inferirRutaDesdreNombre(fileName: string, file: File): string {
    // Algunos navegadores incluyen información de carpeta en propiedades no estándar
    const fileAny: any = file as any;
    // Verificar propiedades que podrían contener información de ruta
    const possiblePaths = [
      fileAny.relativePath,
      fileAny.directoryPath,
      fileAny.folderPath,
      fileAny.mozFullPath
    ];
    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.trim() !== '') {
        return path;
      }
    }
    return fileName;
  }
  /**
     * Procesa una entrada (archivo o directorio) del sistema de archivos
     * @param entry FileSystemEntry
     * @param path Ruta base
     */
  private async procesarEntry(entry: any, path: string = ''): Promise<void> {
    if (entry.isFile) {
      // Es un archivo
      const file: File = await new Promise((resolve, reject) => {
        entry.file((file: File) => resolve(file), (error: Error) => reject(error));
      });
      const rutaCompleta: any = path ? `${path}/${entry.name}` : entry.name;
      this.procesaArchivo(file, rutaCompleta);
    } else if (entry.isDirectory) {
      // Es un directorio
      const reader = entry.createReader();
      const entries: any[] = await new Promise((resolve, reject) => {
        reader.readEntries((entries: any[]) => resolve(entries), (error: Error) => reject(error));
      });
      const nuevaRuta: any = path ? `${path}/${entry.name}` : entry.name;
      for (const childEntry of entries) await this.procesarEntry(childEntry, nuevaRuta);
    }
    this.cdr.detectChanges();
  }
  /**
 * Maneja el evento de drop para carpetas arrastradas
 * @param event Evento de drop
 */
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging = false;
    if (!event.dataTransfer) return;
    const items: DataTransferItemList = event.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const item: DataTransferItem = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) await this.procesarEntry(entry);
      }
    }
  }
  /**
   * Maneja el evento de arrastre de archivos dentro del área de carga
   * @param event Evento de arrastre
   */
  dragIn(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }
  /**
   * Maneja el evento de arrastre de archivos fuera del área de carga
   * @param event Evento de arrastre
   */
  dragOut(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
  }
}