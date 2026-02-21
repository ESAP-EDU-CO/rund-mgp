# Informe de Calidad de Software — rund-mgp

---

| Campo               | Valor                                                                |
|---------------------|----------------------------------------------------------------------|
| **Proyecto**        | rund-mgp — Frontend Angular del sistema RUND                        |
| **Organización**    | ESAP (Escuela Superior de Administración Pública) — Colombia        |
| **Versión app**     | 2.0.0                                                                |
| **Framework**       | Angular 20.3.15 con SSR (Server-Side Rendering)                     |
| **Fecha análisis**  | 20 de febrero de 2026                                                |
| **Versión informe** | 1.0                                                                  |
| **Elaborado por**   | Análisis automatizado — Equipo de desarrollo RUND                   |
| **Clasificación**   | Uso interno — Equipo de desarrollo RUND                             |

---

## Resumen Ejecutivo

Este informe presenta los resultados de la auditoría de calidad del módulo `rund-mgp`, la interfaz de usuario del sistema RUND (Registro Único Nacional Docente). El análisis cubre cinco dimensiones: seguridad, estado de dependencias, rendimiento y optimización, funcionalidad, y calidad de código y usabilidad.

### Puntuación Global: **4.65 / 10**

El proyecto demuestra una adopción técnica sólida de Angular moderno (Signals, zoneless change detection, SSR, API v2 migrada), pero presenta deficiencias críticas en seguridad (guards no aplicados, vulnerabilidades XSS conocidas), cobertura de pruebas nula, y oportunidades importantes de optimización de rendimiento.

### Hallazgos Críticos

| Prioridad | Hallazgo | Área |
|-----------|----------|------|
| 🔴 CRÍTICO | Guards de autenticación definidos pero **no aplicados** en rutas | Seguridad |
| 🔴 CRÍTICO | Vulnerabilidad XSS en Angular 20.3.15 (GHSA-jrmj-c5cx-3cw6) | Seguridad |
| 🔴 ALTO    | 49 vulnerabilidades npm (41 altas, 7 moderadas, 1 baja) | Dependencias |
| 🔴 ALTO    | `SafePipe` bypass total de sanitización sin validación de origen | Seguridad |
| 🔴 ALTO    | Quill 2.0.3 con vulnerabilidad XSS (GHSA-v3m3-f69x-jf25) | Seguridad |
| 🟠 ALTO    | Cero cobertura de pruebas unitarias (0 archivos `.spec.ts`) | Calidad |
| 🟠 MEDIO   | Código de desarrollo (`loginDev`) sin desactivar en producción | Seguridad |
| 🟠 MEDIO   | Sin lazy loading — todas las rutas cargan de forma eager | Rendimiento |
| 🟠 MEDIO   | `RenderMode.Prerender` para rutas que requieren autenticación | Funcionalidad |
| 🟡 BAJO    | Doble gestor de paquetes (npm + yarn.lock inconsistentes) | Mantenibilidad |

---

## 1. Seguridad

### Puntuación: **3.5 / 10**

### 1.1 Hallazgos Clasificados por Severidad

#### 🔴 Crítico

**Guards de autenticación no aplicados en rutas**

El archivo `src/app/app.routes.ts` define todas las rutas de la aplicación **sin el atributo `canActivate`**. Los guards `authGuard` y `adminGuard` existen y están correctamente implementados en `auth-guard.ts`, pero nunca son invocados por el router.

```typescript
// Estado actual — INSEGURO:
{ path: 'gestion',   component: Gestion },
{ path: 'listados',  component: Listados },
// etc.

// Estado requerido:
{ path: 'gestion',   component: Gestion,   canActivate: [authGuard] },
{ path: 'listados',  component: Listados,  canActivate: [authGuard] },
```

**Impacto:** Cualquier usuario no autenticado puede acceder directamente por URL a `/listados`, `/gestion`, `/certificados`, `/herramientas`, `/dashboard` y `/validacion`. El control de acceso actual depende solo del componente `App` que verifica el rol del usuario para mostrar/ocultar el menú, pero las rutas directas no están protegidas.

**Nota:** La vista `/validacion` (consulta pública de certificados) podría mantenerse pública intencionalmente; las demás deben protegerse.

---

**Vulnerabilidad XSS en Angular 20.3.15 (GHSA-jrmj-c5cx-3cw6)**

La versión actual `@angular/core@20.3.15` contiene una vulnerabilidad de Cross-Site Scripting (XSS) via atributos SVG sin sanitizar. La corrección está disponible en la versión `20.3.16`.

- **CVE/Advisory:** GHSA-jrmj-c5cx-3cw6
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **Paquetes afectados:** `@angular/core`, `@angular/compiler`, y todos los paquetes Angular `20.0.0-next.0` a `20.3.15`
- **Fix:** Actualizar a `>=20.3.16`

---

#### 🔴 Alto

**`SafePipe` — Bypass total de la sanitización Angular**

El pipe `src/app/compartidos/pipes/safe-pipe.ts` expone un mecanismo genérico para bypass de la sanitización de seguridad de Angular. Acepta cualquier valor de entrada sin validar su origen ni contenido:

```typescript
// Expone TODOS los tipos de bypass:
case 'html':        return this.sanitizer.bypassSecurityTrustHtml(value);
case 'style':       return this.sanitizer.bypassSecurityTrustStyle(value);
case 'script':      return this.sanitizer.bypassSecurityTrustScript(value);
case 'url':         return this.sanitizer.bypassSecurityTrustUrl(value);
case 'resourceUrl': return this.sanitizer.bypassSecurityTrustResourceUrl(value);
```

**Impacto:** Si algún valor controlado externamente (desde la API, desde el usuario, o desde un atacante MITM) llega a este pipe, puede ejecutarse como HTML/JavaScript arbitrario. El caso más riesgoso es `bypassSecurityTrustScript` que permite ejecución de código JavaScript.

**Uso identificado:** Se usa principalmente para `resourceUrl` en iframes de PDF. Recomendación: reemplazar por un pipe específico y tipado para cada caso de uso.

---

**Vulnerabilidad XSS en Quill 2.0.3 (GHSA-v3m3-f69x-jf25)**

El editor de texto enriquecido Quill versión 2.0.3 tiene una vulnerabilidad XSS a través de su funcionalidad de exportación HTML.

- **Advisory:** GHSA-v3m3-f69x-jf25
- **Fix disponible:** `quill@2.0.2` (regresión de breaking change) — Requiere evaluación de impacto

---

#### 🟠 Medio

**Código de desarrollo en producción (`loginDev`)**

El componente de login (`login.ts` y `login.html`) contiene un botón "Login de Desarrollo" visible siempre, sin verificación de entorno:

```typescript
// login.ts — loginDev() existe y no valida entorno
protected loginDev(): void {
  if (confirm('¿Usar login de desarrollo?')) {
    this.authService.devLogin('usuario.administrador@esap.edu.co').subscribe({ ... });
  }
}
```

```html
<!-- login.html — El botón siempre es visible -->
<p-button type="button" label="Login de Desarrollo" (onClick)="loginDev()" ... />
<!-- IMPORTANTE: Comentar o eliminar en producción — (comentario presente pero no accionado) -->
```

**Impacto:** En producción, un actor malicioso puede ver este botón. Si el servicio `rund-auth` tiene `DEV_FAKE_LOGIN=true` en el entorno de producción por error de configuración, el botón otorgaría acceso de administrador.

---

**Determinación de roles basada en contenido del email**

El servicio `Auth` asigna roles según si el email del usuario contiene cadenas específicas:

```typescript
// auth.ts — Lógica insegura para producción:
if (user.email.includes('usuario.administrador')) return 'admin';
if (user.email.includes('usuario.gestor')) return 'gestor';
```

Además, el computed signal `esAdmin` verifica:
```typescript
public readonly esAdmin = computed(() =>
  usuario?.rol === 'admin' ||
  usuario?.roles?.includes('admin') ||
  usuario?.email.includes('usuario.administrador') // ← Inseguro
);
```

**Impacto:** Si un atacante logra crear una cuenta LDAP con un email que contenga `usuario.administrador`, obtendría privilegios de administrador.

---

#### 🟡 Bajo

**Ruta `/acceso-denegado` no definida**

El guard `adminGuard` redirige a `/acceso-denegado` cuando el usuario no tiene permisos de administrador. Esta ruta no está definida en `app.routes.ts`, lo que resultaría en una redirección al wildcard `**` → `listados`.

**Analytics ID expuesto en repositorio**

`angular.json` contiene un ID de analytics de Angular CLI: `"analytics": "d6259a39-3767-43be-9013-372f9e5ac5aa"`. Este ID está comprometido al estar en el repositorio y debería eliminarse o moverse a variables de entorno.

**Config endpoint sin control de acceso**

`GET /api/config` en `server.ts` retorna la URL base de la API sin ningún control de acceso. Si bien solo devuelve una URL, expone información de infraestructura.

**Doble gestor de paquetes**

El repositorio tiene tanto `package-lock.json` como `yarn.lock`. Esto puede causar inconsistencias en la instalación de dependencias según el gestor que use cada desarrollador.

---

### 1.2 Aspectos Positivos de Seguridad

- ✅ **Interceptor HTTP** correctamente implementado con `withCredentials: true` para cookies de sesión
- ✅ **Dockerfile** con usuario no-root (`angular`, UID 1001)
- ✅ **Multi-stage build** que no incluye código fuente ni devDependencies en la imagen final
- ✅ **Formularios reactivos** con validación básica en login
- ✅ **TypeScript strict mode** habilitado — reduce errores de tipo en runtime
- ✅ **Guards implementados correctamente** (solo falta aplicarlos en las rutas)
- ✅ **Autenticación basada en cookies HTTP-only** (manejadas por rund-auth), sin almacenamiento de JWT en localStorage

---

## 2. Actualización de Dependencias

### Puntuación: **4.0 / 10**

### 2.1 Resumen de Auditoría npm

```
npm audit — 20 de febrero de 2026
Total: 49 vulnerabilidades
  - 1 baja
  - 7 moderadas
  - 41 altas
```

### 2.2 Dependencias de Producción — Estado de Versiones

| Paquete | Versión actual | Estado | Acción recomendada |
|---------|---------------|--------|--------------------|
| `@angular/core` y familia | ^20.3.15 | 🔴 CRÍTICO — XSS (GHSA-jrmj-c5cx-3cw6) | Actualizar a `>=20.3.16` |
| `quill` | ^2.0.3 | 🔴 ALTO — XSS (GHSA-v3m3-f69x-jf25) | Evaluar downgrade a 2.0.2 o mitigación |
| `primeng` | ^20.0.0 | 🟡 Mismatch con themes | Ver nota abajo |
| `@primeng/themes` | ^19.1.3 | 🟡 Desincronizado | Actualizar a ^20.x |
| `express` | ^5.1.0 | 🟢 Actualizado | OK |
| `pdfjs-dist` | ^5.4.449 | 🟢 Actualizado | OK |
| `chart.js` | ^4.5.0 | 🟢 Actualizado | OK |
| `exceljs` | ^4.4.0 | 🟢 Actualizado | OK |
| `rxjs` | ~7.8.0 | 🟢 Actualizado | OK |
| `typescript` | ~5.8.2 | 🟢 Actualizado | OK |
| `image-js` | ^0.37.0 | 🟡 Sin mantenimiento activo | Evaluar alternativa |
| `@fortawesome/angular-fontawesome` | ^2.0.1 | 🟡 Versión anómala | Verificar compatibilidad |

**Nota sobre `@primeng/themes` vs `primeng`:** Hay una desincronización de versiones principales: PrimeNG es `^20.0.0` pero el paquete de temas es `^19.1.3`. Aunque puede funcionar, es una fuente potencial de inconsistencias de estilos y errores difíciles de depurar. Actualizar `@primeng/themes` a `^20.x`.

### 2.3 Dependencias de Desarrollo — Estado

| Paquete | Versión actual | Estado |
|---------|---------------|--------|
| `@angular/build` | ^20.3.13 | 🔴 ALTO — Transitiva via karma (múltiples vuln.) |
| `@angular/cli` | ^20.3.13 | 🔴 ALTO — Via @angular-devkit/core (ajv) |
| `karma` | ~6.4.0 | 🔴 ALTO — Dependencias con vulnerabilidades |
| `jasmine-core` | ~5.7.0 | 🟢 OK |

> Las vulnerabilidades en devDependencies (karma, @angular/cli) afectan el entorno de desarrollo/CI, no la imagen de producción. Sin embargo, siguen siendo riesgos relevantes para el pipeline de CI/CD.

---

## 3. Optimización de Recursos

### Puntuación: **5.0 / 10**

### 3.1 Bundle y Carga

**Sin lazy loading en ninguna ruta**

Todas las 7 rutas de la aplicación cargan sus componentes de forma eagerly (síncrona en el bundle inicial):

```typescript
// app.routes.ts — Sin lazy loading:
{ path: 'gestion', component: Gestion },  // ← Cargado siempre

// Correcto con lazy loading:
{ path: 'gestion', loadComponent: () => import('./vistas/gestion/gestion').then(m => m.Gestion) },
```

**Impacto:** El bundle inicial incluye el código de todas las vistas (dashboard, certificados, herramientas, validación, etc.), aunque el usuario solo visite una. Esto aumenta el tiempo de carga inicial y el Time to Interactive (TTI).

**Presupuestos de bundle generosos**

Los límites en `angular.json` son muy permisivos para una aplicación web moderna:
```json
{ "type": "initial", "maximumWarning": "2MB", "maximumError": "5MB" }
```
Para referencia, Google recomienda menos de 200KB de JavaScript comprimido para la carga inicial. Un límite de 5MB de error es excesivamente alto.

### 3.2 Patrones de Código con Impacto en Rendimiento

**Nested subscribes en `data.ts` (`init()`)**

El método `init()` del `Data` service usa suscripciones anidadas en lugar de operadores RxJS como `switchMap`:

```typescript
// Patrón problemático — puede causar memory leaks:
this.http.get(labelsUrl).pipe(
  tap((labels) => {
    this.http.get(categoriasUrl).pipe(  // ← Subscribe dentro de subscribe
      tap(...).subscribe();
    );
  })
).subscribe();
```

**`getChartBackgroundColors()` — No es SSR-safe**

```typescript
getChartBackgroundColors(num: number): string {
  // Llama directamente a document sin verificar si está en browser:
  const documentStyle = getComputedStyle(document.documentElement);
```

Esto generará un error `document is not defined` en el servidor SSR. Debería verificarse con `isPlatformBrowser()` (ya importado en el servicio pero no usado aquí).

**`loadDocumentos()` — Sin manejo de errores**

```typescript
loadDocumentos(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    this.http.get<...>(url).subscribe((documentos) => {
      this.documentos = documentos.datos;
      resolve(true);
      // ← Nunca llama a reject() en caso de error HTTP
    });
  });
}
```

Si la petición falla, la promesa quedará pendiente indefinidamente.

**`ChangeDetectorRef.detectChanges()` manual frecuente**

Con `provideZonelessChangeDetection()` ya activo y Signals configurados correctamente, los llamados manuales a `cdr.detectChanges()` en `Header` y `Login` deberían eliminarse. Los Signals actualizan la vista automáticamente; el uso de `detectChanges()` puede causar ciclos de detección extra.

**`RenderMode.Prerender` para rutas autenticadas**

```typescript
// app.routes.server.ts — Configuración problemática:
{ path: '**', renderMode: RenderMode.Prerender }
```

El modo `Prerender` renderiza las páginas en tiempo de build con datos estáticos (sin usuario autenticado). Para rutas protegidas como `/gestion`, `/listados`, `/certificados`, el servidor generará páginas vacías o de error, lo que anula el beneficio del SSR para esas rutas.

**Recomendación:** Usar `RenderMode.Server` para rutas autenticadas y `RenderMode.Prerender` solo para la ruta pública `/validacion`.

### 3.3 Aspectos Positivos de Rendimiento

- ✅ **Zoneless change detection** — Mejor rendimiento que Zone.js, sin polling de eventos
- ✅ **Signals** para estado reactivo — Actualizaciones granulares y eficientes
- ✅ **SSR** con Express — Reduce el tiempo de First Contentful Paint
- ✅ **Client hydration con Event Replay** — Mejor experiencia durante la hidratación
- ✅ **Builder moderno** (`@angular/build` basado en Vite/esbuild) — Builds rápidos
- ✅ **Output hashing** en producción — Cache efectivo de assets
- ✅ **Configuración dinámica** via `/api/config` — Misma imagen Docker para todos los entornos
- ✅ **Docker multi-stage** — Imagen de producción liviana (solo `dist/`)
- ✅ **PDF.js Worker** correctamente configurado como asset separado

---

## 4. Funcionalidad

### Puntuación: **6.0 / 10**

### 4.1 Estado de Características por Módulo

| Módulo / Vista | Estado | Notas |
|----------------|--------|-------|
| **Login** | ✅ Funcional | LDAP + Dev login. Falta condicionar Dev login a entorno |
| **Listados** | ✅ Funcional | Carga Excel (3 tipos), genera CSV side-car, detecta duplicados |
| **Gestión → Carga** | ✅ Funcional | Carga masiva con drag & drop, Levenshtein para categorías |
| **Gestión → Edición** | ✅ Funcional | Árbol OpenKM, download ZIP, delete, reemplazo, adición |
| **Certificados** | ✅ Funcional | Plantillas 1050/1051/1231, descarga PDF y DOCX |
| **Herramientas** | ✅ Funcional | Admin firmas (gestor), extracción IA (admin) |
| **Validación** | ✅ Funcional | Consulta pública de certificados por ID (16 caracteres) |
| **Dashboard** | ⚠️ Incompleto | Implementado pero **comentado en el menú** |
| **Consultas** | ⚠️ Incompleto | Implementado pero **comentado en el menú** |
| **Vista PDF** | ✅ Funcional | Miniaturas con PDF.js en Web Worker |
| **Firmas digitales** | ✅ Funcional | Procesamiento local de imágenes (crop, binarización, transparencia) |
| **Extracción IA** | ✅ Funcional | 8 tipos de documentos via rund-ai (NuExtract) |

### 4.2 Problemas Funcionales Identificados

**Ruta `/acceso-denegado` inexistente**

El guard `adminGuard` y el interceptor HTTP para errores 403 redirigen a `/acceso-denegado`, pero esta ruta no está definida en `app.routes.ts`. El router caería en el wildcard `**` → redirect a `/listados`, lo que resulta en una experiencia confusa para el usuario.

**Dashboard y Consultas fuera del menú**

Estas dos vistas están completamente implementadas pero sus entradas en `elementosMenu` (dentro de `data.ts`) están comentadas. Si hay funcionalidades incompletas, deben ser claramente documentadas y el acceso debe estar restringido, no simplemente comentado.

**Método `getAuth()` deprecado**

```typescript
/** @deprecated Usar login() en su lugar */
getAuth(): void {
  console.warn('getAuth() está deprecado...');
  this.verificarSesion().subscribe();
}
```

Código muerto que debería eliminarse para reducir el tamaño del bundle y la deuda técnica.

**Doble `return true` en `consultas.ts` y `dashboard.ts`**

```typescript
// Se detectó un return duplicado que hace el segundo inalcanzable
// Afecta: consultas.ts (líneas 178-183) y dashboard.ts (líneas 85-90)
suficientesNodos(): boolean {
  if (...) return false;
  return true;
  return true; // ← Dead code, nunca se ejecuta (la lógica real está comentada aquí)
}
```

### 4.3 API y Endpoints

| Categoría | Endpoints | Estado |
|-----------|-----------|--------|
| Sistema | 5 endpoints (info, health, capabilities, migration, docs) | ✅ Migrado a v2 |
| Autenticación | 5 endpoints (login, logout, session, refresh, devLogin) | ✅ Migrado a v2 |
| Profesores | 1 endpoint | ✅ Migrado a v2 |
| Archivos | 8 endpoints | ✅ Migrado a v2 |
| Categorías | 2 endpoints | ✅ Migrado a v2 |
| Listados | 4 endpoints | ✅ Migrado a v2 |
| Certificados | 2 endpoints | ✅ Migrado a v2 |
| Documentos | 2 endpoints | ✅ Migrado a v2 |
| Firmas | 2 endpoints | ✅ Migrado a v2 |
| IA | 1 endpoint | ✅ Migrado a v2 |
| **Total** | **32 endpoints** | ✅ **100% API v2** |

---

## 5. Usabilidad y Calidad de Código

### Puntuación: **6.0 / 10**

### 5.1 Experiencia de Usuario (UX)

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| **Diseño visual** | ✅ Bueno | PrimeNG + tema Aura personalizado (azul corporativo ESAP) |
| **Tipografía** | ✅ Bueno | Montserrat (principal) + Work Sans (secundaria) via Google Fonts |
| **Iconografía** | ✅ Bueno | FontAwesome + Material Symbols + PrimeIcons (consistente) |
| **Componentes UI** | ✅ Bueno | PrimeNG con 28+ componentes: tablas, árboles, diálogos, tabs |
| **Feedback al usuario** | ✅ Bueno | Toast, ProgressBar, ProgressSpinner, Skeleton |
| **Accesibilidad (a11y)** | ⚠️ Sin auditar | Sin `aria-label`, sin pruebas de contraste, sin navegación por teclado verificada |
| **Responsividad** | ⚠️ Parcial | Grid propio `mgp-grid` básico; no se identificó media queries robustos |
| **Internacionalización** | ❌ Ausente | Sin configuración de i18n a pesar de ser app en español colombiano |
| **Mensajes de error** | ✅ Bueno | Mensajes descriptivos en español en formularios y toasts |
| **Indicadores de carga** | ✅ Bueno | Loading states con Signals en operaciones asíncronas |

### 5.2 Calidad del Código TypeScript/Angular

#### Aspectos Positivos

- ✅ **TypeScript strict mode** completo: `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `strictTemplates`
- ✅ **Signals de Angular 20** usados correctamente para estado reactivo (`signal`, `computed`, `effect`)
- ✅ **Zoneless change detection** correctamente configurado
- ✅ **Path aliases** bien definidos (`@servicios/`, `@vistas/`, `@componentes/`, etc.)
- ✅ **Arquitectura standalone** moderna (no NgModules para componentes de aplicación)
- ✅ **Interceptor funcional** (`HttpInterceptorFn`) — patrón moderno de Angular
- ✅ **Guards funcionales** (`CanActivateFn`) — patrón moderno de Angular
- ✅ **APP_INITIALIZER** para configuración antes del bootstrap
- ✅ **`isPlatformBrowser`** usado en servicios para compatibilidad SSR (parcialmente)
- ✅ **Prefijo consistente** en selectores: `mgp-`
- ✅ **100% migrado a API v2** — sin deuda técnica de v1
- ✅ **Documentación JSDoc** en servicios y guards principales
- ✅ **Algoritmo de Levenshtein** implementado localmente para matching de categorías

#### Aspectos a Mejorar

- ❌ **Cero archivos de test** (0 archivos `.spec.ts` en todo el proyecto)
- ❌ `skipTests: true` para todos los schematics — los tests nunca se generan
- ⚠️ `getAuth()` deprecado presente — código muerto
- ⚠️ `console.log` y `console.warn` presentes en código de producción
- ⚠️ `any` usado en varios lugares a pesar del strict mode
- ⚠️ Código de desarrollo (`loginDev`, comentarios "SOLO PARA DESARROLLO") mezclado con código de producción
- ⚠️ `cdr.detectChanges()` manual innecesario con zoneless + Signals activos

### 5.3 Cobertura de Pruebas

| Categoría | Archivos | Tests implementados | Cobertura |
|-----------|----------|---------------------|-----------|
| Servicios | 8 | 0 | 0% |
| Componentes compartidos | 11 | 0 | 0% |
| Guards | 2 (authGuard, adminGuard) | 0 | 0% |
| Interceptores | 1 | 0 | 0% |
| Pipes | 1 (SafePipe) | 0 | 0% |
| Vistas | 7 | 0 | 0% |
| **Total** | **30+** | **0** | **0%** |

La infraestructura de testing está configurada (Karma + Jasmine + `tsconfig.spec.json`), pero ningún test ha sido escrito. Esto representa un riesgo alto para la estabilidad en refactorizaciones futuras.

---

## 6. Puntuación Global

| Dimensión | Peso | Puntuación | Ponderado |
|-----------|------|-----------|-----------|
| **1. Seguridad** | 30% | 3.5 / 10 | 1.05 |
| **2. Dependencias** | 20% | 4.0 / 10 | 0.80 |
| **3. Optimización** | 20% | 5.0 / 10 | 1.00 |
| **4. Funcionalidad** | 20% | 6.0 / 10 | 1.20 |
| **5. Usabilidad/Calidad** | 10% | 6.0 / 10 | 0.60 |
| | | **Total** | **4.65 / 10** |

> **Nota:** La puntuación de seguridad domina la calificación global por su peso relativo. Una vez resueltos los problemas críticos de seguridad (guards + actualización Angular), la puntuación global subiría a ~6.5/10.

---

## 7. Plan de Mejoras (Resumen por Prioridad)

El detalle completo del plan de mejoras se documentará en `informe-plan-mejoras-rund-mgp.md`.

### Prioridad 1 — Inmediato (Sprint 1-2)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1.1 | Aplicar `authGuard` en todas las rutas protegidas | Bajo (1h) | 🔴 Crítico |
| 1.2 | Actualizar Angular a `>=20.3.16` (`npm update @angular/core @angular/...`) | Bajo (2h) | 🔴 Crítico |
| 1.3 | Condicionar `loginDev` solo a entorno de desarrollo (verificar `NODE_ENV`) | Bajo (1h) | 🔴 Crítico |
| 1.4 | Definir ruta `/acceso-denegado` con componente apropiado | Bajo (2h) | 🟠 Alto |
| 1.5 | Eliminar lógica de rol por email (`email.includes(...)`) — usar solo roles del backend | Medio (4h) | 🟠 Alto |

### Prioridad 2 — Corto Plazo (Sprint 3-4)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 2.1 | Implementar lazy loading para todas las rutas | Bajo (3h) | 🟠 Alto |
| 2.2 | Cambiar `RenderMode.Prerender` → `RenderMode.Server` para rutas autenticadas | Bajo (1h) | 🟠 Alto |
| 2.3 | Refactorizar `SafePipe` en pipes específicos por caso de uso | Medio (4h) | 🟠 Alto |
| 2.4 | Eliminar `@primeng/themes` desincronizado — actualizar a ^20.x | Bajo (2h) | 🟡 Medio |
| 2.5 | Refactorizar `data.ts init()` con `switchMap` — eliminar nested subscribes | Bajo (2h) | 🟡 Medio |
| 2.6 | Corregir `getChartBackgroundColors()` para SSR-safety | Bajo (1h) | 🟡 Medio |
| 2.7 | Eliminar código muerto: `getAuth()` deprecado, doble `return true` | Bajo (1h) | 🟡 Bajo |

### Prioridad 3 — Mediano Plazo (Sprint 5-8)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 3.1 | Implementar tests unitarios para servicios críticos (Auth, Data, ConfigService) | Alto (5-8 días) | 🟠 Alto |
| 3.2 | Implementar tests para guards e interceptores | Medio (2-3 días) | 🟠 Alto |
| 3.3 | Configurar `skipTests: false` en schematics de angular.json | Bajo (15min) | 🟡 Medio |
| 3.4 | Implementar y activar Dashboard y Consultas | Alto (variable) | 🟡 Medio |
| 3.5 | Resolver inconsistencia `package-lock.json` vs `yarn.lock` | Bajo (1h) | 🟡 Bajo |
| 3.6 | Eliminar Analytics ID de `angular.json` | Bajo (15min) | 🟡 Bajo |
| 3.7 | Refactorizar `loadDocumentos()` con manejo de errores | Bajo (1h) | 🟡 Bajo |

---

## 8. Conclusiones

`rund-mgp` es un frontend técnicamente moderno que adopta correctamente las mejores prácticas de Angular 20: Signals, zoneless change detection, standalone components, SSR con Express y API v2 completamente migrada. La arquitectura es sólida y el código es mantenible gracias a los path aliases, el strict mode de TypeScript y la documentación JSDoc en los servicios principales.

Sin embargo, el proyecto presenta **deficiencias críticas de seguridad** que deben resolverse antes de considerar cualquier despliegue en producción:

1. **Los guards de autenticación existen pero no protegen las rutas** — Esta es la vulnerabilidad más seria y también la más fácil de corregir (menos de 1 hora de trabajo).
2. **Angular 20.3.15 tiene un XSS conocido** — La actualización a 20.3.16 es directa con `npm update`.
3. **El botón de login de desarrollo está visible en producción** — Debe condicionarse al entorno.

Una vez resueltas estas tres vulnerabilidades críticas, la postura de seguridad del proyecto mejoraría sustancialmente. El plan de mejoras posterior debe enfocarse en: implementar lazy loading, corregir el `RenderMode` SSR, y —especialmente— iniciar la cobertura de pruebas unitarias, que actualmente es del **0%**.

---

*Informe generado el 20 de febrero de 2026 — Versión 1.0*
*Repositorio: `rund-deployment/rund-mgp` — Rama: `main`*
