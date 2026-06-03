/**
 * RUND MGP - Configuración de API v2
 *
 * API completamente migrada a v2. Solo endpoints v2 disponibles.
 * Migración v1→v2 completada exitosamente.
 *
 * @author ESAP Development Team / Oliver Castelblanco Martínez
 * @version 2.0
 * @since Angular 18
 */
export interface EndpointConfig {
  endpoint: string;
  status: 'active';
}

export type ApiEndpoints = Record<string, EndpointConfig>;

/**
 * Configuración de endpoints - API v2 completa
 */
export const API_ENDPOINTS: ApiEndpoints = {
  // Sistema
  info: {
    endpoint: 'api/v2/system/info',
    status: 'active'
  },
  health: {
    endpoint: 'api/v2/system/health',
    status: 'active'
  },
  capabilities: {
    endpoint: 'api/v2/system/capabilities',
    status: 'active'
  },
  migration: {
    endpoint: 'api/v2/system/migration',
    status: 'active'
  },
  docs: {
    endpoint: 'api/v2/system/docs',
    status: 'active'
  },

  // Categorías
  categorias: {
    endpoint: 'api/v2/categorias/arbol',
    status: 'active'
  },
  cruce: {
    endpoint: 'api/v2/categorias/cruce',
    status: 'active'
  },

  // Profesores
  infoProfesor: {
    endpoint: 'api/v2/profesores',
    status: 'active'
  },

  // Archivos
  datos: {
    endpoint: 'api/v2/archivos/datos',
    status: 'active'
  },
  imagen: {
    endpoint: 'api/v2/archivos/imagenes',
    status: 'active'
  },
  deleteFile: {
    endpoint: 'api/v2/archivos',
    status: 'active'
  },
  getFile: {
    endpoint: 'api/v2/archivos',
    status: 'active'
  },
  actualizaArchivo: {
    endpoint: 'api/v2/archivos',
    status: 'active'
  },
  tempCleanup: {
    endpoint: 'api/v2/archivos/temp/limpiar',
    status: 'active'
  },
  papelera: {
    endpoint: 'api/v2/archivos/papelera',
    status: 'active'
  },
  archivosSubir: {
    endpoint: 'api/v2/archivos/subir',
    status: 'active'
  },

  // Certificados
  certificadoInfo: {
    endpoint: 'api/v2/certificados',
    status: 'active'
  },
  certificadoGenerar: {
    endpoint: 'api/v2/documentos/generar',
    status: 'active'
  },

  // Documentos
  consultaFile: {
    endpoint: 'api/v2/documentos/exportar',
    status: 'active'
  },
  documentosGenerar: {
    endpoint: 'api/v2/documentos/generar',
    status: 'active'
  },

  // Listados
  csvData: {
    endpoint: 'api/v2/listados/csv',
    status: 'active'
  },
  loadList: {
    endpoint: 'api/v2/listados/cargar',
    status: 'active'
  },
  indice: {
    endpoint: 'api/v2/listados/indice',
    status: 'active'
  },

  // Archivos y subida
  postFile: {
    endpoint: 'api/v2/archivos/subir',
    status: 'active'
  },
  listadosDatos: {
    endpoint: 'api/v2/listados/datos',
    status: 'active'
  },

  // Firmas
  firmas: {
    endpoint: 'api/v2/firmas/lista',
    status: 'active'
  },
  firmaSubir: {
    endpoint: 'api/v2/firmas/subir',
    status: 'active'
  },

  // Autenticación
  login: {
    endpoint: 'api/v2/auth/login',
    status: 'active',
  },
  logout: {
    endpoint: 'api/v2/auth/logout',
    status: 'active',
  },
  session: {
    endpoint: 'api/v2/auth/session',
    status: 'active',
  },
  refresh: {
    endpoint: 'api/v2/auth/refresh',
    status: 'active',
  },
  devLogin: {
    endpoint: 'api/v2/auth/dev/login',
    status: 'active',
  },

  // IA
  extraeDatos: {
    endpoint: 'api/v2/ai/extraer',
    status: 'active'
  },
  extractionStatistics: {
    endpoint: 'api/v2/ai/extraction/statistics',
    status: 'active'
  },
  queueStats: {
    endpoint: 'api/v2/ai/queue/stats',
    status: 'active'
  },
  extraccionStats: {
    endpoint: 'api/v2/extraccion/stats',
    status: 'active'
  },
  extraccionDocente: {
    endpoint: 'api/v2/extraccion',
    status: 'active'
  },
  jsonExtraido: {
    endpoint: 'api/v2/extraccion/json',
    status: 'active'
  },
  resetStuckJobs: {
    endpoint: 'api/v2/ai/reset-stuck-jobs',
    status: 'active'
  },
  retryErrorJobs: {
    endpoint: 'api/v2/ai/retry-error-jobs',
    status: 'active'
  },
  schedulerStatus: {
    endpoint: 'api/v2/ai/scheduler/status',
    status: 'active'
  },
  schedulerStart: {
    endpoint: 'api/v2/ai/scheduler/start',
    status: 'active'
  },
  schedulerPause: {
    endpoint: 'api/v2/ai/scheduler/pause',
    status: 'active'
  },
  schedulerConfig: {
    endpoint: 'api/v2/ai/scheduler/config',
    status: 'active'
  },
  extraccionBuscar: {
    endpoint: 'api/v2/extraccion/buscar',
    status: 'active'
  }
};

/**
 * URLs directas para componentes que no usan data.ts
 */
export const DIRECT_URLS = {
  // Para p-fileUpload - requiere URL completa
  uploadListados: 'api/v2/listados/cargar',
  uploadArchivos: 'api/v2/archivos/subir',

  // Para imágenes directas
  imagenDirecta: 'img' // Alias corto v2
};

/**
 * Utilidad para obtener la URL v2 correcta
 *
 * IMPORTANTE: Esta función depende de ConfigService para obtener la baseUrl.
 * ConfigService debe estar inicializado antes de usar esta función.
 *
 * @param endpointKey - La clave del endpoint en API_ENDPOINTS
 * @param configService - Instancia de ConfigService (debe ser inyectada)
 * @returns URL completa del endpoint
 */
export function getEndpointUrl(endpointKey: string, baseUrl: string): string {
  const config = API_ENDPOINTS[endpointKey];

  if (!config) {
    console.warn(`Endpoint '${endpointKey}' no encontrado en configuración`);
    return baseUrl + endpointKey; // Fallback al key original
  }

  // Asegurar que baseUrl termine con /
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  return normalizedBaseUrl + config.endpoint;
}