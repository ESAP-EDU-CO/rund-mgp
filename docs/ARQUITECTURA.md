# Arquitectura de RUND MGP (Angular 21 con SSR)

rund-mgp es una aplicación frontend Angular 21 con **Server-Side Rendering (SSR)** mediante Express.js. La arquitectura se basa en lazy loading de componentes, servicios compartidos, y un sistema de autenticación basado en JWT con cookies httpOnly.

## 1. Capas Arquitectónicas

### 1.1 Capa de Presentación (Views)

Ubicación: `src/app/vistas/`

Páginas principales que implementan las funcionalidades del sistema. Cada vista lazy-carga su componente:

```
vistas/
├── dashboard/          # Panel de estadísticas (SSR: Server)
├── listados/           # Gestión de listados docentes (SSR: Server)
├── extraccion/         # Estadísticas de extracción AI (NEW, SSR: Server)
├── gestion/            # Gestión de documentos administrativos
│   ├── carga/          # Carga de documentos
│   ├── edicion/        # Edición y vista de documentos
│   │   ├── adicion/
│   │   ├── borra-documentos/
│   │   ├── download-preview/    # Vista previa con acordeón (MEJORADO)
│   │   └── reemplazo/
├── certificados/       # Generación de certificados (SSR: Server, visible: false)
├── consultas/          # Consultas cruzadas (SSR: Server, visible: false)
├── validacion/         # Validación pública de certificados (SSR: Prerender)
└── herramientas/       # Herramientas administrativas (SSR: Server, visible: false)
```

### 1.2 Capa de Componentes Compartidos

Ubicación: `src/app/compartidos/componentes/`

Componentes reutilizables sin estado de negocio:

```
componentes/
├── header/             # Encabezado con usuario y navegación
├── menu/               # Menú lateral (routerLinkActive mejorado)
├── login/              # Formulario de autenticación
├── acceso-denegado/    # Página de acceso denegado
├── ficha-docente/      # Ficha de datos del docente (MEJORADO: date picker)
├── carga-documento/    # Componente de carga de archivos
├── documentos/         # Previsualizaciones
│   ├── preview/
│   └── vista-datos/
├── chart/              # Gráficos Chart.js (protegido con isPlatformBrowser)
├── firma-certificado/  # Firma digital en certificados
├── admin-firmas/       # Administración de firmas
│   ├── add-firma/
│   ├── edita-firma/
│   └── procesa-firma/
├── extrae-datos/       # Disparador de extracción AI
└── vista-excel/        # Visualizador de Excel
```

### 1.3 Capa de Servicios

Ubicación: `src/app/compartidos/servicios/`

Servicios centrales que manejan la lógica de negocio:

```
servicios/
├── auth.ts                   # Autenticación (Signals: usuario, cargando, error)
├── config.service.ts         # Configuración dinámica (apiBaseUrl desde /api/config)
├── api-config.ts             # Definición centralizada de endpoints API v2
├── data.ts                   # Fachada de datos (orquesta CategoriaService + MenuService)
├── data-types.ts             # Interfaces TypeScript (Usuario, DatoArchivo, etc.)
├── categoria.service.ts      # Gestión del árbol de categorías documentales
├── menu.service.ts           # Construcción del menú de navegación
├── file.ts                   # Descarga y manejo de archivos
├── firmas.ts                 # Gestión de firmas digitales
├── imagen.ts                 # Procesamiento de imágenes
├── excel.ts                  # Generación de archivos Excel
└── logger.service.ts         # Logger (suprime logs en producción)
```

### 1.4 Capa de Guards e Interceptores

Ubicación: `src/app/compartidos/guards/` y `src/app/compartidos/interceptores/`

Protección de rutas y manipulación de peticiones HTTP:

```
guards/
├── auth-guard.ts             # authGuard (cualquier usuario autenticado)
└──                           # adminGuard (solo rol admin)

interceptores/
└── auth-interceptor.ts       # Agrega withCredentials, maneja 401/403
```

### 1.5 Capa de Módulos Compartidos

Ubicación: `src/app/compartidos/modulos/`

NgModules de terceros centralizados:

```
modulos/
├── primeng/                  # PrimeNG + DatePickerModule + AccordionModule
├── pipes/                    # SafePipe y otros pipes personalizados
└── icons/                    # FontAwesome + PrimeIcons
```

## 2. Server-Side Rendering (SSR)

### 2.1 Flujo de una Petición SSR

```
Navegador
    |
    v
Express (server.ts)
    |
    |-- GET /api/config  →  Responde JSON con apiBaseUrl
    |                        (desde process.env.API_BASE_URL)
    |
    |-- GET /<ruta>      →  AngularNodeAppEngine.handle(req)
    |                        Renderiza en servidor (SSR)
    |                        Retorna HTML completo
    |
    +-- GET /assets/*    →  express.static (cache 1 año)
```

### 2.2 Modos de Renderizado por Ruta

Definido en `src/app/app.routes.server.ts`:

| Ruta | RenderMode | Propósito |
|------|-----------|----------|
| `/login`, `/validacion`, `/acceso-denegado` | `Prerender` | Contenido público, cacheable |
| `/listados`, `/certificados`, `/dashboard`, `/consultas` | `Server` | Datos personalizados por usuario |
| `/gestion`, `/herramientas` | `Server` | Solo admin, datos en tiempo real |
| `/extraccion` | `Server` | Solo gestor+, estadísticas en tiempo real |
| `/**` | `Client` | Fallback para rutas dinámicas |

### 2.3 Inicialización con APP_INITIALIZER

`ConfigService` se carga **antes** de que la aplicación arranque:

```typescript
// En app.config.ts:
{
  provide: APP_INITIALIZER,
  useFactory: (configService: ConfigService) => () => configService.loadConfig(),
  deps: [ConfigService],
  multi: true
}
```

Esto permite que todos los servicios tengan acceso a `apiBaseUrl` de forma síncrona después del bootstrap.

### 2.4 Protecciones SSR

- `isPlatformBrowser()` antes de acceder al DOM (charts, PDF.js)
- No se ejecuta código de cliente en el servidor
- Las variables globales como `window` se protegen con guardias

## 3. Sistema de Autenticación

### 3.1 Flujo de Login

```
Angular (rund-mgp)
    | POST /api/v2/auth/login {username, password}
    v
PHP BFF (rund-api)
    | POST /ldap/login
    v
Node.js (rund-auth)
    | Valida contra LDAP de ESAP
    | Genera JWT RS256 + sesión Redis (8 horas)
    v
PHP BFF
    | Almacena JWT en $_SESSION
    | Responde {success, user, session_id}
    v
Angular
    | Actualiza signal `usuario`
    | Navega a returnUrl o '/'
```

### 3.2 AuthService con Signals

Ubicación: `src/app/compartidos/servicios/auth.ts`

```typescript
// Signals de solo lectura
usuario:         Signal<Usuario | null | undefined>
cargando:        Signal<boolean>
error:           Signal<string | null>

// Computed signals
estaAutenticado: Signal<boolean>
esAdmin:         Signal<boolean>

// Métodos
login(username, password): Observable<LoginResponse>
logout(): Observable<LogoutResponse>
verificarSesion(): Observable<SessionResponse>
devLogin(email): Observable<LoginResponse>  // Solo isDevMode()
```

### 3.3 Guards de Rutas

- **authGuard**: Verifica si `usuario` signal tiene valor. Si no, llama `verificarSesion()`. Rechaza si no autenticado.
- **adminGuard**: Verifica rol === 'admin'. Rechaza a `/acceso-denegado` si no es admin.

## 4. Flujo de Datos

### 4.1 Patrón Fachada (Data Service)

El servicio `Data` (`data.ts`) actúa como fachada centralizada:

```
Componentes
    |
    v
Data Service (fachada)
    |
    +-- CategoriaService      (árbol de categorías + estadísticas)
    +-- MenuService           (construcción del menú)
    +-- HTTP Client           (peticiones a rund-api)
```

### 4.2 Endpoints API v2

Todos los endpoints centralizados en `api-config.ts`:

```typescript
const API_ENDPOINTS: ApiEndpoints = {
  // Autenticación
  login:           'api/v2/auth/login',
  logout:          'api/v2/auth/logout',
  session:         'api/v2/auth/session',
  
  // Categorías
  categorias:      'api/v2/categorias/arbol',
  cruce:           'api/v2/categorias/cruce',
  
  // Archivos
  datos:           'api/v2/archivos/datos',
  imagen:          'api/v2/archivos/imagenes',
  postFile:        'api/v2/archivos/subir',
  
  // AI / Extracción (NUEVO)
  extraeDatos:     'api/v2/ai/extraer',
  extractionStatistics: 'api/v2/ai/extraction/statistics',
  queueStats:      'api/v2/ai/queue/stats',
  extraccionStats: 'api/v2/extraccion/stats',
  extraccionDocente: 'api/v2/extraccion',
  jsonExtraido:    'api/v2/extraccion/json',
  
  // ... más endpoints
};
```

Utilidad para obtener URLs:

```typescript
const url = getEndpointUrl('login', configService.getApiBaseUrl());
// Resultado: "http://rund-api:3000/api/v2/auth/login"
```

## 5. Routing y Code Splitting

### 5.1 Lazy Loading de Componentes

Todas las vistas usan `loadComponent()`:

```typescript
{
  path: 'extraccion',
  loadComponent: () => import('@vistas/extraccion/extraccion').then(m => m.Extraccion),
  canActivate: [authGuard]
}
```

Esto genera 14+ chunks separados en el build de producción.

### 5.2 Presupuestos de Build

Configurado en `angular.json`:

| Tipo | Warning | Error |
|------|---------|-------|
| Bundle inicial | 2 MB | 2.5 MB |
| Estilos por componente | 10 kB | 20 kB |

## 6. Configuración Dinámica al Arranque

### 6.1 ConfigService

Realiza `GET /api/config` al servidor Express para obtener `apiBaseUrl` dinámicamente.

**Ventajas:**
- Misma imagen Docker funciona en múltiples entornos
- Solo cambiar `API_BASE_URL` env var
- Soporta URLs internas (Docker) y externas (Internet)

**Fallback:** Si `/api/config` falla, usa `http://localhost:3000`

### 6.2 Carga de Datos Iniciales

El servicio `Data` usa `forkJoin` para inicializar en paralelo:

```typescript
forkJoin({
  labels: this.getCategorias(),
  categorias: this.getCategorias()
}).subscribe(({ labels, categorias }) => {
  // Ambas peticiones completas
})
```

## 7. Seguridad HTTP

### 7.1 CSP (Content Security Policy)

Definida en `server.ts` para cada respuesta:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob:;
  connect-src 'self' <API_BASE_URL>;
  worker-src blob:;
```

**Justificación:**
- `script-src 'unsafe-inline'`: Requerido por Quill (sin fix disponible)
- `worker-src blob:`: Necesario para PDF.js

### 7.2 AuthInterceptor

Aplicado globalmente a todas las peticiones:

```typescript
// Clona petición con withCredentials: true
// Maneja 401 → logout + redirect a /login
// Maneja 403 → redirect a /acceso-denegado
// Maneja 0 (sin red) → log de error
```

### 7.3 SafePipe

Pipe de sanitización para HTML/URL/Style bypass:

```html
{{ valor | safe:'html' }}
{{ valor | safe:'url' }}
{{ valor | safe:'resourceUrl' }}
{{ valor | safe:'style' }}
```

(Nota: `bypassSecurityTrustScript` fue removido intencionalmente por seguridad)

## 8. Compilación Multi-Stage

### 8.1 Dockerfile

Etapa 1 — Builder (`node:22-alpine`):
- Instala dependencias del sistema
- `npm ci` + `npm run build`
- Output en `/app/dist/rund-mgp/`

Etapa 2 — Runtime (`node:22-alpine`):
- Usuario no-root: `angular:nodejs` (UID 1001)
- Solo `curl` para health check
- Ejecuta `start.sh` → `node server/server.mjs`

### 8.2 Health Check

Cada 30 segundos:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3
  CMD curl -f http://localhost:4000/health || curl -f http://localhost:4000/ || exit 1
```

## 9. Flujo de Datos Ejemplo: Sección de Extracción

**Caso de uso:** Un gestor accede a `/extraccion` para ver estadísticas de documentos procesados.

```
1. Usuario navega a /extraccion
   |
2. authGuard verifica sesión (sin red si usuario signal válido)
   |
3. Componente Extraccion.ngOnInit() se ejecuta
   |
4. forkJoin llama en paralelo:
   - Data.getExtraccionStats()  → GET /api/v2/extraccion/stats
   - Data.getQueueStats()       → GET /api/v2/ai/queue/stats
   |
5. AuthInterceptor agrega withCredentials: true
   |
6. rund-api valida JWT desde $_SESSION
   |
7. Respuestas llegan a componente
   |
8. Template renderiza estadísticas:
   - Total documentos, completados, procesando, errores, pendientes
   - Tasa de éxito
   - Desglose por tipo de documento en tabla
   - Cola activa
```

## 10. Patrón de Módulos Compartidos

### 10.1 PrimengModule

Centraliza todas las importaciones de PrimeNG en un único módulo:

```typescript
@NgModule({
  imports: [
    ButtonModule,
    TableModule,
    DatePickerModule,    // NUEVO
    AccordionModule,     // NUEVO
    // ... más módulos
  ],
  exports: [
    ButtonModule,
    TableModule,
    DatePickerModule,
    AccordionModule,
    // ... más módulos
  ]
})
export class PrimengModule { }
```

Ventajas:
- No duplicar importaciones en cada componente
- Fácil agregar/remover módulos de PrimeNG globalmente
- Componentes importan solo `PrimengModule`

### 10.2 PipesModule

Centraliza pipes personalizados (SafePipe, etc.)

### 10.3 IconsModule

Centraliza FontAwesome + PrimeIcons

---

**Última actualización:** Mayo 21, 2026
