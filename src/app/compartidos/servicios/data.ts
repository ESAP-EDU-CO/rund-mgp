import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SelectItemGroup, TreeNode } from 'primeng/api';
import { Observable } from 'rxjs';
import { Firma } from '@servicios/firmas';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { MenuItem } from 'primeng/api';
import { Rol } from '@servicios/auth';

export interface DataCategoria extends Omit<TreeNode, 'children'> {
  numDocs?: number;
  uuid: string;
  children?: DataCategoria[];
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
  host: string;
  api: string;
  file: string;
  clean: string;
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

@Injectable({
  providedIn: 'root'
})
export class Data {
  public api: string = 'api.php';
  public file: string = 'file.php';
  public clean: string = 'clean.php';
  public loadList: string = 'loadlist.php';
  public uploadFile: string = 'postFile.php';
  public host: string = '';
  public dataCategorias: DataCategoria[] | undefined;
  public chartColors: string[] = ['blue', 'yellow', 'green', 'cyan', 'pink', 'indigo', 'orange', 'teal', 'bluegray', 'purple', 'red'];
  private aNivel: Anivel[] = [{ label: 'Direcciones territoriales', superLabel: 'Distribución territorial' }];
  public documentos: Documento.Listado = {
    grupos: [
      {
        label: 'Certificados',
        value: 'certificados',
        items: [
          { label: 'Certificación de categorización y evaluación', value: [0] },
        ]
      }
    ],
    datos: [
      {
        label: 'Documento de identidad',
        value: undefined,
        type: 'multi',
        encabezados: ['Nombre completo', 'Documento de identidad', 'Categoría', 'Última Evaluación'],
        plantilla: {
          plantilla: '1050',
          estructura: [
            {
              tipo: 'parrafo',
              fontSize: 12,
              fontWeight: 'regular',
              value: '12_301_1300_60_1050'
            },
            {
              tipo: 'parrafo',
              fontSize: 12,
              fontWeight: 'regular',
              value: 'LA COORDINADORA DEL GRUPO DE GESTIÓN PROFESORAL, EN CALIDAD DE SECRETARIA TÉCNICA DEL COMITÉ DOCENTE DE LA ESAP',
              textAlign: 'center',
              marginTop: '6em'
            },
            {
              tipo: 'parrafo',
              fontSize: 12,
              fontWeight: 'regular',
              value: 'CERTIFICA',
              textAlign: 'center',
              marginTop: '3em'
            },
            {
              tipo: 'parrafo',
              fontSize: 12,
              fontWeight: 'regular',
              value: 'Que, de acuerdo con las bases de datos del Grupo de Gestión Profesoral, la Evaluación y Clasificación Docente aprobada en sesión del Comité Docente de los Profesores No vinculados a la carrera es la que se enuncia a continuación:',
              marginTop: '3em'
            },
            {
              tipo: 'tabla',
              fontSize: 9,
              fontWeight: 'regular',
              value: undefined,
              marginTop: '1em'
            },
            {
              tipo: 'parrafo',
              fontSize: 12,
              fontWeight: 'regular',
              value: 'La presente certificación se expide {alDia} del mes de {mes} de {año}.',
              marginTop: '1em'
            },
            {
              tipo: 'firma',
              fontSize: 12,
              fontWeight: 'bold',
              value: {
                nombre: 'ANA CATALINA BORRERO MARTINEZ',
                cargo: 'Coordinadora Grupo de Gestión Profesoral',
                imagen: 'firma_CatalinaBorrero.png',
                uuid: 'bd2b50ff-0381-44c2-b046-52c135419aa1',
              }
            },
          ]
        },
        origen: {
          categoria: 'Listados',
          tipo: 'Listado de docentes',
          nombre: 'ListadoGeneralDocente',
          formato: 'CSV',
          extension: '.csv'
        }
      }
    ]
  };
  // Debe obtenerse de un JSON o una fuente de datos centralizada
  public elementosMenu: MenuElemento[] = [
    { label: 'Panel de control', tipo: 'MaterialDesign', estilo: 'material-symbols-outlined', icon: 'dashboard', route: '/dashboard', rol: 'consulta' },
    { label: 'Consultas', tipo: 'PrimeNG', icon: 'pi pi-search', route: '/consultas', rol: 'consulta' },
    { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'servicio' },
    { label: 'Carga', tipo: 'MaterialDesign', estilo: 'material-symbols-outlined', icon: 'upload_file', route: '/carga', rol: 'servicio' },
    { label: 'Documentos', tipo: 'MaterialDesign', estilo: 'material-symbols-outlined', icon: 'contract', route: '/documentos', rol: 'servicio' },
    { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'servicio' },
  ];
  constructor(private http: HttpClient) { }
  init(): Observable<VarData> {
    return this.http.get<VarData>('data/data.json');
  }
  getCategorias(): Observable<DataCategoria[]> {
    return this.http.get<DataCategoria[]>(this.host + 'getCategorias');
  }
  getCruce(uuids: string[]): Observable<DataTabla> {
    const [x, y] = uuids;
    return this.http.get<DataTabla>(this.host + 'getCruce', { params: { x: x, y: y } });
  }
  getConsultaFile(tipo: any, data: DataTabla): Observable<any> {
    const opciones: any = {
      responseType: 'blob',
    };
    const formData: FormData = new FormData();
    formData.append('tipo', tipo);
    formData.append('data', JSON.stringify(data));
    return this.http.post<Blob>(this.host + 'getConsultaFile', formData, opciones);
  }
  loadDocumentos(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.get<Documento.Listado>('data/documentos.json')
        .subscribe((documentos: Documento.Listado) => {
          this.documentos = documentos;
          resolve(true);
        });
    });
  }
  getCertificadoFile(tipo: string, plantilla: string, data: Documento.Estructura[]): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('tipo', tipo);
    formData.append('plantilla', plantilla);
    formData.append('data', JSON.stringify(data));
    const opciones: any = {
      responseType: 'blob',
    }
    return this.http.post<Blob>(this.host + 'getCertificado', formData, opciones);
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
            numDocs: cat.numDocs
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
    return this.http.get<{ borrados: string[], aBorrar: string[] }>(this.host + 'delReporte');
  }
  apiGet(endpoint: string, params: { [key: string]: any }, opciones: { [key: string]: any } | undefined = undefined): Observable<any> {
    const options: any = opciones ? { params: params, ...opciones } : { params: params };
    return this.http.get<any>(endpoint, options);
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
    return this.postFile(this.uploadFile, propiedades, 'cargaFirma', archivo);
  }
  deleteFile(uuid: string): Observable<any> {
    return this.http.delete(this.api, { params: { accion: 'deleteFile', uuid: uuid } });
  }
  private normalizaNombre(nombre: string): string {
    return nombre.trim().replace(/\s+/g, '_').toUpperCase();
  }
}
