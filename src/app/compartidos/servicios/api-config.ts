/**
 * RUND MGP - Configuración de API
 *
 * Maneja la migración gradual de endpoints v1 a v2.
 * Permite alternar entre versiones para pruebas y rollback.
 *
 * @author ESAP Development Team / Oliver Castelblanco Martínez
 * @version 2.0
 * @since Angular 18
 */

export interface EndpointConfig {
  v1: string;
  v2: string;
  useV2: boolean;
  status: 'migrated' | 'testing' | 'pending';
}

export interface ApiEndpoints {
  [key: string]: EndpointConfig;
}

/**
 * Configuración de endpoints - Migración gradual v1 → v2
 */
export const API_ENDPOINTS: ApiEndpoints = {
  // Sistema
  info: {
    v1: 'info',
    v2: 'api/v2/system/info',
    useV2: true,
    status: 'migrated'
  },
  health: {
    v1: 'health',
    v2: 'api/v2/system/health',
    useV2: true,
    status: 'migrated'
  },
  capabilities: {
    v1: 'files',
    v2: 'api/v2/system/capabilities',
    useV2: true,
    status: 'migrated'
  },

  // Categorías
  categorias: {
    v1: 'getCategorias',
    v2: 'api/v2/categorias/arbol',
    useV2: true,
    status: 'migrated'
  },
  cruce: {
    v1: 'getCruce',
    v2: 'api/v2/categorias/cruce',
    useV2: true,
    status: 'migrated'
  },

  // Profesores
  infoProfesor: {
    v1: 'getInfoProfesor',
    v2: 'api/v2/profesores',
    useV2: true,
    status: 'migrated'
  },

  // Archivos
  datos: {
    v1: 'getFile?tipo=data',
    v2: 'api/v2/archivos/datos',
    useV2: true,
    status: 'migrated'
  },
  imagen: {
    v1: 'getFile?tipo=imagen',
    v2: 'api/v2/archivos/imagenes',
    useV2: false, // Mantener v1 por compatibilidad con URLs directas
    status: 'pending'
  },
  deleteFile: {
    v1: 'deleteFile',
    v2: 'api/v2/archivos',
    useV2: true,
    status: 'migrated'
  },
  tempCleanup: {
    v1: 'delReporte',
    v2: 'api/v2/archivos/temp/limpiar',
    useV2: true,
    status: 'migrated'
  },

  // Certificados
  certificadoInfo: {
    v1: 'getCertificadoInfo',
    v2: 'api/v2/certificados',
    useV2: true,
    status: 'migrated'
  },
  certificadoGenerar: {
    v1: 'getCertificado',
    v2: 'api/v2/certificados/generar',
    useV2: false, // Mantener v1 hasta completar migración
    status: 'testing'
  },

  // Pendientes (mantener v1)
  csvData: {
    v1: 'getCsvData',
    v2: 'api/v2/listados/csv',
    useV2: false,
    status: 'pending'
  },
  consultaFile: {
    v1: 'getConsultaFile',
    v2: 'api/v2/documentos/exportar',
    useV2: false,
    status: 'pending'
  },
  loadList: {
    v1: 'loadList',
    v2: 'api/v2/listados/cargar',
    useV2: false,
    status: 'pending'
  },
  postFile: {
    v1: 'postFile',
    v2: 'api/v2/archivos/subir',
    useV2: false,
    status: 'pending'
  },
  firmas: {
    v1: 'getFirmas',
    v2: 'api/v2/firmas/lista',
    useV2: false,
    status: 'pending'
  },
  extraeDatos: {
    v1: 'extraeDatos',
    v2: 'api/v2/ai/extraer',
    useV2: false,
    status: 'pending'
  }
};

/**
 * Configuración global de la API
 */
export const API_CONFIG = {
  version: '2.0',
  baseUrl: 'http://localhost:3000/',
  defaultVersion: 'v2',
  fallbackToV1: true,
  debug: true
};

/**
 * Tipos para URLs especiales (no pasan por data.ts)
 */
export const DIRECT_URLS = {
  // Para p-fileUpload - requiere URL completa
  uploadListados: 'loadList',
  uploadArchivos: 'postFile',

  // Para background-image - requiere URL directa
  imagenFondo: 'imagen',
  imagenDirecta: 'img' // Alias corto v2
};

/**
 * Utilidad para obtener la URL correcta según configuración
 */
export function getEndpointUrl(endpointKey: string, baseUrl: string): string {
  const config = API_ENDPOINTS[endpointKey];

  if (!config) {
    console.warn(`Endpoint '${endpointKey}' no encontrado en configuración`);
    return endpointKey; // Fallback al key original
  }

  const url = config.useV2 ? config.v2 : config.v1;
  return baseUrl + url;
}

/**
 * Utilidad para obtener estadísticas de migración
 */
export function getMigrationStats(): {
  total: number;
  migrated: number;
  testing: number;
  pending: number;
  progress: string;
} {
  const endpoints = Object.values(API_ENDPOINTS);
  const total = endpoints.length;
  const migrated = endpoints.filter(e => e.status === 'migrated').length;
  const testing = endpoints.filter(e => e.status === 'testing').length;
  const pending = endpoints.filter(e => e.status === 'pending').length;

  return {
    total,
    migrated,
    testing,
    pending,
    progress: `${Math.round((migrated / total) * 100)}%`
  };
}