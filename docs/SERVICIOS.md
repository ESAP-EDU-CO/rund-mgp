# Referencia de Servicios RUND MGP

Documentación de los servicios principales que proporcionan lógica de negocio y acceso a datos.

## Auth Service

**Ubicación:** `src/app/compartidos/servicios/auth.ts`

**Propósito:** Gestión centralizada de autenticación, sesiones y permisos.

**Inyección:**

```typescript
private authService = inject(Auth);
```

### Signals (Reactivos)

```typescript
// Signals de solo lectura (expuestos al template)
usuario: Signal<Usuario | null | undefined>        // undefined = estado inicial
cargando: Signal<boolean>                           // true mientras se procesa login/logout
error: Signal<string | null>                        // Mensaje de error si existe

// Computed signals
estaAutenticado: Signal<boolean>                    // true si usuario !== null && !== undefined
esAdmin: Signal<boolean>                            // true si usuario.rol === 'admin'
```

### Métodos principales

```typescript
login(username: string, password: string): Observable<LoginResponse>
// POST /api/v2/auth/login
// Respuesta: { success: boolean, user: Usuario, session_id: string }

logout(): Observable<LogoutResponse>
// POST /api/v2/auth/logout
// Destruye sesión del lado del servidor

verificarSesion(): Observable<SessionResponse>
// GET /api/v2/auth/session
// Verifica si existe sesión activa
// Llama refrescarJWT() automáticamente si es válida

refrescarJWT(): Observable<any>
// POST /api/v2/auth/refresh
// Obtiene nuevo JWT interno (RS256, TTL 900s)

devLogin(email: string): Observable<LoginResponse>
// POST /api/v2/auth/dev/login
// SOLO en isDevMode() === true
// Propósito: testing en desarrollo local

tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean
// Verifica si rol usuario >= rol requerido
// Retorna true/false (síncrono, sin red)
```

### Interfaz Usuario

```typescript
interface Usuario {
  sub: string;              // Subject (usuario ID en LDAP)
  name: string;             // Nombre completo
  email: string;            // Email ESAP (@esap.edu.co)
  tid?: string;             // Tenant ID
  rol?: string;             // Rol (admin, gestor, directivo, usuario)
  roles?: string[];         // Array de roles (fallback)
}
```

### Interfaz LoginResponse

```typescript
interface LoginResponse {
  success: boolean;
  user: Usuario;
  session_id: string;
  internal_jwt?: string;    // JWT RS256 (opcional en respuesta)
}
```

### Flujo de verificación de sesión

```typescript
// En auth-guard.ts:
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  
  // 1. ¿Usuario signal tiene valor?
  if (auth.usuario() !== undefined && auth.usuario() !== null) {
    return true;  // Sin red, ya autenticado
  }
  
  // 2. Si no, llamar verificarSesion()
  return auth.verificarSesion().pipe(
    map(response => {
      if (response.success) return true;
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }),
    catchError(() => {
      // Error en la petición → redirect a login
      return of(router.createUrlTree(['/login']));
    })
  );
};
```

---

## Config Service

**Ubicación:** `src/app/compartidos/servicios/config.service.ts`

**Propósito:** Carga dinámica de configuración (API base URL) al arrancar la aplicación.

**Inyección:**

```typescript
private configService = inject(ConfigService);
const apiBaseUrl = this.configService.getApiBaseUrl();
```

### Métodos

```typescript
loadConfig(): Promise<void>
// GET /api/config (al servidor Express)
// Respuesta esperada: { apiBaseUrl: "http://..." }
// Si falla, usa fallback: "http://localhost:3000"

getApiBaseUrl(): string
// Retorna apiBaseUrl cargada en loadConfig()
// Síncrono (ya está cargado en APP_INITIALIZER)
```

### Ciclo de vida

1. **Bootstrap de Angular:**
   ```typescript
   // En app.config.ts:
   providers: [
     {
       provide: APP_INITIALIZER,
       useFactory: (configService: ConfigService) => () => configService.loadConfig(),
       deps: [ConfigService],
       multi: true
     }
   ]
   ```

2. **ConfigService.loadConfig() ejecuta:**
   ```typescript
   GET /api/config
   → Express (server.ts) retorna { apiBaseUrl: process.env.API_BASE_URL }
   → Cargado en this._apiBaseUrl
   ```

3. **Todos los servicios ya pueden usar getApiBaseUrl():**
   ```typescript
   const url = getEndpointUrl('login', this.configService.getApiBaseUrl());
   ```

### Fallback

Si `/api/config` falla (network error):

```typescript
this._apiBaseUrl = 'http://localhost:3000';
```

### Ventajas

- **Reutilizable en múltiples entornos:** Misma imagen Docker en dev, UAT, producción
- **Sin hard-coding:** Solo cambiar env var `API_BASE_URL`
- **SSR-compatible:** Cargado antes del render inicial
- **URLs externas e internas:** Soporta `http://localhost:3000` e `https://rund.esap.edu.co`

---

## Data Service (Fachada)

**Ubicación:** `src/app/compartidos/servicios/data.ts`

**Propósito:** Fachada centralizada de acceso a datos. Orquesta peticiones HTTP, caching, y transformaciones.

**Inyección:**

```typescript
private data = inject(Data);
```

### Propiedades principales

```typescript
labels: Record<string, string>     // Etiquetas mapeadas (nombre_campo → etiqueta visible)
categorias: DataCategoria[]        // Árbol de categorías cacheado
```

### Métodos de autenticación

```typescript
login(username: string, password: string): Observable<any>
logout(): Observable<any>
verificarSesion(): Observable<any>
```

### Métodos de categorías

```typescript
getCategorias(): Observable<DataCategoria[]>
// GET /api/v2/categorias/arbol
// Cacheado en memoria

getCruce(): Observable<any>
// GET /api/v2/categorias/cruce
```

### Métodos de profesores

```typescript
getInfoProfesor(cedula: string): Observable<DatoDemografico>
// GET /api/v2/profesores?cedula={cedula}
// Datos demográficos del docente
```

### Métodos de archivos

```typescript
getDatos(cedula: string, nombre: string): Observable<any>
// GET /api/v2/archivos/datos
// Datos/propiedades de archivo

getArchivoProfesorUuid(cedula: string, nombre: string): Promise<any>
// Obtiene UUID del archivo en OpenKM (async)

getArchivo(uuid: string): Promise<Blob>
// Descarga archivo como Blob

getJsonExtraido(cedula: string, nombre: string): Promise<any>
// GET /api/v2/extraccion/json/{cedula}/{nombre}
// Obtiene datos extraídos por IA (JSON side-car)
```

### Métodos de extracción (NUEVO)

```typescript
getExtraccionStats(): Observable<any>
// GET /api/v2/extraccion/stats
// Estadísticas generales de extracción:
// {
//   total_documentos: number,
//   por_estado: { completado, procesando, pendiente, error },
//   por_categoria: { cedula, certificado_laboral, ... },
//   tasa_exito: number,
//   ultima_actualizacion: string (ISO 8601)
// }

getQueueStats(): Observable<any>
// GET /api/v2/ai/queue/stats
// Estadísticas de la cola de procesamiento:
// {
//   queue: {
//     queue_size: number,
//     workers: number,
//     total_processed: number
//   }
// }
```

### Métodos de certificados

```typescript
getCertificado(id: string): Observable<any>
getCertificadoGenerar(data: any): Observable<Blob>
```

### Métodos de listados

```typescript
getListados(): Observable<any>
getListadosData(id: string): Observable<any>
getIndiceListas(): Observable<any>
```

### Métodos de firmas

```typescript
getFirmas(): Observable<any>
postFirma(firma: FormData): Observable<any>
```

### Interfaz DataCategoria

```typescript
interface DataCategoria {
  label: string;
  path: string;
  icon?: string;
  children?: DataCategoria[];  // Array recursivo
}
```

### Interfaz DatoDemografico

```typescript
interface DatoDemografico {
  DOCUMENTO_DE_IDENTIDAD: string;
  FECHA_NACIMIENTO?: string;           // "YYYY-MM-DD"
  archivosProfesor: any[];
  datosDemograficos: any[];
  [key: string]: any;                  // Otros campos dinámicos
}
```

---

## CategoriaService

**Ubicación:** `src/app/compartidos/servicios/categoria.service.ts`

**Propósito:** Gestión del árbol de categorías documentales de OpenKM.

**Inyección:**

```typescript
private categoriaService = inject(CategoriaService);
```

### Métodos principales

```typescript
setCategorias(categorias: DataCategoria[]): DataCategoria[]
// Almacena copia local del árbol
// Retorna el árbol para chaining

getCategoriasHijas(path: string): DataCategoria[]
// Obtiene categorías hijo de una ruta específica

filtrarPorLabel(label: string): DataCategoria | null
// Busca categoría por etiqueta exacta

mapearLabels(): Record<string, string>
// Retorna objeto de mapeos { path → label }
```

---

## MenuService

**Ubicación:** `src/app/compartidos/servicios/menu.service.ts`

**Propósito:** Construcción dinámica del menú lateral.

**Inyección:**

```typescript
private menuService = inject(MenuService);
```

### Métodos

```typescript
getElementosMenu(): MenuElemento[]
// Retorna array de items del menú
// Lazy-loaded: se construye solo la primera vez y se cachea
// Cada item incluye: label, ruta, rol, visible, ícono

// Estructura cacheada:
// {
//   label: 'Listados',
//   icon: 'pi pi-list-check',
//   route: '/listados',
//   rol: 'gestor',
//   visible: true  // NUEVO
// }
```

### Integración en componente

```typescript
// En menu.component.ts
elementosMenu = this.menuService.getElementosMenu()
  .filter(item => item.visible !== false)  // Filtrar ocultos
  .filter(item => this.authService.tienePermisos(item.rol))  // Filtrar por rol
```

---

## LoggerService

**Ubicación:** `src/app/compartidos/servicios/logger.service.ts`

**Propósito:** Logger que suprime logs en producción para no exponer información del servidor.

**Inyección:**

```typescript
private logger = inject(LoggerService);
```

### Métodos

```typescript
log(message: any, ...args: any[]): void
// console.log() solo en isDevMode() === true
// Suprimido en producción

warn(message: any, ...args: any[]): void
// console.warn() solo en isDevMode() === true
// Suprimido en producción

error(message: any, ...args: any[]): void
// console.error() SIEMPRE visible
// Nunca suprimido (logs de error son críticos)
```

### Uso recomendado

```typescript
// Reemplazar siempre console.log con LoggerService
this.logger.log('Datos cargados:', datos);
this.logger.error('Error al cargar:', error);
```

---

## FileServicio

**Ubicación:** `src/app/compartidos/servicios/file.ts`

**Propósito:** Descarga, manejo y compresión de archivos.

**Inyección:**

```typescript
private fileServicio = inject(FileServicio);
```

### Métodos

```typescript
descarga(blob: Blob, nombre: string): void
// Desencadena descarga del navegador
// Crea blob URL, lo hace clic, y libera memoria

creaZipDesdeBlobs(archivos: ListaDescarga[]): Promise<Blob>
// Compacta múltiples Blobs en ZIP
// Usa JSZip + Archiver internamente
```

---

## FirmasService

**Ubicación:** `src/app/compartidos/servicios/firmas.ts`

**Propósito:** Gestión de firmas digitales para certificados.

**Métodos:**

```typescript
getFirmas(): Observable<any>
postFirma(firma: FormData): Observable<any>
```

---

## ImagenService

**Ubicación:** `src/app/compartidos/servicios/imagen.ts`

**Propósito:** Procesamiento de imágenes (redimensionamiento, conversión, etc.).

**Métodos:**

```typescript
procesar(imagen: File): Promise<Blob>
// Redimensiona, optimiza, o convierte imagen
```

---

## ExcelService

**Ubicación:** `src/app/compartidos/servicios/excel.ts`

**Propósito:** Generación y lectura de archivos Excel.

**Métodos:**

```typescript
generar(datos: any[], titulo: string): Blob
// Crea archivo XLSX desde array de datos
// Usa ExcelJS internamente

leer(archivo: File): Promise<any[]>
// Lee archivo XLSX y retorna array de objetos
```

---

## API Endpoints Configuration

**Ubicación:** `src/app/compartidos/servicios/api-config.ts`

**Propósito:** Centralización de todas las rutas de API v2.

### Estructura

```typescript
export const API_ENDPOINTS: ApiEndpoints = {
  // Sistema
  info:       { endpoint: 'api/v2/system/info', status: 'active' },
  health:     { endpoint: 'api/v2/system/health', status: 'active' },
  
  // Autenticación
  login:      { endpoint: 'api/v2/auth/login', status: 'active' },
  logout:     { endpoint: 'api/v2/auth/logout', status: 'active' },
  
  // Extracción (NUEVO)
  extraccionStats:      { endpoint: 'api/v2/extraccion/stats', status: 'active' },
  extraccionDocente:    { endpoint: 'api/v2/extraccion', status: 'active' },
  jsonExtraido:         { endpoint: 'api/v2/extraccion/json', status: 'active' },
  
  // ... más endpoints
};
```

### Función de utilidad

```typescript
getEndpointUrl(endpointKey: string, baseUrl: string): string
// Retorna URL completa del endpoint
// Ejemplo:
// getEndpointUrl('login', 'http://localhost:3000')
// → 'http://localhost:3000/api/v2/auth/login'
```

### Uso en componentes

```typescript
const loginUrl = getEndpointUrl('login', this.configService.getApiBaseUrl());
// En lugar de:
// const loginUrl = 'http://localhost:3000/api/v2/auth/login';
```

---

## Patrones de Servicios

### Patrón Fachada (Data Service)

```typescript
// En lugar de múltiples servicios HTTP diferentes:
private http = inject(HttpClient);

// Usar Data service centralizado:
private data = inject(Data);
this.data.getInfoProfesor(cedula);
```

### Patrón Observable + Caching

```typescript
private _labels: Record<string, string> | null = null;

getLabels(): Record<string, string> {
  if (!this._labels) {
    this._labels = this.construirLabels();
  }
  return this._labels;
}
```

### Patrón Promise para operaciones async

```typescript
async getArchivoProfesorUuid(cedula: string, nombre: string): Promise<any> {
  return this.data.getDatos(cedula, nombre).toPromise();
}

// En componente:
const uuid = await this.data.getArchivoProfesorUuid(cedula, nombre);
```

---

## Flujo de datos ejemplo: Login

```
1. Usuario ingresa credenciales en login.component
   |
2. Componente llama: this.auth.login(username, password)
   |
3. Auth service:
   - POST /api/v2/auth/login {username, password}
   - AuthInterceptor agrega withCredentials: true
   - Respuesta: {success, user, session_id}
   |
4. AuthService actualiza signals:
   - usuario.set(user)
   - cargando.set(false)
   - error.set(null)
   |
5. Componente detecta estaAutenticado() signal cambió a true
   |
6. Router navega a returnUrl o '/'
   |
7. AuthGuard en próximas navegaciones:
   - usuario() tiene valor → retorna true (sin red)
   - Cookie httpOnly se envía automáticamente en cada request
```

---

**Última actualización:** Mayo 21, 2026
