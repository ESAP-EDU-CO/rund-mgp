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

export interface ApiEndpoints {
  [key: string]: EndpointConfig;
}

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

  // IA
  extraeDatos: {
    endpoint: 'api/v2/ai/extraer',
    status: 'active'
  }
};

/**
 * Configuración global de la API
 */
export const API_CONFIG = {
  version: '2.0',
  baseUrl: '', // Se configura dinámicamente desde /api/config
  onlyV2: true,
  debug: false
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
 */
export function getEndpointUrl(endpointKey: string): string {
  const config = API_ENDPOINTS[endpointKey];

  if (!config) {
    console.warn(`Endpoint '${endpointKey}' no encontrado en configuración`);
    return API_CONFIG.baseUrl + endpointKey; // Fallback al key original
  }

  if (API_CONFIG.baseUrl == '') {
    console.log('La baseUrl está vacía');
    //API_CONFIG.baseUrl = 'http://localhost:3000/';
  }

  return API_CONFIG.baseUrl + config.endpoint;
}