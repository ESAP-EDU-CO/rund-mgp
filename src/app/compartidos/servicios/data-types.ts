import { SelectItemGroup, TreeNode } from 'primeng/api';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { MenuItem } from 'primeng/api';
import { Rol } from '@servicios/auth';

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
  labels: Record<string, string>;
}
export interface CategoriaBase {
  id: string;
  items: CategoriaBase[] | string[];
}
export interface MenuElemento extends MenuItem {
  tipo?: 'PrimeNG' | 'MaterialDesign';
  estilo?: 'material-symbols-outlined' | 'material-symbols-rounded';
  faIcon?: IconDefinition;
  rol: Rol;
  visible?: boolean;
}
export interface DatosCarpeta {
  origen: string[];
  categoria: string;
  label: string;
}
export interface ArchivoDocente {
  archivo: File;
  taxonomia: DatosCarpeta;
  tipo: string;
  formato: string;
  origen: string;
  esCedula: boolean;
}
export type DatoDemografico = Record<string, string[] | Record<string, string | string[]>>;
export interface DatoArchivo {
  nombre: string;
  formato: string;
  tipo: string;
  origen: string;
  ia_clasificado?: boolean;
  ia_tipo?: string;
}
export interface DatosProfesor {
  archivosProfesor: DatoArchivo[];
  datosDemograficos: DatoDemografico;
}
export interface ListadoProps {
  label: string,
  valor: any
}
// eslint-disable-next-line @typescript-eslint/no-namespace
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
export interface Anivel {
  label: string;
  superLabel: string;
}
export interface InfoProfesor {
  archivosProfesor: { nombre: string, categorias: string[][] }[];
  datosDemograficos: { nombre: string, categorias: DatoDemografico[] };
}
// eslint-disable-next-line @typescript-eslint/no-namespace
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
    encabezados: (string | number)[];
  }
}
