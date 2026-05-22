# Tabla Completa de Rutas RUND MGP

Documentación exhaustiva de todas las rutas, componentes, guards, y modos SSR.

## Resumen General

| Ruta | Guard | Componente | RenderMode | Roles | Visible |
|------|-------|-----------|-----------|-------|---------|
| `/` | — | Redirect | — | — | — |
| `/login` | — | Login | `Prerender` | público | — |
| `/validacion` | — | Validacion | `Prerender` | público | — |
| `/acceso-denegado` | — | AccesoDenegado | `Prerender` | público | — |
| `/listados` | `authGuard` | Listados | `Server` | gestor+ | sí |
| `/extraccion` | `authGuard` | Extraccion | `Server` | gestor+ | sí |
| `/gestion` | `adminGuard` | Gestion | `Server` | admin | sí |
| `/dashboard` | `authGuard` | Dashboard | `Server` | directivo+ | no |
| `/consultas` | `authGuard` | Consultas | `Server` | directivo+ | no |
| `/certificados` | `authGuard` | Certificados | `Server` | gestor+ | no |
| `/herramientas` | `adminGuard` | Herramientas | `Server` | admin | no |
| `/**` | — | Redirect | — | — | — |

## Rutas Públicas (sin autenticación)

### `/login`

**Guard:** Ninguno (acceso público)

**Componente:** `Login`

**Ubicación:** `src/app/compartidos/componentes/login/`

**RenderMode:** `Prerender`

**Descripción:** Formulario de autenticación LDAP de ESAP.

**Características:**
- Campo username (usuario.apellido)
- Campo password
- Botón de login LDAP (siempre visible)
- Botón de login de desarrollo (solo si `isDevMode() === true`)

**Roles permitidos:** Público (sin autenticación)

**Flujo:**
1. Usuario ingresa `username` y `password`
2. POST `/api/v2/auth/login`
3. Si exitoso → navega a `returnUrl` o `/listados`
4. Si falla → muestra error

**Query params:**
- `returnUrl` — Ruta a la que redirigir tras login exitoso (ej: `/gestion`)

**Botón "Login de Desarrollo":**

```typescript
// En login.component.ts
if (isDevMode()) {
  // Botón visible
  devLogin(email: string) {
    this.auth.devLogin(email).subscribe(...);
  }
}
```

Emails de prueba reconocidos:
- `usuario.administrador@esap.edu.co` → rol: admin
- `usuario.gestor@esap.edu.co` → rol: gestor
- `usuario.directivo@esap.edu.co` → rol: directivo
- `usuario.usuario@esap.edu.co` → rol: usuario

**Requiere:**
- rund-auth debe tener `DEV_FAKE_LOGIN=true` habilitado en desarrollo

---

### `/validacion`

**Guard:** Ninguno (acceso público)

**Componente:** `Validacion`

**Ubicación:** `src/app/vistas/validacion/`

**RenderMode:** `Prerender`

**Descripción:** Verificación pública de certificados por ID (sin autenticación).

**Características:**
- Campo de entrada para ID de certificado
- Búsqueda y validación del certificado
- Visualización de datos del certificado (si es válido)

**Roles permitidos:** Público (usuario anónimo)

**Flujo:**
1. Usuario ingresa ID de certificado
2. GET `/api/v2/certificados?id={id}`
3. Si existe → muestra detalles del certificado
4. Si no existe → muestra mensaje "certificado no encontrado"

---

### `/acceso-denegado`

**Guard:** Ninguno (acceso público)

**Componente:** `AccesoDenegado`

**Ubicación:** `src/app/compartidos/componentes/acceso-denegado/`

**RenderMode:** `Prerender`

**Descripción:** Página mostrada cuando usuario intenta acceder a ruta sin permisos.

**Características:**
- Mensaje: "No tienes permiso para acceder a esta página"
- Botón de retorno a página anterior
- Botón de regreso a `/listados`

**Activación:**
- `adminGuard` redirige aquí si `!esAdmin()`
- AuthInterceptor redirige aquí si HTTP 403 (Forbidden)

---

## Rutas Autenticadas (requieren login)

### `/listados`

**Guard:** `authGuard`

**Componente:** `Listados`

**Ubicación:** `src/app/vistas/listados/`

**RenderMode:** `Server` (datos personalizados por usuario)

**Descripción:** Gestión de listados docentes (carga de CSV/Excel desde OneDrive, ARCA, etc.).

**Rol mínimo requerido:** `gestor`

**Roles que acceden:** gestor, admin

**Visible en menú:** Sí

**Características:**
- Carga de listados desde múltiples fuentes
- Vista previa de datos
- Importación a OpenKM

**Endpoints utilizados:**
- GET `/api/v2/listados/indice` — Índice de listados disponibles
- GET `/api/v2/listados/datos` — Datos del listado
- POST `/api/v2/listados/cargar` — Carga nuevo listado (multipart/form-data)

---

### `/extraccion` (NUEVO)

**Guard:** `authGuard`

**Componente:** `Extraccion`

**Ubicación:** `src/app/vistas/extraccion/`

**RenderMode:** `Server` (estadísticas en tiempo real)

**Descripción:** Panel de estadísticas de extracción de datos con IA (NuExtract vía rund-ai).

**Rol mínimo requerido:** `gestor`

**Roles que acceden:** gestor, admin

**Visible en menú:** Sí

**Características:**
- Total de documentos procesados
- Estado por documento (completado, procesando, pendiente, error)
- Tasa de éxito general
- Cola activa de procesamiento
- Desglose por tipo de documento (tabla)
- Última actualización (timestamp es-CO)

**Endpoints utilizados:**
- GET `/api/v2/extraccion/stats` — Estadísticas generales
  ```json
  {
    "total_documentos": 150,
    "por_estado": {
      "completado": 100,
      "procesando": 10,
      "pendiente": 30,
      "error": 10
    },
    "por_categoria": {
      "cedula": {...},
      "certificado_laboral": {...}
    },
    "tasa_exito": 87.5,
    "ultima_actualizacion": "2026-05-21T19:30:00Z"
  }
  ```

- GET `/api/v2/ai/queue/stats` — Estadísticas de la cola
  ```json
  {
    "queue": {
      "queue_size": 20,
      "workers": 3,
      "total_processed": 500
    }
  }
  ```

**Actualización:** Llamadas paralelas con `forkJoin` al cargar

---

### `/gestion`

**Guard:** `adminGuard`

**Componente:** `Gestion`

**Ubicación:** `src/app/vistas/gestion/`

**RenderMode:** `Server` (datos en tiempo real, solo admin)

**Descripción:** Gestión administrativa de documentos de hojas de vida.

**Rol mínimo requerido:** `admin`

**Roles que acceden:** admin

**Visible en menú:** Sí

**Subvistas:**

#### `/gestion/carga`

**Componente:** `Carga`

**Descripción:** Carga de nuevos documentos a OpenKM por cedula.

**Características:**
- Selector de profesor
- Selector de tipo de documento (categoría)
- Upload de archivo (p-fileUpload)
- Validaciones de tipo y tamaño

#### `/gestion/edicion`

**Componente:** `Edicion`

**Descripción:** Edición, visualización, eliminación de documentos existentes.

**Subcomponentes:**

##### `/gestion/edicion/[cedula]`

**Características:**
- Ficha docente con datos demográficos
- Lista de documentos por categoría (árbol)
- Vista previa de documento con acordeón (MEJORADO)
  - Panel 1: "Datos del documento" (propiedades)
  - Panel 2: "Datos extraídos" (JSON side-car)
  - Panel 3: "Reemplazar documento"
- Botones: Descargar, Eliminar, Reemplazar

**Componentes anidados:**

###### `DownloadPreview`

Visualización de documento con datos extraídos (ver `COMPONENTES.md`)

###### `BorraDocumentos`

Eliminación de uno o varios documentos

**Ubicación:** `src/app/vistas/gestion/edicion/borra-documentos/`

###### `Reemplazo`

Reemplazo de documento existente con uno nuevo

**Ubicación:** `src/app/vistas/gestion/edicion/reemplazo/`

**Endpoints utilizados:**
- GET `/api/v2/profesores?cedula={cedula}` — Datos del profesor
- GET `/api/v2/archivos/datos?cedula={cedula}` — Lista de documentos
- GET `/api/v2/archivos/{uuid}` — Descargar documento
- GET `/api/v2/extraccion/json/{cedula}/{nombre}` — Datos extraídos
- DELETE `/api/v2/archivos/{uuid}` — Eliminar documento
- PUT `/api/v2/archivos/{uuid}` — Actualizar documento
- POST `/api/v2/archivos/subir` — Subir nuevo documento

---

### `/dashboard`

**Guard:** `authGuard`

**Componente:** `Dashboard`

**Ubicación:** `src/app/vistas/dashboard/`

**RenderMode:** `Server` (datos personalizados por usuario)

**Descripción:** Panel de control con gráficos Chart.js de documentos por categoría.

**Rol mínimo requerido:** `directivo`

**Roles que acceden:** directivo, gestor, admin

**Visible en menú:** No (oculto actualmente)

**Características:**
- Gráfico de documentos por categoría (tipo pastel o barras)
- Estadísticas generales
- SSR-safe: usa `isPlatformBrowser()` antes de Chart.js

**Protección SSR:**

```typescript
if (isPlatformBrowser(this.platformId)) {
  // Inicializar Chart.js solo en navegador
}
```

**Endpoints utilizados:**
- GET `/api/v2/categorias/arbol` — Estructura de categorías
- GET `/api/v2/categorias/cruce` — Estadísticas por categoría

---

### `/consultas`

**Guard:** `authGuard`

**Componente:** `Consultas`

**Ubicación:** `src/app/vistas/consultas/`

**RenderMode:** `Server` (datos personalizados por usuario)

**Descripción:** Consultas cruzadas de datos documentales.

**Rol mínimo requerido:** `directivo`

**Roles que acceden:** directivo, gestor, admin

**Visible en menú:** No (oculto actualmente)

**Características:**
- Búsqueda avanzada de documentos
- Filtros por criterios múltiples
- Exportación de resultados

---

### `/certificados`

**Guard:** `authGuard`

**Componente:** `Certificados`

**Ubicación:** `src/app/vistas/certificados/`

**RenderMode:** `Server` (datos personalizados por usuario)

**Descripción:** Generación y descarga de certificados en PDF/DOCX con firma digital.

**Rol mínimo requerido:** `gestor`

**Roles que acceden:** gestor, admin

**Visible en menú:** No (oculto actualmente)

**Características:**
- Selector de profesor
- Selector de tipo de certificado
- Generación de PDF/DOCX
- Firma digital (RSA con PKCS#12)

**Componentes anidados:**

#### `FirmaCertificado`

Componente de firma digital

**Ubicación:** `src/app/compartidos/componentes/firma-certificado/`

**Endpoints utilizados:**
- GET `/api/v2/certificados?cedula={cedula}` — Lista de certificados
- POST `/api/v2/documentos/generar` — Generar certificado (PDF/DOCX)
- GET `/api/v2/firmas/lista` — Lista de firmas disponibles
- POST `/api/v2/firmas/subir` — Agregar nueva firma

---

### `/herramientas`

**Guard:** `adminGuard`

**Componente:** `Herramientas`

**Ubicación:** `src/app/vistas/herramientas/`

**RenderMode:** `Server` (datos en tiempo real, solo admin)

**Descripción:** Herramientas administrativas (gestión de firmas, configuración, etc.).

**Rol mínimo requerido:** `admin`

**Roles que acceden:** admin

**Visible en menú:** No (oculto actualmente)

**Subcomponentes:**

#### `AdminFirmas`

Administración de firmas digitales

**Ubicación:** `src/app/compartidos/componentes/admin-firmas/`

**Características:**
- Listar firmas
- Agregar nueva firma
- Editar firma
- Eliminar firma
- Procesar/aplicar firma a certificados

**Subcomponentes:**
- `add-firma/` — Agregar firma
- `edita-firma/` — Editar firma
- `procesa-firma/` — Aplicar firma

**Endpoints utilizados:**
- GET `/api/v2/firmas/lista` — Lista de firmas
- POST `/api/v2/firmas/subir` — Subir firma (PKCS#12)
- PUT `/api/v2/firmas/{id}` — Actualizar firma
- DELETE `/api/v2/firmas/{id}` — Eliminar firma

---

## Rutas Especiales (Fallback)

### `/`

**Guard:** Ninguno

**Acción:** Redirect a `/listados`

```typescript
// En app.routes.ts:
{
  path: '',
  redirectTo: '/listados',
  pathMatch: 'full'
}
```

---

### `/**` (Catch-all)

**Guard:** Ninguno

**RenderMode:** `Client`

**Acción:** Redirect a `/listados` (rutas no encontradas)

```typescript
// En app.routes.ts (al final):
{
  path: '**',
  redirectTo: '/listados'
}
```

---

## Matriz de Permisos

### Roles

```
Jerarquía: admin > gestor > directivo > usuario
```

### Acceso por rol

| Rol | Rutas accesibles |
|-----|------------------|
| `admin` | todas excepto `/validacion` |
| `gestor` | `/listados`, `/extraccion`, `/certificados`, `/gestion`, `/herramientas`, `/dashboard` |
| `directivo` | `/dashboard`, `/consultas` |
| `usuario` | `/validacion` (pública) |
| público | `/login`, `/validacion`, `/acceso-denegado` |

### Comportamiento de guards

**authGuard:**
1. ¿Usuario signal tiene valor? → true (sin red)
2. Si no → GET `/api/v2/auth/session`
3. ¿Sesión válida? → true
4. Si no → redirect `/login?returnUrl=<ruta-actual>`

**adminGuard:**
1. ¿`estaAutenticado()`? → verificar con authGuard
2. ¿`esAdmin()`? → true
3. Si no → redirect `/acceso-denegado`

---

## Configuración SSR por Ruta

**Definido en:** `src/app/app.routes.server.ts`

```typescript
const serverRoutes: ServerRoute[] = [
  { path: '/login', renderMode: RenderMode.Prerender },
  { path: '/validacion', renderMode: RenderMode.Prerender },
  { path: '/acceso-denegado', renderMode: RenderMode.Prerender },
  { path: '/listados', renderMode: RenderMode.Server },
  { path: '/extraccion', renderMode: RenderMode.Server },
  { path: '/dashboard', renderMode: RenderMode.Server },
  { path: '/consultas', renderMode: RenderMode.Server },
  { path: '/gestion/**', renderMode: RenderMode.Server },
  { path: '/certificados', renderMode: RenderMode.Server },
  { path: '/herramientas', renderMode: RenderMode.Server },
  { path: '/**', renderMode: RenderMode.Client },
];
```

### Significado de RenderModes

- **Prerender:** Pre-renderiza en build (cache estático, público)
- **Server:** Renderiza en cada petición (datos personalizados)
- **Client:** Renderiza solo en navegador (fallback, JavaScript)

---

## Lazy Loading

Todas las rutas usan `loadComponent()` para generar chunks separados:

```typescript
{
  path: 'extraccion',
  loadComponent: () => import('@vistas/extraccion/extraccion').then(m => m.Extraccion),
  canActivate: [authGuard]
}
```

**Resultado en build:**
- main-[hash].js — Bundle principal
- chunk-extraccion-[hash].js — Código de /extraccion
- chunk-gestion-[hash].js — Código de /gestion
- ... 14+ chunks adicionales

**Ventajas:**
- Bundle inicial < 2 MB
- Carga bajo demanda (faster initial page load)
- Mejor caching (cambios en una ruta no invalidan others)

---

## Flujo de Navegación Típico

```
1. Usuario navega a http://localhost:4000
   |
2. Express (server.ts) recibe GET /
   |
3. Redirige a /listados
   |
4. authGuard se ejecuta
   |
5. Usuario signal vacío → verificarSesion()
   |
6. GET /api/v2/auth/session
   |
7. ¿Sesión válida?
   ├─ Sí → Renderiza Listados (SSR: Server)
   │        Navega a /listados
   │
   └─ No → Renderiza Login (SSR: Prerender)
            Query param returnUrl=/listados
            Usuario ingresa credenciales
            POST /api/v2/auth/login
            Cookie httpOnly se establece
            Navega a /listados
            Componente Listados se carga
```

---

**Última actualización:** Mayo 21, 2026
