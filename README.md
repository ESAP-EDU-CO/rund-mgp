# rund-mgp

Frontend Angular 21 con SSR del sistema **RUND** (Registro Único Nacional Docente) de la ESAP (Escuela Superior de Administración Pública — Colombia). Proporciona la interfaz web para la gestión documental de hojas de vida de aproximadamente 300 profesores (~12 000 documentos), con visualización de estadísticas, generación de certificados, validación pública y herramientas administrativas.

## Tabla de Contenidos

1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Prerequisitos](#3-prerequisitos)
4. [Inicio Rápido — Desarrollo Local](#4-inicio-rápido--desarrollo-local)
5. [Arquitectura de la Aplicación](#5-arquitectura-de-la-aplicación)
6. [Rutas y Módulos de la Aplicación](#6-rutas-y-módulos-de-la-aplicación)
7. [Sistema de Autenticación](#7-sistema-de-autenticación)
8. [Servicios Principales](#8-servicios-principales)
9. [Variables de Entorno](#9-variables-de-entorno)
10. [Scripts Disponibles](#10-scripts-disponibles)
11. [Testing](#11-testing)
12. [CI/CD — GitHub Actions](#12-cicd--github-actions)
13. [Despliegue con Docker](#13-despliegue-con-docker)
14. [Despliegue en el Stack RUND Completo](#14-despliegue-en-el-stack-rund-completo)
15. [Estado del Proyecto y Plan de Mejoras](#15-estado-del-proyecto-y-plan-de-mejoras)
16. [Solución de Problemas](#16-solución-de-problemas)

---

## 1. Descripción del Proyecto

rund-mgp es el portal web del sistema RUND. Se comunica exclusivamente con **rund-api** (backend PHP), que actúa como BFF (Backend for Frontend). rund-api se encarga a su vez de autenticar contra **rund-auth** (Node.js/LDAP), consultar documentos en **rund-core** (OpenKM), procesar OCR con **rund-ocr** y ejecutar extracción de datos con **rund-ai**.

### Funcionalidades Principales

- **Dashboard**: Panel con estadísticas y gráficos de documentos por categoría usando Chart.js
- **Listados**: Gestión y carga de listados docentes (CSV/Excel) desde OneDrive ESAP, ARCA o RUND
- **Gestión**: Carga, edición, reemplazo y eliminación de documentos de hojas de vida (solo administradores)
- **Consultas**: Consultas cruzadas de datos documentales
- **Certificados**: Generación y descarga de certificados en PDF/DOCX firmados digitalmente
- **Validacion**: Verificación pública de certificados por ID (sin autenticación requerida)
- **Herramientas**: Administración de firmas digitales y utilidades (solo administradores)
- **Extracción AI**: Disparador de extracción estructurada de datos con NuExtract via rund-ai

---

## 2. Stack Tecnológico

| Capa | Tecnología | Version |
|------|-----------|---------|
| **Framework** | Angular | 21.1.5 |
| **SSR** | @angular/ssr (Express.js) | 21.1.4 |
| **Lenguaje** | TypeScript | ~5.9.3 |
| **Runtime servidor** | Node.js | 22 (Alpine) |
| **UI Component Library** | PrimeNG | 21.1.1 |
| **Tema PrimeNG** | Aura (preset personalizado) | @primeng/themes 21.0.4 |
| **Iconos** | PrimeIcons + FontAwesome 6 | 7.0.0 / 6.7.2 |
| **Graficos** | Chart.js | 4.5.0 |
| **Editor de texto enriquecido** | Quill (via PrimeNG EditorModule) | 2.0.3 |
| **Generacion de Excel** | ExcelJS | 4.4.0 |
| **Visualizacion PDF** | pdfjs-dist | 5.4.449 |
| **Compresion** | JSZip + Archiver | 3.10.1 / 7.0.1 |
| **Procesamiento de imagenes** | image-js | 0.37.0 |
| **Testing** | Karma + Jasmine | 6.4.x / 5.7.x |
| **Linting** | ESLint + angular-eslint | 9.39.2 / 21.2.0 |
| **Contenedor** | Docker (multi-stage) | — |

### Configuracion TypeScript — Path Aliases

El proyecto usa aliases de paths para evitar rutas relativas profundas:

```
@vistas/*       → src/app/vistas/*
@componentes/*  → src/app/compartidos/componentes/*
@modulos/*      → src/app/compartidos/modulos/*
@servicios/*    → src/app/compartidos/servicios/*
@pipes/*        → src/app/compartidos/pipes/*
@librerias/*    → src/app/compartidos/librerias/*
@compartidos/*  → src/app/compartidos/*
@app/*          → src/app/*
```

---

## 3. Prerequisitos

### Para desarrollo local

| Herramienta | Version minima | Notas |
|------------|----------------|-------|
| Node.js | 20+ (recomendado: 22) | Usar nvm o similar |
| npm | 9+ | Gestor exclusivo — no usar yarn |
| Google Chrome | Cualquier version reciente | Requerido por Karma para ejecutar tests |
| rund-api | Corriendo en `:3000` | Backend PHP del stack RUND |

### Para despliegue con Docker

| Herramienta | Version |
|------------|---------|
| Docker | 24+ |
| Docker Compose | 2.x |

### Servicios del stack RUND requeridos

rund-mgp depende de **rund-api** para todas sus operaciones. rund-api a su vez orquesta:

- **rund-auth** (`:8081`) — Autenticacion LDAP/JWT
- **rund-core** (`:8080`) — Repositorio OpenKM
- **redis** (`:6379`) — Sesiones
- **postgres** (`:5433`) — Base de datos de autenticacion

Como minimo, `rund-api` debe estar corriendo y accesible en `http://localhost:3000`.

---

## 4. Inicio Rapido — Desarrollo Local

### 4.1 Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd rund-deployment/rund-mgp
```

### 4.2 Instalar dependencias

```bash
npm install --legacy-peer-deps
```

El flag `--legacy-peer-deps` es necesario porque algunos modulos de PrimeNG aun no declaran soporte formal a Angular 21. El script `postinstall` aplica automaticamente el parche `scripts/patch-ssr.js` que corrige un bug de `@angular/ssr@21.x` donde `allowedHosts` no es iterable durante el build.

### 4.3 Iniciar el servidor de desarrollo

```bash
npm start
```

Esto ejecuta `ng serve --no-hmr` y levanta el servidor de desarrollo Angular en:

```
http://localhost:4200
```

El servidor de desarrollo Angular no usa SSR. La aplicacion se sirve como SPA. El servidor SSR Express solo se usa en el build de produccion.

### 4.4 Verificar la conexion con rund-api

Por defecto, `ConfigService` obtiene la configuracion desde `/api/config` en el mismo host. En desarrollo local (puerto 4200), este endpoint no existe, por lo que el servicio usa el fallback con `apiBaseUrl: 'http://localhost:3000'`.

Para verificar que rund-api esta accesible:

```bash
curl http://localhost:3000/api/v2/system/health
```

### 4.5 Iniciar sesion

Navegar a `http://localhost:4200/login`.

**Opcion A — Login de desarrollo** (requiere `DEV_FAKE_LOGIN=true` en rund-auth):

El boton "Login de Desarrollo" solo aparece en modo dev (`isDevMode() === true`). Los emails de prueba reconocidos por el sistema son:

```
usuario.administrador@esap.edu.co   → rol: admin
usuario.gestor@esap.edu.co          → rol: gestor
usuario.directivo@esap.edu.co       → rol: directivo
usuario.usuario@esap.edu.co         → rol: usuario
```

**Opcion B — Login LDAP:**

Usar credenciales de Active Directory de ESAP (formato `usuario.apellido` y contrasena AD).

---

## 5. Arquitectura de la Aplicacion

### 5.1 Estructura de directorios

```
rund-mgp/
├── src/
│   ├── main.ts                    # Bootstrap del cliente Angular
│   ├── main.server.ts             # Bootstrap del servidor Angular SSR
│   ├── server.ts                  # Servidor Express para SSR
│   ├── index.html                 # Shell HTML raiz
│   ├── styles.scss                # Estilos globales
│   └── app/
│       ├── app.ts                 # Componente raiz
│       ├── app.html               # Template raiz (router-outlet)
│       ├── app.scss               # Estilos del componente raiz
│       ├── app.config.ts          # Configuracion de la aplicacion (providers)
│       ├── app.config.server.ts   # Configuracion adicional para SSR
│       ├── app.routes.ts          # Definicion de rutas del cliente
│       ├── app.routes.server.ts   # Configuracion de RenderMode por ruta
│       │
│       ├── vistas/                # Paginas/vistas principales (lazy-loaded)
│       │   ├── dashboard/         # Panel de estadisticas
│       │   ├── listados/          # Gestion de listados docentes
│       │   ├── gestion/           # Gestion de documentos (admin)
│       │   │   ├── carga/         # Subida de documentos
│       │   │   └── edicion/       # Edicion de documentos
│       │   │       ├── adicion/
│       │   │       ├── borra-documentos/
│       │   │       ├── download-preview/
│       │   │       └── reemplazo/
│       │   ├── certificados/      # Generacion de certificados
│       │   ├── consultas/         # Consultas cruzadas
│       │   ├── validacion/        # Validacion publica de certificados
│       │   └── herramientas/      # Herramientas admin
│       │
│       └── compartidos/           # Codigo compartido entre vistas
│           ├── componentes/       # Componentes reutilizables
│           │   ├── header/        # Encabezado con usuario y menu
│           │   ├── menu/          # Menu lateral de navegacion
│           │   ├── login/         # Formulario de autenticacion
│           │   ├── acceso-denegado/   # Pagina de acceso denegado
│           │   ├── documentos/    # Previsualizacion y vista de datos
│           │   │   ├── preview/
│           │   │   └── vista-datos/
│           │   ├── carga-documento/   # Componente de carga de archivos
│           │   ├── chart/         # Componente de graficos Chart.js
│           │   ├── ficha-docente/ # Ficha de informacion del docente
│           │   ├── firma-certificado/ # Firma digital en certificados
│           │   ├── admin-firmas/  # Administracion de firmas
│           │   │   ├── add-firma/
│           │   │   ├── edita-firma/
│           │   │   └── procesa-firma/
│           │   ├── extrae-datos/  # Disparador de extraccion AI
│           │   └── vista-excel/   # Visualizacion de Excel
│           │
│           ├── guards/
│           │   └── auth-guard.ts  # authGuard + adminGuard
│           ├── interceptores/
│           │   └── auth-interceptor.ts  # Interceptor HTTP (401/403)
│           ├── modulos/
│           │   ├── primeng/       # NgModule con todos los componentes PrimeNG
│           │   ├── pipes/         # NgModule de pipes
│           │   └── icons/         # NgModule de iconos FontAwesome
│           ├── pipes/
│           │   └── safe-pipe.ts   # Pipe de sanitizacion segura
│           ├── librerias/
│           │   └── textos.ts      # Textos y constantes
│           └── servicios/
│               ├── auth.ts            # Servicio de autenticacion (Signals)
│               ├── config.service.ts  # Configuracion dinamica al arranque
│               ├── api-config.ts      # Todos los endpoints API v2
│               ├── data.ts            # Servicio de datos principal (fachada)
│               ├── data-types.ts      # Interfaces y tipos TypeScript
│               ├── categoria.service.ts   # Gestion de categorias y arbol
│               ├── menu.service.ts    # Definicion del menu de navegacion
│               ├── file.ts            # Descarga y manejo de archivos
│               ├── firmas.ts          # Gestion de firmas digitales
│               ├── imagen.ts          # Procesamiento de imagenes
│               ├── excel.ts           # Generacion de archivos Excel
│               └── logger.service.ts  # Logger (suprime logs en produccion)
│
├── public/                        # Activos estaticos (imagenes, fuentes, favicon)
├── scripts/
│   └── patch-ssr.js               # Parche automatico para bug de @angular/ssr@21.x
├── .github/
│   └── workflows/
│       ├── test.yml               # CI: lint + tests + cobertura
│       └── security.yml           # CI: npm audit de dependencias de produccion
├── Dockerfile                     # Build multi-stage (builder + runtime)
├── start.sh                       # Script de inicio del contenedor
├── karma.conf.js                  # Configuracion de Karma y umbrales de cobertura
├── angular.json                   # Configuracion del proyecto Angular CLI
├── tsconfig.json                  # Configuracion TypeScript base
├── tsconfig.app.json              # Configuracion TypeScript para la app
├── tsconfig.spec.json             # Configuracion TypeScript para tests
├── eslint.config.js               # Configuracion ESLint + angular-eslint
└── package.json                   # Dependencias y scripts
```

### 5.2 Flujo de una peticion SSR

```
Navegador
    |
    v
Express (server.ts, puerto 4000)
    |
    |-- GET /api/config  -->  Lee process.env.API_BASE_URL
    |                         Responde: {"apiBaseUrl": "http://rund-api:3000"}
    |
    |-- GET /<ruta>  -->  AngularNodeAppEngine.handle(req)
    |                      Renderiza la ruta en servidor (SSR)
    |                      Sirve HTML completo al navegador
    |
    +-- GET /assets/*  -->  express.static (cache 1 año)
```

### 5.3 SSR — Modos de renderizado por ruta

Configurado en `src/app/app.routes.server.ts`:

| Ruta | RenderMode | Razon |
|------|-----------|-------|
| `/login` | `Prerender` | Publica, SEO, cacheable |
| `/validacion` | `Prerender` | Publica, acceso sin auth |
| `/acceso-denegado` | `Prerender` | Publica, cacheable |
| `/listados` | `Server` | Datos personalizados por usuario |
| `/certificados` | `Server` | Datos personalizados por usuario |
| `/dashboard` | `Server` | Datos personalizados por usuario |
| `/consultas` | `Server` | Datos personalizados por usuario |
| `/gestion` | `Server` | Solo admin, datos en tiempo real |
| `/herramientas` | `Server` | Solo admin, datos en tiempo real |
| `/**` | `Client` | Catch-all |

### 5.4 Cabeceras de seguridad HTTP

El servidor Express define las siguientes cabeceras en cada respuesta:

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'unsafe-inline' blob:;
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src     'self' data: blob:;
  font-src    'self' data: https://fonts.gstatic.com;
  connect-src 'self' <API_BASE_URL>;
  worker-src  blob:;
  frame-src   'self' blob:;

X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
```

La directiva `script-src 'unsafe-inline'` es necesaria como mitigacion para el editor Quill (CVE GHSA-v3m3-f69x-jf25, sin fix disponible en npm). `worker-src blob:` es requerido por el web worker de PDF.js.

### 5.5 Configuracion dinamica al arranque

`ConfigService` se inicializa mediante `APP_INITIALIZER` **antes** de que la aplicacion arranque. Realiza un `GET /api/config` al servidor Express para obtener `apiBaseUrl`. Todos los demas servicios que necesitan la URL de la API deben inyectar `ConfigService`.

```typescript
// En app.config.ts:
{
  provide: APP_INITIALIZER,
  useFactory: (configService: ConfigService) => () => configService.loadConfig(),
  deps: [ConfigService],
  multi: true
}
```

Si `/api/config` falla, se usa el fallback `http://localhost:3000`.

---

## 6. Rutas y Modulos de la Aplicacion

### Mapa de rutas

| Ruta | Guard | Descripcion |
|------|-------|-------------|
| `/` | — | Redirige a `/listados` |
| `/login` | — | Formulario de autenticacion LDAP |
| `/validacion` | — | Verificacion publica de certificados por ID |
| `/acceso-denegado` | — | Pagina de acceso denegado |
| `/listados` | `authGuard` | Gestion de listados docentes |
| `/certificados` | `authGuard` | Generacion de certificados |
| `/dashboard` | `authGuard` | Panel de estadisticas y graficos |
| `/consultas` | `authGuard` | Consultas cruzadas de datos |
| `/gestion` | `adminGuard` | Gestion de documentos (solo admin) |
| `/herramientas` | `adminGuard` | Herramientas administrativas (solo admin) |
| `/**` | — | Redirige a `/listados` |

Todas las rutas usan **lazy loading** con `loadComponent()`, generando 14+ chunks separados en el build de produccion para reducir el bundle inicial.

### Sistema de roles

```
admin      → Acceso total a todas las rutas
gestor     → authGuard: listados, certificados, dashboard, consultas, gestion, herramientas
directivo  → authGuard: dashboard, consultas
usuario    → Solo /validacion (publica, sin autenticacion)
```

La jerarquia de privilegios es: `admin > gestor > directivo > usuario`.

`adminGuard` en las rutas `/gestion` y `/herramientas` requiere explicitamente el rol `admin`.

### Menu de navegacion lateral

El menu se construye dinamicamente por `MenuService` con iconos FontAwesome o PrimeNG:

| Item | Ruta | Rol minimo requerido |
|------|------|---------------------|
| Panel de control | `/dashboard` | directivo |
| Consultas | `/consultas` | directivo |
| Listados | `/listados` | gestor |
| Gestion | `/gestion` | gestor |
| Certificados | `/certificados` | gestor |
| Herramientas | `/herramientas` | gestor |
| Validacion | `/validacion` | usuario |

---

## 7. Sistema de Autenticacion

La autenticacion usa **cookies httpOnly** (sin tokens en localStorage). El flujo completo es:

```
rund-mgp (Angular 21)
    | POST /api/v2/auth/login {username, password}
    v
rund-api (PHP BFF)
    | POST /ldap/login
    v
rund-auth (Node.js)
    | Valida contra LDAP de ESAP (Active Directory)
    | Genera JWT RS256 + sesion Redis (8 horas)
    v
rund-api
    | Guarda JWT en $_SESSION PHP
    | Responde {success, user, session_id}
    v
rund-mgp
    | AuthService actualiza signal `usuario`
    | Router navega a returnUrl o '/'
```

### AuthService — Signals reactivos

El servicio `Auth` (`src/app/compartidos/servicios/auth.ts`) usa Angular Signals:

```typescript
// Signals de solo lectura expuestos al template
usuario:         Signal<Usuario | null | undefined>  // undefined = estado inicial
cargando:        Signal<boolean>
error:           Signal<string | null>

// Computed signals
estaAutenticado: Signal<boolean>   // true cuando usuario !== null && !== undefined
esAdmin:         Signal<boolean>   // true cuando rol === 'admin'

// Metodos principales
login(username: string, password: string): Observable<LoginResponse>
logout(): Observable<LogoutResponse>
verificarSesion(): Observable<SessionResponse>
refrescarJWT(): Observable<any>            // llamado automaticamente por verificarSesion
devLogin(email: string): Observable<LoginResponse>   // solo isDevMode()
tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean
```

### AuthInterceptor

Aplicado globalmente en `app.config.ts` a traves de `withInterceptors([authInterceptor])`. Para todas las peticiones a `/api/` o `localhost:3000`:

- Clona la peticion con `withCredentials: true` (envia cookies)
- HTTP 401 capturado → logout + redirect a `/login?returnUrl=<url-actual>`
- HTTP 403 capturado → redirect a `/acceso-denegado`
- HTTP 0 (sin red/CORS) → log de error via `LoggerService`

### Guards de rutas

```typescript
// authGuard: para cualquier usuario autenticado
// 1. Si el signal `usuario` ya tiene valor → retorna true inmediatamente (sin red)
// 2. Si no → llama verificarSesion() al servidor
// 3. Si falla → navega a /login?returnUrl=<ruta-intentada>

// adminGuard: solo rol 'admin'
// 1. Si no autenticado → llama verificarSesion()
// 2. Si autenticado pero no admin → navega a /acceso-denegado
// 3. Si es admin → retorna true
```

### Endpoints de autenticacion (API v2)

| Metodo | Endpoint | Descripcion |
|--------|---------|-------------|
| `POST` | `/api/v2/auth/login` | Login con credenciales LDAP |
| `POST` | `/api/v2/auth/logout` | Logout y destruccion de sesion |
| `GET` | `/api/v2/auth/session` | Verificar sesion activa |
| `POST` | `/api/v2/auth/refresh` | Refrescar JWT interno |
| `POST` | `/api/v2/auth/dev/login` | Login de desarrollo (solo DEV) |

### Flujo de proteccion de rutas

```
Usuario navega a /gestion
    |
    v
adminGuard se ejecuta
    |
    |-- estaAutenticado() === true? --> Verificar esAdmin()
    |                                       |-- esAdmin() === true? --> Accede a /gestion
    |                                       +-- No es admin? --> Redirige a /acceso-denegado
    |
    +-- No autenticado? --> verificarSesion() al servidor
                                |-- Sesion valida? --> Verificar esAdmin()
                                +-- Sin sesion? --> Redirige a /login?returnUrl=/gestion
```

---

## 8. Servicios Principales

### ConfigService (`config.service.ts`)

Cargado por `APP_INITIALIZER` antes del arranque de la aplicacion. Lee `/api/config` del servidor Express para obtener `apiBaseUrl` de forma dinamica. Esto permite que la misma imagen Docker funcione en diferentes entornos solo cambiando `API_BASE_URL`.

```typescript
// Inyectar en cualquier servicio que necesite la URL base:
private configService = inject(ConfigService);
const baseUrl = this.configService.getApiBaseUrl();
```

### Data (`data.ts`) — Fachada de datos

Servicio central que actua como fachada sobre `CategoriaService` y `MenuService`. Expone todos los metodos de acceso a datos. Usa `forkJoin` para inicializacion paralela de labels y categorias. Delega al `CategoriaService` el almacenamiento del arbol de categorias y a `MenuService` la construccion del menu.

### CategoriaService (`categoria.service.ts`)

Gestiona el arbol de categorias documentales (estructura de OpenKM), los labels de visualizacion y las estadisticas de documentos por nodo del arbol.

### MenuService (`menu.service.ts`)

Construye de forma lazy la lista de elementos del menu con sus iconos FontAwesome/PrimeNG y roles requeridos. La lista se construye la primera vez que se solicita y se cachea.

### LoggerService (`logger.service.ts`)

Wrapper de consola que suprime `log()` y `warn()` en produccion (`isDevMode() === false`). Solo `error()` se muestra siempre. Siempre inyectar este servicio en lugar de usar `console` directamente.

```typescript
private logger = inject(LoggerService);

this.logger.log('Solo visible en desarrollo');
this.logger.warn('Solo visible en desarrollo');
this.logger.error('Siempre visible — dev y prod');
```

### SafePipe (`pipes/safe-pipe.ts`)

Pipe de sanitizacion que permite cuatro tipos de bypass de la sanitizacion de Angular. Cualquier otro tipo lanza un `Error`:

```html
{{ valor | safe:'html' }}
{{ valor | safe:'url' }}
{{ valor | safe:'resourceUrl' }}
{{ valor | safe:'style' }}
```

`bypassSecurityTrustScript` fue eliminado intencionalmente (mejora de seguridad S-04).

### API Endpoints — `api-config.ts`

Todos los endpoints estan centralizados en la constante `API_ENDPOINTS`. Para obtener la URL completa de un endpoint:

```typescript
import { getEndpointUrl } from '@servicios/api-config';

const url = getEndpointUrl('login', this.configService.getApiBaseUrl());
// Resultado: "http://rund-api:3000/api/v2/auth/login"
```

Grupos de endpoints disponibles:

| Grupo | Claves |
|-------|--------|
| Sistema | `info`, `health`, `capabilities`, `migration`, `docs` |
| Categorias | `categorias`, `cruce` |
| Profesores | `infoProfesor` |
| Archivos | `datos`, `imagen`, `deleteFile`, `getFile`, `actualizaArchivo`, `tempCleanup`, `papelera`, `archivosSubir`, `postFile` |
| Certificados | `certificadoInfo`, `certificadoGenerar` |
| Documentos | `consultaFile`, `documentosGenerar` |
| Listados | `csvData`, `loadList`, `indice`, `listadosDatos` |
| Firmas | `firmas`, `firmaSubir` |
| Autenticacion | `login`, `logout`, `session`, `refresh`, `devLogin` |
| AI | `extraeDatos` |

---

## 9. Variables de Entorno

rund-mgp no usa un archivo `.env`. La unica variable que lee directamente es procesada por el servidor Express en `server.ts`:

### Variables del servidor Express (runtime)

| Variable | Descripcion | Valor por defecto |
|----------|-------------|------------------|
| `API_BASE_URL` | URL de rund-api **accesible desde el navegador del usuario** | `http://localhost:3000` |
| `PORT` | Puerto en el que escucha el servidor Express | `4000` |
| `NODE_ENV` | Entorno de ejecucion | `production` (en Docker) |
| `TZ` | Zona horaria del servidor | — (opcional) |

### Como configura el frontend la URL de la API

El servidor Express expone `/api/config` que retorna `{ apiBaseUrl: process.env.API_BASE_URL }`. Al arrancar, `ConfigService` (via `APP_INITIALIZER`) consulta este endpoint y distribuye `apiBaseUrl` a todos los servicios que lo necesitan.

Este mecanismo permite usar la misma imagen Docker en distintos entornos:

```bash
# Desarrollo local
docker run -e API_BASE_URL=http://localhost:3000 -p 4000:4000 rund-mgp

# UAT
docker run -e API_BASE_URL=http://rund-api-uat:3000 -p 4000:4000 rund-mgp

# Produccion
docker run -e API_BASE_URL=https://rund.esap.edu.co -p 4000:4000 rund-mgp
```

`API_BASE_URL` debe ser la URL que el **navegador del usuario final** pueda resolver. No usar nombres internos de Docker como `http://rund-api:3000` porque los navegadores no resuelven nombres de contenedores.

---

## 10. Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Servidor de desarrollo Angular en `:4200` (`ng serve --no-hmr`) |
| `npm run build` | Build de produccion con SSR (output: `dist/rund-mgp/`) |
| `npm run watch` | Build de desarrollo con reconstruccion automatica |
| `npm run serve:ssr:rund-mgp` | Sirve el build SSR compilado localmente |
| `npm test` | Tests en modo watch con Karma y reporte HTML interactivo |
| `npm run test:ci` | Tests en ChromeHeadless con cobertura (para CI/CD) |
| `npm run test:coverage` | Tests con cobertura, sin modo watch |
| `npm run lint` | Linting con ESLint + angular-eslint |
| `npm run lint:fix` | Linting con correccion automatica |

### Build de produccion — output

```bash
npm run build
# Output en dist/rund-mgp/
```

```
dist/rund-mgp/
├── browser/            # Bundle cliente (14+ chunks lazy)
│   ├── index.html
│   ├── main-[hash].js
│   ├── chunk-[hash].js (14+ archivos de rutas lazy)
│   └── pdf.js/         # PDF.js worker
└── server/
    └── server.mjs      # Servidor Express SSR
```

Configuracion de presupuestos en `angular.json`:

| Tipo | Warning | Error |
|------|---------|-------|
| Bundle inicial | 2 MB | 2.5 MB |
| Estilos por componente | 10 kB | 20 kB |

### Servir el SSR compilado localmente

Para probar el servidor SSR de produccion de forma local (sin Docker):

```bash
npm run build
npm run serve:ssr:rund-mgp
# Acceder en http://localhost:4000
```

---

## 11. Testing

### Ejecutar los tests

```bash
# Tests con watch (desarrollo diario)
npm test

# Tests en CI — ChromeHeadless, sin watch, con cobertura
npm run test:ci

# Tests con cobertura, sin watch interactivo
npm run test:coverage
```

El reporte de cobertura HTML se genera en `coverage/rund-mgp/index.html`. El reporte LCOV se genera en `coverage/rund-mgp/lcov.info` para integracion con herramientas externas.

### Umbrales de cobertura configurados

Definidos en `karma.conf.js`. El build de tests falla si no se alcanzan:

| Metrica | Umbral minimo |
|---------|---------------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

### Cobertura actual (post Sprint 1-3, 2026-02-26)

| Metrica | Resultado | Umbral |
|---------|-----------|--------|
| Statements | **97.28%** | 70% |
| Branches | **91.25%** | 60% |
| Functions | **98.21%** | 70% |
| Lines | **97.59%** | 70% |
| Tests totales | **79** | — |

### Cobertura por archivo critico

| Archivo | Statements | Branches | Objetivo |
|---------|-----------|----------|---------|
| `auth.ts` | 98.9% | 95% | ≥85% |
| `config.service.ts` | 100% | 100% | ≥90% |
| `auth-guard.ts` | 96.15% | 90.9% | ≥90% |

### Localizacion de los archivos de test

Los tests estan coubicados con los archivos fuente en archivos `.spec.ts`:

```
src/app/compartidos/
├── guards/
│   └── auth-guard.spec.ts         # authGuard + adminGuard
├── interceptores/
│   └── auth-interceptor.spec.ts   # withCredentials, 401, 403
├── pipes/
│   └── safe-pipe.spec.ts          # 5 tipos de bypass + tipo invalido
└── servicios/
    ├── auth.spec.ts               # 33 tests: login, logout, sesion, signals
    ├── config.service.spec.ts     # carga exitosa, fallback, idempotencia
    ├── categoria.service.spec.ts  # 10 casos
    └── menu.service.spec.ts       # 7 casos
```

### Archivos excluidos de cobertura

Configurado en `angular.json` (`codeCoverageExclude`):

- `src/app/compartidos/modulos/**` — NgModules de configuracion sin logica propia
- `src/app/compartidos/librerias/**` — Constantes
- `src/main.ts`, `src/main.server.ts`, `src/server.ts` — Bootstrapping

### Ejemplo de test (AuthService)

```typescript
describe('Auth - login()', () => {
  it('actualiza el signal de usuario tras login exitoso', () => {
    const mockResponse: LoginResponse = {
      success: true,
      user: { sub: '123', name: 'Test', email: 'test@esap.edu.co', tid: 't1' },
      session_id: 'abc'
    };
    httpMock.expectOne(loginUrl).flush(mockResponse);
    expect(authService.estaAutenticado()).toBeTrue();
    expect(authService.usuario()?.email).toBe('test@esap.edu.co');
  });
});
```

---

## 12. CI/CD — GitHub Actions

El repositorio tiene dos workflows en `.github/workflows/`:

### test.yml — Tests y Linting

Se dispara en cada `push` y `pull_request` a `main`.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node.js 22
      - npm ci --legacy-peer-deps --no-audit   # --no-audit evita falsos positivos
      - npm run lint                            # Falla si hay errores ESLint
      - npm run test:ci                         # Falla si tests fallan o cobertura < umbral
      - Upload coverage (artefacto GitHub)
```

### security.yml — Auditoria de Seguridad

Se dispara en cada `push` y `pull_request` a `main`.

```yaml
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node.js 20
      - npm ci
      - npm audit --audit-level=high --omit=dev   # Falla si hay HIGH/CRITICAL en prod
```

Las dependencias de desarrollo (Karma, Jasmine, ESLint, TypeScript) se excluyen con `--omit=dev`. Las 5 vulnerabilidades restantes de Quill XSS no tienen fix disponible en npm y estan mitigadas con la CSP configurada en `server.ts`.

---

## 13. Despliegue con Docker

### Build de la imagen

```bash
cd rund-mgp
docker build -t rund-mgp:latest .
```

El Dockerfile usa un build multi-stage:

**Etapa 1 — builder** (`node:22-alpine`):
1. Instala dependencias del sistema (git, python3, make, g++ para modulos nativos)
2. `npm ci` — instala todas las dependencias
3. `npm run build` — compila Angular con SSR
4. Output en `/app/dist/rund-mgp/`

**Etapa 2 — runtime** (`node:22-alpine`):
1. Solo instala `curl` (para health check)
2. Crea usuario no-root `angular:nodejs` (UID/GID 1001)
3. Copia solo `dist/rund-mgp/` y `start.sh` desde la etapa builder
4. Ejecuta como usuario no-root
5. Expone el puerto 4000

### Ejecutar el contenedor

```bash
docker run -d \
  --name rund-mgp \
  -p 4000:4000 \
  -e API_BASE_URL=http://rund-api:3000 \
  -e NODE_ENV=production \
  -e TZ=America/Bogota \
  rund-mgp:latest
```

### Health check

El Dockerfile incluye un health check automatico cada 30 segundos:

```
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3
  CMD curl -f http://localhost:4000/health || curl -f http://localhost:4000/ || exit 1
```

Verificar manualmente:

```bash
# Verificar que responde
curl -I http://localhost:4000/

# Verificar que /api/config esta funcionando
curl http://localhost:4000/api/config
# Respuesta esperada: {"apiBaseUrl":"http://..."}

# Estado del health check del contenedor
docker inspect rund-mgp --format='{{.State.Health.Status}}'
```

### Script de inicio (`start.sh`)

El contenedor ejecuta `start.sh` como entrypoint:

```sh
cd /app/dist/rund-mgp
# Verifica que server.mjs existe
exec node server/server.mjs
```

---

## 14. Despliegue en el Stack RUND Completo

En el stack completo, rund-mgp se integra junto con todos los demas servicios via Docker Compose en el directorio raiz `rund-deployment/`.

```bash
# Desde el directorio rund-deployment/

# Levantar el stack completo
docker compose up -d

# Ver estado de todos los servicios
docker compose ps

# Ver logs de rund-mgp
docker compose logs -f rund-mgp

# Reiniciar solo rund-mgp
docker compose restart rund-mgp

# Reconstruir rund-mgp tras cambios de codigo
docker compose up -d --build rund-mgp

# Detener todo el stack
docker compose down
```

### Variables recomendadas en docker-compose.yml

```yaml
rund-mgp:
  build: ./rund-mgp
  ports:
    - "4000:4000"
  environment:
    - API_BASE_URL=http://localhost:3000   # URL accesible desde el navegador del usuario
    - NODE_ENV=production
    - TZ=America/Bogota
    - PORT=4000
  depends_on:
    - rund-api
  networks:
    - rund-network
```

### Produccion

Para produccion, asegurar ademas:

1. `API_BASE_URL` apunta a la URL HTTPS publica de rund-api (ejemplo: `https://rund.esap.edu.co`)
2. El servidor sirve detras de un proxy inverso (Nginx) con certificado TLS valido
3. `COOKIE_SECURE=true` configurado en rund-auth para cookies seguras
4. El boton "Login de Desarrollo" no apareece (controlado automaticamente por `isDevMode()`)

```bash
# Produccion con archivo separado
docker compose -f docker-compose.prod.yml pull rund-mgp
docker compose -f docker-compose.prod.yml up -d rund-mgp
```

---

## 15. Estado del Proyecto y Plan de Mejoras

### Puntuacion de calidad (2026-02-26)

El proyecto paso de **4.65/10** a una puntuacion estimada de **≥8.5/10** tras completar 26 de 27 items de mejora en tres sprints (febrero 2026).

| Dimension | Antes | Despues |
|-----------|-------|---------|
| Seguridad | 3.5/10 | 8.5/10 |
| Dependencias | 4.0/10 | 9.0/10 |
| Optimizacion | 5.0/10 | 8.0/10 |
| Funcionalidad | 6.0/10 | 8.5/10 |
| Usabilidad | 6.0/10 | 8.0/10 |
| **Global** | **4.65/10** | **≥8.5/10** |

### Sprint 1 — Seguridad y Correcciones Criticas (completado)

| Item | Estado | Resultado |
|------|--------|-----------|
| Crear componente `/acceso-denegado` | Completado | Componente funcional con boton de retorno |
| Aplicar `authGuard` y `adminGuard` en rutas | Completado | Todas las rutas protegidas |
| Actualizar Angular a ≥20.3.16 | Completado | Actualizado a **21.1.5** |
| Refactorizar `SafePipe` (eliminar bypassScript) | Completado | Script bypass eliminado |
| Condicionar `loginDev()` al entorno | Completado | Oculto en produccion via `isDevMode()` |
| CSP para Quill XSS | Completado | CSP estricta en `server.ts` |
| Lazy loading para 7 rutas | Completado | **14+ chunks** generados |
| RenderMode SSR por ruta | Completado | Prerender/Server/Client configurados |

### Sprint 2 — Testing y Estabilidad (completado)

| Item | Estado | Resultado |
|------|--------|-----------|
| Suite de tests para `Auth` | Completado | 33 tests, cobertura 98.9% |
| Tests para `ConfigService` | Completado | Cobertura 100% |
| Tests para `authGuard`/`adminGuard` | Completado | Cobertura 96.15% |
| npm audit en CI/CD | Completado | `security.yml` workflow activo |
| Refactorizar `data.ts` con `forkJoin` | Completado | Sin subscribes anidados |
| Proteccion SSR con `isPlatformBrowser` | Completado | Sin errores SSR en charts |
| Eliminar `detectChanges()` redundantes | Completado | 60 llamadas eliminadas en 20 archivos |

### Sprint 3 — Refactorizacion y Calidad Avanzada (completado)

| Item | Estado | Resultado |
|------|--------|-----------|
| Tests para `authInterceptor` | Completado | withCredentials, 401, 403 cubiertos |
| Tests para `SafePipe` | Completado | 5 tipos + tipo invalido |
| Meta cobertura ≥70% | Completado | **97.28% statements** |
| Extraer `CategoriaService` y `MenuService` | Completado | `data.ts`: 519 → **300 lineas** |
| ESLint + angular-eslint configurados | Completado | `ng lint`: 0 errores, 0 warnings |
| `LoggerService` sustituyendo console.log | Completado | Suprimido en produccion |

### Item pendiente (bloqueado por backend)

**S-06: Mejorar determinacion de roles** — El metodo `determinarRol()` en `auth.ts` (lineas 270-298) infiere roles por patrones de email para entornos de prueba. Esta bloqueado hasta que rund-auth incluya el claim `rol` en el JWT firmado.

Cuando rund-auth implemente el claim, simplificar `determinarRol()` a:

```typescript
private determinarRol(user: Usuario): Rol {
  if (user.rol) return user.rol;
  if (user.roles?.length > 0) return user.roles[0];
  return 'usuario';
}
```

### Metricas de build de produccion

| Metrica | Resultado |
|---------|-----------|
| Lazy chunks generados | **14+** |
| Build SSR exitoso | Si |
| `ng lint` errores | **0** |
| `data.ts` lineas | **300** |
| Tests totales | **79** |

### Documentacion interna adicional

| Documento | Ubicacion | Contenido |
|-----------|-----------|-----------|
| Plan de mejoras | `docs/mejoras-2026-03/plan-mejoras-rund-mgp.md` | 27 items, roadmap por sprints, esfuerzo |
| Resultado del plan | `docs/mejoras-2026-03/resultado-plan-de-mejoras.md` | Estado final, metricas, incidencias tecnicas |
| Integracion auth | `docs/INTEGRACION_AUTH.md` | Flujos de autenticacion, componentes, testing |
| Configuracion dinamica | `docs/CONFIGURACION_DINAMICA.md` | ConfigService, variables de entorno |
| Migracion de roles | `docs/MIGRACION_ROLES.md` | Plan de migracion del sistema de roles |

---

## 16. Solucion de Problemas

### Error: "this.manifest.allowedHosts is not iterable" durante el build

Causado por un bug en `@angular/ssr@21.x`. El parche `scripts/patch-ssr.js` se ejecuta automaticamente como `postinstall`. Si el error persiste, ejecutar manualmente:

```bash
node scripts/patch-ssr.js
npm run build
```

El parche agrega una comprobacion nullish `?? []` a `this.manifest.allowedHosts` en `@angular/ssr/fesm2022/ssr.mjs`.

### Error al instalar dependencias (peer deps conflict)

```bash
npm install --legacy-peer-deps
```

El flag es necesario por `@angular/cdk@21` y modulos de PrimeNG que aun no declaran compatibilidad formal con Angular 21 en sus `peerDependencies`.

### Error de CORS en desarrollo local

Si el navegador reporta CORS al hacer peticiones a rund-api desde el servidor de desarrollo (`:4200`), verificar que rund-api tiene habilitado `http://localhost:4200` en sus origenes CORS permitidos. El servidor de produccion SSR (`:4000`) tambien debe estar en la lista.

### Los tests fallan con "No binary for ChromeHeadless browser"

Karma requiere Chrome o Chromium instalado:

```bash
# macOS
brew install --cask google-chrome

# Ubuntu/Debian
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
apt-get install -y google-chrome-stable

# En CI (GitHub Actions) Chrome ya esta disponible en ubuntu-latest
```

### Error "Session not found" al navegar

La sesion de rund-api expiro (8 horas de inactividad) o Redis fue reiniciado. El interceptor HTTP capturara el 401 automaticamente y redirigira a `/login`.

```bash
# Verificar que Redis esta corriendo
docker compose ps redis
docker compose logs --tail=50 redis
```

### El servidor SSR no encuentra server.mjs

```bash
# Verificar que el build se completo correctamente
ls -la dist/rund-mgp/server/server.mjs

# Si no existe, reconstruir
npm run build
```

### Los logs informativos no aparecen en produccion

`LoggerService.log()` y `LoggerService.warn()` estan suprimidos en produccion. Solo `LoggerService.error()` aparece siempre. Este comportamiento es intencional para no exponer informacion del servidor.

Para debugging puntual en produccion:

```bash
# Acceder al contenedor
docker exec -it rund-mgp sh

# Ver los logs del proceso Node
docker logs rund-mgp
```

### npm audit reporta vulnerabilidades de Quill

Las 5 vulnerabilidades de Quill (GHSA-v3m3-f69x-jf25 y derivadas) no tienen fix disponible en npm sin cambiar la libreria de editor. Estan mitigadas por la CSP configurada en `server.ts` con la directiva `script-src 'unsafe-inline'`. El workflow `security.yml` usa `--omit=dev` para excluirlas del audit de CI ya que Quill se considera una dependencia de presentacion.

Si se evalua migrar el editor de texto enriquecido en el futuro, el candidato recomendado es [TipTap](https://tiptap.dev/) (usa ProseMirror internamente, sin las vulnerabilidades conocidas de Quill).

---

**Proyecto:** RUND — Registro Unico Nacional Docente
**Organizacion:** ESAP — Escuela Superior de Administracion Publica, Colombia
**Ultima actualizacion:** 26 de febrero de 2026
**Version:** 2.0.0
