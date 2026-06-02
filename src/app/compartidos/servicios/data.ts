import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, firstValueFrom, forkJoin, map, Observable, Subject, Subscriber, tap, throwError } from 'rxjs';
import { Firma } from '@servicios/firmas';
import { getEndpointUrl } from './api-config';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { CategoriaService } from './categoria.service';
import { MenuService } from './menu.service';
import {
  DataCategoria, CategoriaBase, DataTabla, VarData, Documento,
  ListadoProps, MenuElemento, DatoArchivo, DatoDemografico, DatosProfesor,
  Anivel, InfoProfesor,
} from './data-types';

export * from './data-types';

@Injectable({
  providedIn: 'root',
})
export class Data {
  private categoriaService: CategoriaService = inject(CategoriaService);
  private menuService: MenuService = inject(MenuService);
  private logger: LoggerService = inject(LoggerService);
  private platID: any = inject(PLATFORM_ID);
  private http: HttpClient = inject(HttpClient);
  private configService = inject(ConfigService);

  public apiVersion = '2.0';
  public chartColors: string[] = ['blue', 'yellow', 'green', 'cyan', 'pink', 'indigo', 'orange', 'teal', 'bluegray', 'purple', 'red'];
  public documentos: Documento.Listado = {} as Documento.Listado;
  public archivosCargados$ = new Subject<string>();

  private readonly aNivel: Anivel[] = [
    { label: 'Direcciones territoriales', superLabel: 'Distribución territorial' }
  ];

  get dataCategorias(): DataCategoria[] | undefined { return this.categoriaService.dataCategorias; }
  set dataCategorias(val: DataCategoria[] | undefined) { this.categoriaService.dataCategorias = val; }
  get categorias(): CategoriaBase[] { return this.categoriaService.categorias; }
  set categorias(val: CategoriaBase[]) { this.categoriaService.categorias = val; }
  get labels(): Record<string, string> { return this.categoriaService.labels; }
  set labels(val: Record<string, string>) { this.categoriaService.labels = val; }
  get elementosMenu(): MenuElemento[] { return this.menuService.getElementosMenu(); }

  private getUrl(endpointKey: string): string {
    const baseUrl = this.configService.getApiBaseUrl();
    return getEndpointUrl(endpointKey, baseUrl);
  }

  init(): Observable<VarData> {
    const labelsUrl = this.getUrl('datos') + '/labels';
    const categoriasUrl = this.getUrl('datos') + '/categorias';
    return forkJoin({
      labels: this.http.get<{ datos: Record<string, string> }>(labelsUrl).pipe(
        map((response: any) => response.datos || response)
      ),
      categorias: this.http.get<{ datos: CategoriaBase[] }>(categoriasUrl).pipe(
        map((response: any) => response.datos || response)
      ),
    }).pipe(
      map(({ labels, categorias }) => {
        this.categoriaService.labels = labels;
        this.categoriaService.categorias = categorias;
        return { categorias, labels } as VarData;
      }),
      catchError((error) => {
        this.logger.error('Error inicializando datos:', error);
        return throwError(() => error);
      })
    );
  }
  apiGet(endpoint: string, params: Record<string, any>, opciones: Record<string, any> | undefined = undefined): Observable<any> {
    const options: any = opciones ? { params: params, ...opciones } : { params: params };
    return this.http.get<any>(endpoint, options);
  }
  getCategorias(): Observable<DataCategoria[]> {
    return this.categoriaService.getCategorias();
  }
  getCruce(uuids: string[]): Observable<DataTabla> {
    return this.categoriaService.getCruce(uuids);
  }
  setCategorias(resp: DataCategoria[]): DataCategoria[] {
    return this.categoriaService.setCategorias(resp);
  }
  getConsultaFile(tipo: any, data: DataTabla): Observable<any> {
    const opciones: any = {
      responseType: 'blob',
    };
    const formData: FormData = new FormData();
    formData.append('tipo', tipo);
    formData.append('data', JSON.stringify(data));
    return this.http.post<Blob>(this.getUrl('consultaFile'), formData, opciones);
  }
  loadDocumentos(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.get<{ datos: Documento.Listado }>(this.getUrl('datos') + '/documentos')
        .subscribe({
          next: (documentos: { datos: Documento.Listado }) => {
            this.documentos = documentos.datos;
            resolve(true);
          },
          error: (error) => {
            this.logger.error('Error cargando documentos:', error);
            reject(error);
          }
        });
    });
  }
  getCertificadoFile(tipo: string, plantilla: string, data: Documento.Estructura[], fecha: string, nombre: string, id: string | null = null): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('formato', tipo);
    formData.append('tipo', 'certificado');
    formData.append('plantilla', plantilla);
    formData.append('data', JSON.stringify(data));
    formData.append('fecha', fecha);
    formData.append('nombre', nombre);
    if (id) formData.append('id', id);
    const opciones: any = {
      responseType: 'blob',
    }
    return this.http.post<Blob>(this.getUrl('documentosGenerar'), formData, opciones);
  }
  postCargaFiles(propiedades: ListadoProps[], archivo: File): Observable<any> {
    return this.postFile(this.getUrl('archivosSubir'), propiedades, 'cargaDocumento', archivo);
  }
  postLoadList(propiedades: ListadoProps[], archivo: File | undefined): Observable<any> {
    return this.postFile(this.getUrl('loadList'), propiedades, 'cargar', archivo);
  }
  postFile(url: string, propiedades: ListadoProps[], accion: string, archivo: File | undefined = undefined): Observable<any> {
    const formData: FormData = new FormData();
    if (archivo) formData.append('archivo', archivo);
    formData.append('accion', accion);
    formData.append('propiedades', JSON.stringify(propiedades));
    return this.http.post<any>(url, formData);
  }
  getChartBackgroundColors(num: number, hover = false): string {
    if (!isPlatformBrowser(this.platID)) return '';
    const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    this.chartColors = this.chartColors.length < 22 ? this.chartColors.concat(this.chartColors) : this.chartColors;
    return documentStyle.getPropertyValue('--p-' + this.chartColors[num] + '-' + (hover ? '3' : '5') + '00');
  }
  delTemp(): Observable<{ borrados: string[], aBorrar: string[] }> {
    return this.http.delete<{ borrados: string[], aBorrar: string[] }>(this.getUrl('tempCleanup'));
  }
  getLoadList(params: Record<string, any>): Observable<any> {
    return this.apiGet(this.getUrl('listadosDatos'), params);
  }
  getCsvData(params: any): Observable<any> {
    return this.apiGet(this.getUrl('csvData'), params);
  }
  getFirmas(params: Record<string, any>, opciones: Record<string, any> | undefined = undefined): Observable<any[]> {
    return this.apiGet(this.getUrl('firmas'), params, opciones);
  }
  postFirma(datos: Firma.FirmaMetadata, blob: Blob): Observable<any> {
    const nombreFirma: string =
      this.normalizaNombre(datos.apellidos) + '_' +
      this.normalizaNombre(datos.nombres) + '-' +
      this.normalizaNombre(datos.cargo);
    const archivo: File = new File([blob], nombreFirma + '.png');
    const propiedades: ListadoProps[] = Object.keys(datos).map((key: string) => {
      return {
        label: key,
        valor: datos[key as keyof Firma.FirmaMetadata]
      };
    });
    return this.postFile(this.getUrl('firmaSubir'), propiedades, 'cargaFirma', archivo);
  }
  deleteFile(uuid: string): Observable<any> {
    return this.http.delete(this.getUrl('deleteFile') + '/' + uuid);
  }
  vaciaPapelera(): Observable<any> {
    return this.http.delete(this.getUrl('papelera'));
  }
  getImagen(nombre: string): Observable<string | ArrayBuffer | null> {
    if (isPlatformBrowser(this.platID)) {
      const opciones: any = { responseType: 'blob' };
      const getFile: Observable<any> = this.http.get<any>(this.getUrl('imagen') + '/' + nombre, opciones);
      return new Observable((observador: Subscriber<any>) => {
        getFile.pipe(
          tap((imagen: any) => {
            this.blobToBase64(imagen)
              .then((img64: string | ArrayBuffer | null) => observador.next(img64))
              .catch((error: any) => observador.error(error))
              .finally(() => observador.complete());
          }),
          catchError((error) => {
            observador.error(error);
            return throwError(() => error);
          })
        ).subscribe();
      });
    } else {
      return new Observable();
    }
  }
  getCertificadoInfo(id: string): Observable<any> {
    return this.http.get<any>(this.getUrl('certificadoInfo') + '/' + id);
  }
  async getArchivo(uuid: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.http.get(this.getUrl('getFile') + '/' + uuid, { responseType: 'blob' }).pipe(
        catchError(error => {
          this.logger.error('Error obteniendo archivo:', error);
          reject(error);
          return throwError(() => error);
        })
      ).subscribe((response: any) => resolve(response));
    });
  }
  async getArchivoProfesorUuid(cedula: string, nombre: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const url = this.getUrl('infoProfesor') + '/' + cedula + '/' + nombre;
      this.http.get<any>(url).pipe(
        catchError(error => {
          this.logger.error('Error obteniendo UUID del archivo:', error);
          reject(error);
          return throwError(() => error);
        })
      ).subscribe((response: any) => resolve(response));
    });
  }
  async getInfoProfesor(cedula: string): Promise<DatosProfesor | undefined> {
    const url: string = this.getUrl('infoProfesor') + '/' + cedula;
    return new Promise((resolve, reject) => {
      this.http.get<{ profesor: InfoProfesor }>(url).pipe(
        catchError(error => {
          this.logger.error('Error obteniendo información del profesor:', error);
          return throwError(() => error);
        })
      ).subscribe((response: any) => {
        const info = response.profesor || response;
        if ('archivosProfesor' in info && 'datosDemograficos' in info) {
          const archivosProfesor: DatoArchivo[] = info.archivosProfesor.map((archivo: { nombre: string, categorias: string[][] }) => {
            const formato: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'FORMATO');
            const tipo: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'TIPO');
            const origen: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'ORIGEN');
            const ia: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'IA_CLASIFICADO');
            return {
              nombre: archivo.nombre,
              formato: formato ? formato[1] : '',
              tipo: tipo ? tipo[1] : '',
              origen: origen ? origen[1] : '',
              ia_clasificado: !!ia,
              ia_tipo: ia ? ia[1] : undefined,
            };
          });
          const datosDemograficos: any = {};
          Object.entries(info.datosDemograficos.categorias).forEach(([key, value]) => {
            const ajusteAnivel: Anivel | undefined = this.aNivel.find((nivel: Anivel) => nivel.label == key);
            if (ajusteAnivel && typeof value === 'object' && Array.isArray(value)) {
              const categoria: string = ajusteAnivel.superLabel;
              const valor: any = {};
              valor[key] = value;
              datosDemograficos[categoria] = valor;
            } else {
              datosDemograficos[key] = value;
            }
          });
          if (info.fechaNacimiento) (datosDemograficos as any)['FECHA_NACIMIENTO'] = info.fechaNacimiento;
          if (archivosProfesor && datosDemograficos) {
            resolve({ archivosProfesor: archivosProfesor, datosDemograficos: datosDemograficos as DatoDemografico });
          } else {
            reject('No pude obtener la información del profesor.');
          }
        } else {
          resolve(undefined);
        }
      });
    });
  }
  async reemplazaArchivo(uuid: string, nombre: string, archivo: File, comentario: string): Promise<any> {
    const formData: FormData = new FormData();
    formData.append('file', archivo);
    formData.append('nombre_archivo', nombre);
    formData.append('comment', comentario);
    const url: string = this.getUrl('actualizaArchivo') + '/' + uuid + '/actualizar';
    return firstValueFrom(this.http.post<any>(url, formData));
  }
  getIndiceDocente(): Observable<any> {
    return this.http.get<any>(this.getUrl('indice'));
  }
  extraeDatos(accion: string, documento: File, tipoDocumento: string, datosExtraer: string[]): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('accion', accion);
    formData.append('documento', documento);
    formData.append('tipoDocumento', tipoDocumento);
    formData.append('datosExtraer', JSON.stringify(datosExtraer));
    return this.http.post<any>(this.getUrl('extraeDatos'), formData);
  }
  getExtractionStatistics(): Observable<any> {
    return this.http.get<any>(this.getUrl('extractionStatistics'));
  }
  getQueueStats(): Observable<any> {
    return this.http.get<any>(this.getUrl('queueStats'));
  }
  getExtraccionStats(): Observable<any> {
    return this.http.get<any>(this.getUrl('extraccionStats'));
  }
  getExtraccionDocente(cedula: string, page = 1, size = 10): Observable<any> {
    return this.http.get<any>(`${this.getUrl('extraccionDocente')}/${cedula}?page=${page}&size=${size}`);
  }
  async getJsonExtraido(cedula: string, nombreJson: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.getUrl('jsonExtraido')}/${cedula}/${nombreJson}`));
  }
  resetStuckJobs(): Observable<any> {
    return this.http.post<any>(this.getUrl('resetStuckJobs'), {});
  }
  retryErrorJobs(): Observable<any> {
    return this.http.post<any>(this.getUrl('retryErrorJobs'), {});
  }
  getSchedulerStatus(): Observable<any> {
    return this.http.get<any>(this.getUrl('schedulerStatus'));
  }
  startScheduler(): Observable<any> {
    return this.http.post<any>(this.getUrl('schedulerStart'), {});
  }
  pauseScheduler(): Observable<any> {
    return this.http.post<any>(this.getUrl('schedulerPause'), {});
  }
  configScheduler(horaInicio: number, horaFin: number): Observable<any> {
    return this.http.post<any>(this.getUrl('schedulerConfig'), { hora_inicio: horaInicio, hora_fin: horaFin });
  }
  private normalizaNombre(nombre: string): string {
    return nombre.trim().replace(/\s+/g, '_').toUpperCase();
  }
  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader: FileReader = new FileReader();
      reader.onerror = reject;
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
}
