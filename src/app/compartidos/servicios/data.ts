import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { SelectItemGroup, TreeNode } from 'primeng/api';
import { catchError, firstValueFrom, map, Observable, Subscriber, tap, throwError } from 'rxjs';
import { Firma } from '@servicios/firmas';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { MenuItem } from 'primeng/api';
import { Rol } from '@servicios/auth';
import { isPlatformBrowser } from '@angular/common';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { getEndpointUrl } from './api-config';
import { ConfigService } from './config.service';

export interface DataCategoria extends Omit<TreeNode, 'children'> {
  numDocs?: number;
  uuid: string;
  children?: DataCategoria[];
  path?: string;
}
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string[];
  hoverBackgroundColor: string[];
}
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}
export interface ChartOptions {
  plugins?: {
    legend?: {
      labels?: {
        usePointStyle?: boolean;
        color?: string;
      };
      position?: string;
    };
  };
}
export interface DataChart {
  nombre: string;
  data: ChartData;
  opciones: ChartOptions;
  tipoChart: 'pie' | 'bar';
}
export interface FilaTabla {
  label: string;
  data: number[];
}
export interface DataTabla {
  nomCol: string;
  nomFil: string;
  cols: string[];
  filas: FilaTabla[];
}
export interface VarData {
  categorias: CategoriaBase[];
  labels: { [key: string]: string };
}
interface Anivel {
  label: string;
  superLabel: string;
}
export namespace TipoListado {
  export type Origen = 'OneDrive ESAP' | 'ARCA' | 'RUND Side-car';
  export type Formato = 'Excel XLSX' | 'CSV';
  export type Extension = '.xlsx' | '.csv';
  export interface Propiedades {
    tipo: string;
    origen: Origen;
    formato: Formato;
    extension: Extension;
    nombre: string;
    encabezados: Array<string | number>;
  }
}
export type ListadoProps = {
  label: string,
  valor: any
};
export namespace Documento {
  export interface ElementoPieTabla {
    colspan: number;
    texto: string;
  }
  export interface Origen {
    categoria: 'Listados';
    tipo: string;
    nombre: string;
    formato: TipoListado.Formato;
    extension: TipoListado.Extension;
  }
  export interface Tabla {
    encabezados: string[];
    filas: string[][];
    pie?: ElementoPieTabla[];
  }
  export interface Firma {
    nombre: string;
    cargo: string;
    imagen: string;
    uuid?: string;
  }
  export interface Estructura {
    tipo: 'parrafo' | 'tabla' | 'firma';
    fontSize: number;
    fontWeight: 'regular' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    marginTop?: string;
    value: any | string | Tabla | Firma;
  }
  export interface Plantilla {
    plantilla: string;
    estructura: Estructura[];
  }
  export interface Dato {
    label: string;
    value: any;
    type: 'text' | 'number' | 'multi' | 'select';
    encabezados: string[];
    plantilla: Plantilla;
    origen?: Origen;
    options?: any[];
  }
  export interface Listado {
    grupos: SelectItemGroup[];
    datos: Dato[];
  }
}
export interface MenuElemento extends MenuItem {
  tipo?: 'PrimeNG' | 'MaterialDesign';
  estilo?: 'material-symbols-outlined' | 'material-symbols-rounded';
  faIcon?: IconDefinition;
  rol: Rol;
}
export interface CategoriaBase {
  id: string;
  items: CategoriaBase[] | string[];
}
export interface DatosCarpeta {
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
export type DatoDemografico = { [key: string]: string[] | { [key: string]: string | string[] } };
export interface DatoArchivo {
  nombre: string;
  formato: string;
  tipo: string;
  origen: string;
}
interface InfoProfesor {
  archivosProfesor: { nombre: string, categorias: string[][] }[];
  datosDemograficos: { nombre: string, categorias: DatoDemografico[] };
}
export interface DatosProfesor {
  archivosProfesor: DatoArchivo[];
  datosDemograficos: DatoDemografico;
}

@Injectable({
  providedIn: 'root',
})
export class Data {
  public categorias: CategoriaBase[] = [];
  public labels: { [key: string]: string } = {};
  public dataCategorias: DataCategoria[] | undefined;
  public apiVersion: string = '2.0';
  public chartColors: string[] = ['blue', 'yellow', 'green', 'cyan', 'pink', 'indigo', 'orange', 'teal', 'bluegray', 'purple', 'red'];
  private aNivel: Anivel[] = [{ label: 'Direcciones territoriales', superLabel: 'Distribución territorial' }];
  public documentos: Documento.Listado = {} as Documento.Listado;
  private faIconLibrary: FaIconLibrary = inject(FaIconLibrary);
  private faCheckDouble: IconDefinition = this.faIconLibrary.getIconDefinition('fas', 'check-double') as IconDefinition;
  private faGauge: IconDefinition = this.faIconLibrary.getIconDefinition('fas', 'gauge') as IconDefinition;
  private faMagnifyingGlassChart: IconDefinition = this.faIconLibrary.getIconDefinition('fas', 'magnifying-glass-chart') as IconDefinition;
  private faFileArrowUp: IconDefinition = this.faIconLibrary.getIconDefinition('fas', 'file-arrow-up') as IconDefinition;
  private faFileAlt: IconDefinition = this.faIconLibrary.getIconDefinition('fas', 'file-alt') as IconDefinition;
  public elementosMenu: MenuElemento[] = [
    /*{ label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
    { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },*/
    { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
    { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
    { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'gestor' },
    { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'gestor' },
    { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario' },
  ];
  private platID: any = inject(PLATFORM_ID);
  private http: HttpClient = inject(HttpClient);
  private configService = inject(ConfigService);

  /**
   * Método auxiliar para obtener URL de endpoint con baseUrl
   */
  private getUrl(endpointKey: string): string {
    const baseUrl = this.configService.getApiBaseUrl();
    return getEndpointUrl(endpointKey, baseUrl);
  }

  init(): Observable<VarData> {
    const data: VarData = {
      categorias: [],
      labels: {},
    };
    return new Observable<VarData>((observer: Subscriber<VarData>) => {
      // Usar configuración v2 para obtener labels
      const labelsUrl = this.getUrl('datos') + '/labels';
      this.http.get<{ datos: { [key: string]: string } }>(labelsUrl).pipe(
        map((response: any) => {
          // Extraer datos de la respuesta v2
          return response.datos || response;
        }),
        tap((labels) => {
          this.labels = labels;
          data.labels = this.labels;

          // Usar configuración v2 para obtener categorías
          const categoriasUrl = this.getUrl('datos') + '/categorias';
          this.http.get<{ datos: CategoriaBase[] }>(categoriasUrl).pipe(
            map((response: any) => {
              // Extraer datos de la respuesta v2
              return response.datos || response;
            }),
            tap((categorias) => {
              this.categorias = categorias;
              data.categorias = this.categorias;
              observer.next(data);
              observer.complete();
            }),
            catchError((error) => {
              console.error('Error obteniendo categorías:', error);
              return throwError(() => error);
            })
          ).subscribe();
        }),
        catchError((error) => {
          console.error('Error obteniendo labels:', error);
          return throwError(() => error);
        })
      ).subscribe();
    });
  }
  apiGet(endpoint: string, params: { [key: string]: any }, opciones: { [key: string]: any } | undefined = undefined): Observable<any> {
    const options: any = opciones ? { params: params, ...opciones } : { params: params };
    return this.http.get<any>(endpoint, options);
  }
  getCategorias(): Observable<DataCategoria[]> {
    const url = this.getUrl('categorias');
    return this.http.get<{ arbol: DataCategoria[] }>(url).pipe(
      catchError(error => {
        console.error('Error obteniendo categorías:', error);
        return throwError(() => error);
      }),
      // Transformar datos: extraer arbol de respuesta v2 o usar v1 directamente
      map((response: any) => {
        // Si es respuesta v2, extraer el arbol, si es v1, usar directamente
        return response.arbol || response;
      })
    );
  }
  getCruce(uuids: string[]): Observable<DataTabla> {
    const [x, y] = uuids;
    const url = this.getUrl('cruce') + `/${x}/${y}`;
    return this.http.get<{ cruce: DataTabla }>(url).pipe(
      catchError(error => {
        console.error('Error obteniendo cruce:', error);
        return throwError(() => error);
      }),
      // Transformar datos: extraer cruce de respuesta v2 o usar v1 directamente
      map((response: any) => {
        return response.cruce || response;
      })
    );
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
        .subscribe((documentos: { datos: Documento.Listado }) => {
          this.documentos = documentos.datos;
          resolve(true);
        });
    });
  }
  getCertificadoFile(tipo: string, plantilla: string, data: Documento.Estructura[], fecha: string, nombre: string, id: string | null = null): Observable<any> {
    const formData: FormData = new FormData();
    // Esto es un poco confuso, pero para poder unificar los llamados a api/v2/documentos/generar es necesario que 'tipo' = 'certificado' | 'reporte' | 'consulta'
    // y que 'formato' = 'pdf' | 'docx' para 'tipo' = 'certificado', y que 'formato' = 'xlsx' (por defecto 'xlsx') para los otros dos casos.
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
  getChartBackgroundColors(num: number, hover: boolean = false): string {
    const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
    this.chartColors = this.chartColors.length < 22 ? this.chartColors.concat(this.chartColors) : this.chartColors;
    return documentStyle.getPropertyValue('--p-' + this.chartColors[num] + '-' + (hover ? '3' : '5') + '00');
  }
  setCategorias(resp: DataCategoria[]): DataCategoria[] {
    resp.forEach((supercat: DataCategoria) => {
      supercat.children?.forEach((cat: DataCategoria) => {
        const ajusteAnivel: Anivel | undefined = this.aNivel.find((nivel: Anivel) => nivel.label == cat.label);
        if (ajusteAnivel) {
          cat.label = ajusteAnivel.superLabel;
          const ghostNodo: DataCategoria[] = [{
            label: ajusteAnivel.label,
            children: JSON.parse(JSON.stringify(cat.children)),
            key: cat.key + '-0',
            uuid: cat.uuid,
            numDocs: cat.numDocs,
            path: cat.path,
          }];
          ghostNodo[0].children?.forEach((subnodo: DataCategoria, numSubNodo: number) => subnodo.key = ghostNodo[0].key + '-' + numSubNodo);
          cat.children = ghostNodo;
        }
      });
    });
    this.dataCategorias = resp;
    return resp;
  }
  delTemp(): Observable<{ borrados: string[], aBorrar: string[] }> {
    return this.http.delete<{ borrados: string[], aBorrar: string[] }>(this.getUrl('tempCleanup'));
  }
  getLoadList(params: { [key: string]: any }): Observable<any> {
    return this.apiGet(this.getUrl('listadosDatos'), params);
  }
  getCsvData(params: any): Observable<any> {
    return this.apiGet(this.getUrl('csvData'), params);
  }
  getFirmas(params: { [key: string]: any }, opciones: { [key: string]: any } | undefined = undefined): Observable<any[]> {
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
      const opciones: any = { responseType: 'blob' };
      const url = this.getUrl('getFile') + '/' + uuid;
      this.http.get(url, { responseType: 'blob' }).pipe(
        catchError(error => {
          console.error('Error obteniendo archivo:', error);
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
          console.error('Error obteniendo UUID del archivo:', error);
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
          console.error('Error obteniendo información del profesor:', error);
          return throwError(() => error);
        })
      ).subscribe((response: any) => {
        // Extraer datos de respuesta v2 o usar v1 directamente
        const info = response.profesor || response;
        if ('archivosProfesor' in info && 'datosDemograficos' in info) {
          const archivosProfesor: DatoArchivo[] = info.archivosProfesor.map((archivo: { nombre: string, categorias: string[][] }) => {
            const formato: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'FORMATO');
            const tipo: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'TIPO');
            const origen: string[] | undefined = archivo.categorias.find((cat: string[]) => cat[0] == 'ORIGEN');
            return {
              nombre: archivo.nombre,
              formato: formato ? formato[1] : '',
              tipo: tipo ? tipo[1] : '',
              origen: origen ? origen[1] : '',
            };
          });
          let datosDemograficos: any = {};
          Object.entries(info.datosDemograficos.categorias).forEach(([key, value]) => {
            const elemento: any = {};
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
