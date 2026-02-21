# Sección 2: Plan de Actualización de Dependencias y Optimización — rund-mgp

**Proyecto:** rund-mgp (Angular 20 SSR)
**Fecha:** 21 de febrero de 2026
**Versión analizada:** 2.0.0 (Angular 20.3.15)

---

## 2.1 Actualización de Dependencias de Producción

### 2.1.1 Tabla de Actualizaciones

| Paquete | Versión Actual | Versión Objetivo | Severidad | Tipo | Comando npm |
|---------|---------------|-----------------|-----------|------|-------------|
| `@angular/core` (y todo el ecosistema Angular) | `^20.3.15` | `^20.3.16` | **ALTA** (XSS fix) | Producción | `npm install @angular/core@20.3.16 @angular/common@20.3.16 @angular/animations@20.3.16 @angular/compiler@20.3.16 @angular/forms@20.3.16 @angular/platform-browser@20.3.16 @angular/platform-server@20.3.16 @angular/router@20.3.16 @angular/ssr@20.3.16` |
| `@primeng/themes` | `^19.1.3` | `^20.0.0` | **ALTA** (mismatch mayor) | Producción | `npm install @primeng/themes@20.0.0` |
| `quill` | `^2.0.3` | Evaluar (ver §2.1.4) | **ALTA** (GHSA-v3m3-f69x-jf25 XSS) | Producción | Ver §2.1.4 |
| `@angular/build` | `^20.3.13` | `^20.3.16` | **MEDIA** | Dev | `npm install -D @angular/build@20.3.16` |
| `@angular/cli` | `^20.3.13` | `^20.3.16` | **MEDIA** | Dev | `npm install -D @angular/cli@20.3.16` |
| `@angular/compiler-cli` | `^20.3.15` | `^20.3.16` | **MEDIA** | Dev | `npm install -D @angular/compiler-cli@20.3.16` |
| `karma` | `~6.4.0` | Verificar advisory | **BAJA** (devDep) | Dev | `npm install -D karma@latest` |

**Nota:** Las 49 vulnerabilidades reportadas por `npm audit` incluyen 41 altas, pero la mayoría corresponden a `karma` y al árbol de devDependencies. Las vulnerabilidades en devDependencies no afectan el bundle de producción. Priorizar siempre las de producción.

---

### 2.1.2 Proceso de Actualización Angular 20.3.16

Angular aplica versionado semántico estricto dentro de un mismo minor. Un patch de 20.3.15 a 20.3.16 no introduce breaking changes, pero el proceso correcto es:

**Paso 1 — Verificar el changelog antes de actualizar**

```bash
# Ver qué cambios trae 20.3.16
npx ng update --next 2>/dev/null | grep angular
# O consultar directamente:
# https://github.com/angular/angular/blob/main/CHANGELOG.md
```

**Paso 2 — Usar el mecanismo oficial de Angular**

```bash
cd /Users/ocastelblanco/Documents/ESAP/RUND/rund-deployment/rund-mgp

# ng update gestiona interdependencias correctamente
npx ng update @angular/core@20.3.16 @angular/cli@20.3.16
```

`ng update` actualiza automáticamente todos los paquetes del ecosistema Angular que tengan interdependencias (`@angular/common`, `@angular/compiler`, `@angular/forms`, `@angular/platform-browser`, `@angular/platform-server`, `@angular/router`, `@angular/ssr`, `@angular/build`, `@angular/compiler-cli`) y ejecuta migrations si las hay.

**Paso 3 — Verificar que no hay breaking changes**

```bash
# Build de producción completo
npm run build

# Verificar que el servidor SSR inicia
node dist/rund-mgp/server/server.mjs &
curl -s http://localhost:4000/ | head -20
kill %1
```

**Paso 4 — Revisar archivos modificados por ng update**

```bash
git diff --name-only
```

Si `ng update` modificó `tsconfig.app.json`, `angular.json` o archivos de configuración, revisar que los cambios son coherentes con la configuración del proyecto.

**Criterios de aceptación:**
- `npm run build` termina sin errores ni advertencias nuevas
- `node dist/rund-mgp/server/server.mjs` inicia correctamente
- `npm audit` ya no reporta la vulnerabilidad de Angular XSS
- `git diff` no muestra cambios inesperados en archivos de lógica de negocio

---

### 2.1.3 Resolver Mismatch @primeng/themes vs primeng

**Problema actual:**

```json
"@primeng/themes": "^19.1.3",   // Versión MAYOR 19
"primeng":         "^20.0.0"    // Versión MAYOR 20
```

Esto es un mismatch de versión mayor. El paquete `@primeng/themes` en versión 19.x fue el paquete separado para temas de PrimeNG 19. A partir de PrimeNG 20, los temas se unificaron y `@primeng/themes` en versión 20 es el paquete compatible. Usar versiones cruzadas puede causar que estilos del tema Aura no carguen correctamente o que las variables CSS (`--p-*`) no estén disponibles.

**Comando de corrección:**

```bash
npm install @primeng/themes@20.0.0
```

Si `primeng` está en `^20.0.0` y ya hay una versión 20.x publicada de `@primeng/themes`, se puede hacer simplemente:

```bash
npm install @primeng/themes@^20.0.0
```

**Qué verificar en el tema Aura después del cambio:**

1. Importaciones en `src/styles.scss` — si importa desde `@primeng/themes/aura`, verificar que la ruta sigue siendo válida:

```scss
/* Verificar que esta importación sigue funcionando */
@import "@primeng/themes/aura";
```

2. Verificar en el navegador que las variables CSS `--p-primary-500`, `--p-text-color`, `--p-surface-100`, etc. están disponibles en el inspector de estilos.

3. Revisar visualmente los componentes PrimeNG más usados: `p-table`, `p-dialog`, `p-button`, `p-dropdown`.

**Criterios de aceptación:**
- `npm ls @primeng/themes primeng` muestra versiones de la misma familia mayor (ambas 20.x)
- No hay `UNMET PEER DEPENDENCY` en la salida de npm
- La UI mantiene el aspecto visual del tema Aura sin regresiones

---

### 2.1.4 Estrategia para Quill XSS (GHSA-v3m3-f69x-jf25)

**Vulnerabilidad:** La versión `2.0.3` de Quill tiene una vulnerabilidad XSS documentada en GHSA-v3m3-f69x-jf25. Un atacante puede inyectar HTML malicioso a través del editor si el contenido del editor no se sanitiza antes de ser renderizado fuera del mismo.

**Evaluación de opciones:**

**Opción A — Downgrade a 2.0.2 (NO recomendada)**
```bash
npm install quill@2.0.2
```
Esta opción solo funciona si la vulnerabilidad fue introducida en 2.0.3 y no existía en 2.0.2. Sin embargo, si el advisory cubre versiones anteriores también, el downgrade no resuelve nada. Consultar el GHSA para el rango exacto de versiones afectadas.

**Opción B — Actualizar a la versión parcheada (Recomendada si existe)**
```bash
# Verificar si hay una versión parcheada disponible
npm view quill versions --json | node -e "process.stdin | JSON.parse | v => console.log(v.filter(x => x.startsWith('2.')))"

# Si existe 2.0.4 o superior con el fix:
npm install quill@latest
```

**Opción C — Mitigación con Content Security Policy (Recomendada como complemento)**

Si no existe versión parcheada, agregar CSP estricto en el servidor Express SSR (`src/server.ts`):

```typescript
// En src/server.ts, agregar helmet o cabeceras CSP manuales
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  next();
});
```

**Opción D — Reemplazar Quill por ngx-quill con versión segura o TipTap**

Si el editor de texto enriquecido no es una funcionalidad central y Quill no tiene fix disponible, evaluar migrar a:

- **TipTap** con `@tiptap/angular` — activamente mantenido, sin CVEs recientes
- **Desactivar el editor en SSR** — asegurar que Quill solo se instancia en el navegador

```typescript
// Opción de carga condicional solo en browser
import { isPlatformBrowser } from '@angular/common';

if (isPlatformBrowser(this.platformId)) {
  const { Quill } = await import('quill');
  // inicializar editor
}
```

**Recomendación final:** Verificar en npm si hay una versión `>2.0.3` de Quill con el fix. Si la hay, actualizar. Si no, implementar la Opción C (CSP) como mitigación inmediata y planificar la migración a TipTap en el siguiente sprint.

**Criterios de aceptación:**
- `npm audit` ya no reporta GHSA-v3m3-f69x-jf25
- O bien: cabecera CSP está presente en las respuestas HTTP
- El editor de texto enriquecido sigue funcionando correctamente

---

### 2.1.5 Resolución package-lock.json vs yarn.lock

**Problema actual:**

El repositorio tiene ambos archivos de lock simultáneamente:
- `package-lock.json` — generado por `npm`
- `yarn.lock` — generado por `yarn`

Esto crea inconsistencias porque cada gestor de paquetes puede resolver versiones de subdependencias de forma diferente. Si un desarrollador usa `npm install` y otro usa `yarn`, pueden terminar con árboles de dependencias distintos, rompiendo reproducibilidad.

**Recomendación: conservar npm (package-lock.json)**

El proyecto tiene `package-lock.json` como archivo de lock activo (se referencia en los scripts de CI/CD). Eliminar `yarn.lock`:

```bash
cd /Users/ocastelblanco/Documents/ESAP/RUND/rund-deployment/rund-mgp

# Eliminar yarn.lock
rm yarn.lock

# Agregar .npmrc para forzar npm en el proyecto
echo "engine-strict=false" > .npmrc

# Regenerar package-lock.json limpio
rm -rf node_modules package-lock.json
npm install

# Commitear
git add .npmrc package-lock.json
git rm yarn.lock
git commit -m "chore(deps): unificar gestor de paquetes a npm, eliminar yarn.lock"
```

**Política del proyecto (documentar en README o CLAUDE.md):**

```markdown
## Gestor de Paquetes
Este proyecto usa **npm** exclusivamente. No usar yarn ni pnpm.
- Instalar dependencias: `npm install`
- Agregar paquete: `npm install <paquete>`
```

**Agregar `.gitignore` preventivo:**

```gitignore
# Prevenir que se comitan lock files de otros gestores
yarn.lock
pnpm-lock.yaml
```

**Criterios de aceptación:**
- Solo existe `package-lock.json` en el repositorio
- `yarn.lock` eliminado del control de versiones
- `npm install` produce el mismo árbol de dependencias en cualquier máquina
- CI/CD usa exclusivamente `npm ci`

---

### 2.1.6 npm audit en CI/CD

**Configurar auditoría automática en GitHub Actions:**

Crear el archivo `.github/workflows/security-audit.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Ejecutar cada lunes a las 8 AM hora Colombia (UTC-5 = 13:00 UTC)
    - cron: '0 13 * * 1'

jobs:
  audit:
    name: npm audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: rund-mgp

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: rund-mgp/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Audit production dependencies (FAIL on HIGH/CRITICAL)
        run: npm audit --audit-level=high --omit=dev

      - name: Audit all dependencies (INFO only for devDeps)
        run: npm audit --omit=optional || true
        continue-on-error: true
```

**Script local para auditoría rápida:**

```bash
# Agregar a package.json scripts:
"audit:prod": "npm audit --audit-level=high --omit=dev",
"audit:all": "npm audit"
```

**Criterios de aceptación:**
- El workflow de GitHub Actions falla el build si hay vulnerabilidades HIGH o CRITICAL en dependencias de producción
- Las vulnerabilidades de devDependencies se reportan como información pero no bloquean el build
- El audit se ejecuta en cada PR contra `main`

---

## 2.2 Optimización de Rendimiento

### 2.2.1 Lazy Loading para Todas las Rutas [ALTO — 3h]

**Problema actual:**

`src/app/app.routes.ts` importa los 7 componentes de forma estática (eager), lo que significa que todo el código de todas las vistas se incluye en el bundle inicial. Esto aumenta el tiempo de carga de la primera página.

```typescript
// ESTADO ACTUAL — imports estáticos (eager)
import { Gestion } from '@vistas/gestion/gestion';
import { Consultas } from '@vistas/consultas/consultas';
import { Dashboard } from '@vistas/dashboard/dashboard';
import { Certificados } from '@vistas/certificados/certificados';
import { Herramientas } from '@vistas/herramientas/herramientas';
import { Listados } from '@vistas/listados/listados';
import { Validacion } from '@vistas/validacion/validacion';
import { Login } from '@componentes/login/login';
```

**Estimación de impacto:** Con 7 rutas cargando eager, el bundle inicial incluye el código JavaScript de todas las vistas. Dependiendo del tamaño de cada componente y sus dependencias, el lazy loading puede reducir el bundle inicial entre un 40% y 70%, cargando cada ruta solo cuando el usuario navega a ella.

**Solución — app.routes.ts con loadComponent():**

```typescript
// src/app/app.routes.ts — VERSIÓN CORREGIDA con lazy loading
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'listados',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('@componentes/login/login').then(m => m.Login)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@vistas/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'consultas',
    loadComponent: () =>
      import('@vistas/consultas/consultas').then(m => m.Consultas)
  },
  {
    path: 'listados',
    loadComponent: () =>
      import('@vistas/listados/listados').then(m => m.Listados)
  },
  {
    path: 'certificados',
    loadComponent: () =>
      import('@vistas/certificados/certificados').then(m => m.Certificados)
  },
  {
    path: 'gestion',
    loadComponent: () =>
      import('@vistas/gestion/gestion').then(m => m.Gestion)
  },
  {
    path: 'herramientas',
    loadComponent: () =>
      import('@vistas/herramientas/herramientas').then(m => m.Herramientas)
  },
  {
    path: 'validacion',
    loadComponent: () =>
      import('@vistas/validacion/validacion').then(m => m.Validacion)
  },
  {
    path: '**',
    redirectTo: 'listados',
    pathMatch: 'full'
  },
];
```

**Verificación de reducción del bundle:**

```bash
# Build actual (antes del cambio)
npm run build 2>&1 | grep "Initial Chunk Files"

# Después del cambio:
npm run build 2>&1 | grep -E "Initial Chunk Files|Lazy Chunk Files"
```

El output de `ng build` mostrará los chunks lazy por separado. El bundle inicial (`main.js`) debe ser significativamente más pequeño.

**Consideraciones:**
- Los componentes deben ser `standalone: true` (Angular 17+). Verificar que todos los componentes de ruta tienen `standalone: true` en su decorador `@Component`.
- El alias de path `@vistas` y `@componentes` debe estar configurado en `tsconfig.app.json`. Si no están, reemplazar por paths relativos.

**Criterios de aceptación:**
- `npm run build` genera chunks lazy para cada ruta (visible en output del build)
- El bundle inicial (`main.js`) reduce su tamaño al menos un 30% respecto al baseline
- Navegación entre rutas funciona correctamente en desarrollo y producción
- SSR sigue funcionando (el servidor renderiza cada ruta al recibirla)

---

### 2.2.2 Corrección de RenderMode SSR [ALTO — 1h]

**Problema actual:**

```typescript
// src/app/app.routes.server.ts — ESTADO ACTUAL (incorrecto)
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender  // Se aplica a TODAS las rutas
  }
];
```

`RenderMode.Prerender` instruye al servidor de Angular SSR a renderizar todas las rutas en tiempo de build y servir HTML estático. Para rutas autenticadas como `dashboard`, `consultas`, `listados`, `certificados`, `gestion`, `herramientas`, el prerenderizado genera páginas vacías porque no hay sesión activa en build time. Esto además puede exponer errores de inicialización de servicios que intentan hacer HTTP requests en servidor.

**Descripción de cada modo:**
- `RenderMode.Prerender` — Renderiza en build time. Solo válido para páginas estáticas sin datos de usuario.
- `RenderMode.Server` — Renderiza en cada request en el servidor. Válido para páginas dinámicas.
- `RenderMode.Client` — No renderiza en servidor, solo en cliente. Útil para páginas que no deben ser indexadas.

**Solución — app.routes.server.ts corregido:**

```typescript
// src/app/app.routes.server.ts — VERSIÓN CORREGIDA
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Ruta pública: la página de login puede prerenderizarse (es estática)
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  // Ruta de validación pública: puede prerenderizarse si no requiere auth
  {
    path: 'validacion',
    renderMode: RenderMode.Prerender
  },
  // Rutas autenticadas: renderizar en servidor por request
  // Esto permite SSR real con headers de sesión, pero evita páginas vacías en build
  {
    path: 'dashboard',
    renderMode: RenderMode.Server
  },
  {
    path: 'consultas',
    renderMode: RenderMode.Server
  },
  {
    path: 'listados',
    renderMode: RenderMode.Server
  },
  {
    path: 'certificados',
    renderMode: RenderMode.Server
  },
  {
    path: 'gestion',
    renderMode: RenderMode.Server
  },
  {
    path: 'herramientas',
    renderMode: RenderMode.Server
  },
  // Catch-all: client-side para cualquier ruta no especificada
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
```

**Consideración adicional:** Si las rutas autenticadas no aportan valor SEO (son accesibles solo con login), también puede usarse `RenderMode.Client` para ellas, lo que reduce la carga del servidor SSR:

```typescript
// Alternativa si no se necesita SEO en rutas autenticadas
{
  path: 'dashboard',
  renderMode: RenderMode.Client
}
```

**Criterios de aceptación:**
- `npm run build` no reporta errores de prerenderizado en rutas autenticadas
- La ruta `/login` sirve HTML prerenderizado (verificable con `curl http://localhost:4000/login`)
- Las rutas autenticadas responden correctamente sin páginas vacías
- El tamaño del build de producción es similar o menor (menos páginas prerenderizadas)

---

### 2.2.3 Refactorizar data.ts init() con switchMap [MEDIO — 2h]

**Problema actual — nested subscribes:**

```typescript
// src/app/compartidos/servicios/data.ts — líneas 208-249 (ESTADO ACTUAL)
init(): Observable<VarData> {
  const data: VarData = { categorias: [], labels: {} };
  return new Observable<VarData>((observer: Subscriber<VarData>) => {
    const labelsUrl = this.getUrl('datos') + '/labels';
    this.http.get<{ datos: { [key: string]: string } }>(labelsUrl).pipe(
      map((response: any) => response.datos || response),
      tap((labels) => {
        this.labels = labels;
        data.labels = this.labels;
        const categoriasUrl = this.getUrl('datos') + '/categorias';
        // PROBLEMA: subscribe() anidado dentro de tap()
        this.http.get<{ datos: CategoriaBase[] }>(categoriasUrl).pipe(
          map((response: any) => response.datos || response),
          tap((categorias) => {
            this.categorias = categorias;
            data.categorias = this.categorias;
            observer.next(data);
            observer.complete();
          }),
          catchError((error) => {
            console.error('Error obteniendo categorías:', error);
            return throwError(() => error);
          })
        ).subscribe(); // <-- subscribe anidado: memory leak potencial
      }),
      catchError((error) => {
        console.error('Error obteniendo labels:', error);
        return throwError(() => error);
      })
    ).subscribe(); // <-- subscribe anidado: memory leak potencial
  });
}
```

**Problemas identificados:**
1. El `Observable` externo nunca llama `observer.error()` si el subscribe interno falla — el observer queda colgado.
2. Los dos `subscribe()` anidados no se desuscriben si el Observable externo se cancela, causando memory leaks.
3. Usa el antipatrón `new Observable()` wrapping innecesariamente sobre HTTP calls que ya son Observables.

**Solución — Refactorizar con switchMap y forkJoin:**

```typescript
// src/app/compartidos/servicios/data.ts — VERSIÓN CORREGIDA
import { forkJoin, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

init(): Observable<VarData> {
  const labelsUrl = this.getUrl('datos') + '/labels';
  const categoriasUrl = this.getUrl('datos') + '/categorias';

  return forkJoin({
    labelsResp: this.http.get<{ datos: { [key: string]: string } }>(labelsUrl),
    categoriasResp: this.http.get<{ datos: CategoriaBase[] }>(categoriasUrl)
  }).pipe(
    map(({ labelsResp, categoriasResp }) => {
      const labels = (labelsResp as any).datos || labelsResp;
      const categorias = (categoriasResp as any).datos || categoriasResp;

      this.labels = labels;
      this.categorias = categorias;

      const data: VarData = {
        labels: this.labels,
        categorias: this.categorias
      };
      return data;
    }),
    catchError((error) => {
      console.error('Error inicializando data:', error);
      return throwError(() => error);
    })
  );
}
```

**Alternativa con switchMap si las llamadas deben ser secuenciales** (labels primero, luego categorías):

```typescript
init(): Observable<VarData> {
  const labelsUrl = this.getUrl('datos') + '/labels';
  const categoriasUrl = this.getUrl('datos') + '/categorias';

  return this.http.get<any>(labelsUrl).pipe(
    map(response => response.datos || response),
    tap(labels => {
      this.labels = labels;
    }),
    switchMap(labels =>
      this.http.get<any>(categoriasUrl).pipe(
        map(response => response.datos || response),
        map(categorias => {
          this.categorias = categorias;
          return { labels, categorias } as VarData;
        })
      )
    ),
    catchError((error) => {
      console.error('Error inicializando data:', error);
      return throwError(() => error);
    })
  );
}
```

**Recomendación:** Usar `forkJoin` si las dos llamadas son independientes (ejecuta en paralelo, más rápido). Usar `switchMap` solo si los resultados de labels son necesarios para construir la URL de categorías (lo cual no es el caso según el código actual).

**Criterios de aceptación:**
- No existe ningún `subscribe()` dentro de un `tap()` en el método `init()`
- El método retorna un Observable limpio sin wrapping en `new Observable()`
- Si una de las dos llamadas HTTP falla, el error se propaga correctamente al suscriptor
- Los tests de integración (o verificación manual) confirman que labels y categorías cargan correctamente en la aplicación

---

### 2.2.4 SSR-Safety en getChartBackgroundColors() [MEDIO — 1h]

**Problema actual:**

El método en `src/app/compartidos/servicios/data.ts` (línea 330) y el método `nodeData` en `src/app/vistas/dashboard/dashboard.ts` (línea 50) y `creaChart` en `src/app/vistas/consultas/consultas.ts` (línea 90) acceden a `document.documentElement` directamente:

```typescript
// ESTADO ACTUAL — rompe SSR porque document no existe en Node.js
getChartBackgroundColors(num: number, hover: boolean = false): string {
  const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
  this.chartColors = this.chartColors.length < 22 ? this.chartColors.concat(this.chartColors) : this.chartColors;
  return documentStyle.getPropertyValue('--p-' + this.chartColors[num] + '-' + (hover ? '3' : '5') + '00');
}
```

En el servidor SSR (Node.js), `document` no existe. Esto causa `ReferenceError: document is not defined` durante el prerenderizado o el renderizado server-side.

**Solución — Proteger con isPlatformBrowser y retornar valor fallback:**

```typescript
// src/app/compartidos/servicios/data.ts — VERSIÓN CORREGIDA
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// El servicio ya inyecta PLATFORM_ID:
// private platID: any = inject(PLATFORM_ID);

getChartBackgroundColors(num: number, hover: boolean = false): string {
  // Guardia SSR: en servidor retornar color fallback
  if (!isPlatformBrowser(this.platID)) {
    // Retornar un color hex fallback neutro; en el cliente se re-calculará
    return hover ? '#a0a0a0' : '#606060';
  }

  const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
  this.chartColors = this.chartColors.length < 22
    ? this.chartColors.concat(this.chartColors)
    : this.chartColors;
  return documentStyle.getPropertyValue(
    '--p-' + this.chartColors[num] + '-' + (hover ? '3' : '5') + '00'
  );
}
```

**Corrección adicional en dashboard.ts (línea 50):**

```typescript
// src/app/vistas/dashboard/dashboard.ts
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

// En el componente:
private platformId = inject(PLATFORM_ID);

nodeData(nodo: DataCategoria, labelData: string | undefined): DataChart {
  // Guardia SSR
  const textColor = isPlatformBrowser(this.platformId)
    ? getComputedStyle(document.documentElement).getPropertyValue('--p-text-color')
    : '#333333'; // fallback para SSR

  // ... resto del método
}
```

**Corrección adicional en consultas.ts (línea 90):**

```typescript
// src/app/vistas/consultas/consultas.ts
creaChart(panel: DataConsulta): void {
  const textColor = isPlatformBrowser(this.platformId)
    ? getComputedStyle(document.documentElement).getPropertyValue('--p-text-color')
    : '#333333';

  // ... resto del método
}
```

**Criterios de aceptación:**
- `npm run build` no genera errores de prerenderizado relacionados con `document`
- Los gráficos de dashboard y consultas renderizan correctamente en el navegador
- En el servidor SSR, los métodos retornan el color fallback sin lanzar excepciones
- Verificar con `node dist/rund-mgp/server/server.mjs` y `curl http://localhost:4000/dashboard`

---

### 2.2.5 Corregir loadDocumentos() [BAJO — 1h]

**Problema actual:**

```typescript
// src/app/compartidos/servicios/data.ts — líneas 292-299 (ESTADO ACTUAL)
loadDocumentos(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    this.http.get<{ datos: Documento.Listado }>(this.getUrl('datos') + '/documentos')
      .subscribe((documentos: { datos: Documento.Listado }) => {
        this.documentos = documentos.datos;
        resolve(true);
        // PROBLEMA: si la petición HTTP falla, catchError no está y
        // reject() nunca se llama — la Promise queda pendiente indefinidamente
      });
  });
}
```

La promesa nunca llama a `reject()` en caso de error HTTP. Cualquier componente que haga `.then()` sobre `loadDocumentos()` y la petición falle, quedará esperando indefinidamente (Promise eternamente pendiente). Esto además bloquea el ciclo de vida del componente.

**Solución — Agregar catchError con reject():**

```typescript
// src/app/compartidos/servicios/data.ts — VERSIÓN CORREGIDA
loadDocumentos(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    this.http.get<{ datos: Documento.Listado }>(this.getUrl('datos') + '/documentos')
      .pipe(
        catchError((error) => {
          console.error('Error cargando documentos:', error);
          reject(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (documentos: { datos: Documento.Listado }) => {
          this.documentos = documentos.datos;
          resolve(true);
        },
        error: (error) => {
          // El catchError anterior ya llamó reject(), esto es redundante
          // pero es buena práctica tener el handler de error en subscribe también
          console.error('Error en subscribe de loadDocumentos:', error);
        }
      });
  });
}
```

**Solución alternativa — Convertir a Observable (más idiomático en Angular):**

Si los componentes que consumen `loadDocumentos()` se actualizan también, es preferible eliminar el antipatrón Promise-wrapping de Observable:

```typescript
loadDocumentos(): Observable<boolean> {
  return this.http.get<{ datos: Documento.Listado }>(this.getUrl('datos') + '/documentos').pipe(
    map((documentos: { datos: Documento.Listado }) => {
      this.documentos = documentos.datos;
      return true;
    }),
    catchError((error) => {
      console.error('Error cargando documentos:', error);
      return throwError(() => error);
    })
  );
}
```

Los componentes que usan `loadDocumentos().then(...)` deberían actualizarse a `.subscribe(...)`.

**Criterios de aceptación:**
- Si la petición HTTP falla, la Promise llama a `reject()` dentro de 30 segundos (timeout de HTTP)
- Los componentes `certificados.ts` y otros que usan `loadDocumentos()` manejan el caso de error sin quedarse en estado de carga infinito
- Agregar manejo de error en los componentes consumidores:
```typescript
this.dataServicio.loadDocumentos()
  .then(resp => { /* éxito */ })
  .catch(err => { this.mostrarError('No se pudieron cargar los documentos'); });
```

---

### 2.2.6 Ajustar Budget de Bundle [BAJO — 30min]

**Problema actual en angular.json:**

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "2MB",
    "maximumError": "5MB"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "10kB",
    "maximumError": "20kB"
  }
]
```

Los presupuestos de 2MB (warning) y 5MB (error) son excesivamente permisivos. Las mejores prácticas para Angular SSR recomiendan:
- Warning: 500kB para el chunk inicial
- Error: 1MB para el chunk inicial

Valores tan altos enmascaran regresiones de tamaño de bundle.

**Valores recomendados en angular.json:**

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kB",
    "maximumError": "1MB"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "6kB",
    "maximumError": "10kB"
  }
]
```

**Proceso de ajuste gradual:**

Dado que el bundle actual probablemente supera 500kB (todas las rutas son eager), el ajuste debe hacerse en fases:

1. Primero implementar lazy loading (§2.2.1)
2. Medir el tamaño del bundle inicial post-lazy: `npm run build 2>&1 | grep "Initial Chunk Files"`
3. Ajustar los presupuestos al valor medido + 20% de margen
4. Ir reduciendo gradualmente en sprints posteriores hasta llegar al objetivo de 500kB

**Comando para medir bundle actual:**

```bash
npm run build 2>&1 | grep -A 5 "Initial Chunk Files"
```

**Criterios de aceptación:**
- Los presupuestos en `angular.json` son más restrictivos que los valores actuales
- `npm run build` pasa sin superar los nuevos presupuestos
- El equipo tiene visibilidad de regresiones de tamaño de bundle en cada build de CI

---

### 2.2.7 Eliminar detectChanges() Innecesarios [BAJO — 1h]

**Problema actual:**

Con `zoneless` activo en Angular, el ciclo de detección de cambios es manejado automáticamente por el framework mediante signals y el scheduler. Llamar a `ChangeDetectorRef.detectChanges()` manualmente es redundante e incluso puede causar doble renderizado.

**Inventario de archivos con detectChanges():**

Se encontraron `detectChanges()` en 20 archivos:

```
src/app/compartidos/componentes/login/login.ts
src/app/compartidos/componentes/menu/menu.ts
src/app/compartidos/componentes/header/header.ts
src/app/app.ts
src/app/vistas/listados/listados.ts
src/app/vistas/certificados/certificados.ts
src/app/vistas/gestion/edicion/download-preview/download-preview.ts
src/app/vistas/gestion/edicion/borra-documentos/borra-documentos.ts
src/app/vistas/gestion/edicion/adicion/adicion.ts
src/app/vistas/gestion/reemplazo/reemplazo.ts
src/app/vistas/gestion/edicion/edicion.ts
src/app/vistas/consultas/consultas.ts
src/app/vistas/validacion/validacion.ts
src/app/vistas/dashboard/dashboard.ts
src/app/compartidos/componentes/admin-firmas/edita-firma/edita-firma.ts
src/app/compartidos/componentes/admin-firmas/add-firma/add-firma.ts
src/app/vistas/gestion/carga/carga.ts
src/app/compartidos/componentes/ficha-docente/ficha-docente.ts
src/app/compartidos/componentes/carga-documento/carga-documento.ts
src/app/compartidos/componentes/admin-firmas/procesa-firma/procesa-firma.ts
```

**Proceso de eliminación:**

Para cada archivo, la estrategia es:

1. Verificar si el componente usa `ChangeDetectionStrategy.OnPush` o el modo zoneless global
2. Eliminar la inyección de `ChangeDetectorRef` si solo se usa para `detectChanges()`
3. Verificar que la UI sigue actualizándose correctamente

**Ejemplo — certificados.ts:**

```typescript
// ESTADO ACTUAL
private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

ngOnInit(): void {
  this.dataServicio.loadDocumentos().then((resp: boolean) => {
    if (resp) {
      this.listaCertificados = this.dataServicio.documentos.grupos;
      this.cdr.detectChanges(); // <-- innecesario con zoneless
    }
  });
  this.firmasServicio.getFirmas().subscribe((firmas: Firma.Firma[]) => {
    this.listaFirmas = [];
    if (firmas.length > 0) this.listaFirmas = firmas;
    this.cdr.detectChanges(); // <-- innecesario con zoneless
  });
}

// VERSIÓN CORREGIDA — eliminar cdr y detectChanges()
ngOnInit(): void {
  this.dataServicio.loadDocumentos().then((resp: boolean) => {
    if (resp) {
      this.listaCertificados = this.dataServicio.documentos.grupos;
      // zoneless detecta el cambio automáticamente
    }
  });
  this.firmasServicio.getFirmas().subscribe((firmas: Firma.Firma[]) => {
    this.listaFirmas = [];
    if (firmas.length > 0) this.listaFirmas = firmas;
    // zoneless detecta el cambio automáticamente
  });
}
```

**Estrategia de eliminación segura (uno por uno):**

No eliminar todos a la vez. El proceso correcto es:
1. Eliminar `detectChanges()` de un archivo
2. Hacer build y verificar visualmente en el navegador que la UI sigue actualizándose
3. Pasar al siguiente archivo

**Consideración importante:** Si algún componente no funciona correctamente sin `detectChanges()`, puede indicar que ese componente no está usando signals o que tiene estado mutable fuera del control del scheduler. En ese caso, convertir el estado mutable a signals de Angular:

```typescript
// Antes
listaCertificados: Documento.Grupo[] = [];

// Después (con signals)
listaCertificados = signal<Documento.Grupo[]>([]);
// En el template: listaCertificados()
// Para actualizar: this.listaCertificados.set(nuevosValores);
```

**Criterios de aceptación:**
- Ningún componente importa `ChangeDetectorRef` si únicamente lo usaba para `detectChanges()`
- La UI sigue actualizándose correctamente después de operaciones asíncronas en todos los componentes modificados
- `npm run build` no reporta errores nuevos
- Verificación manual en al menos 5 flujos de usuario clave (cargar documentos, cargar certificados, actualizar listados, etc.)

---

## Resumen de Esfuerzo — Dependencias y Optimización

| Ítem | Categoría | Esfuerzo | Prioridad | Sprint Recomendado |
|------|-----------|----------|-----------|-------------------|
| 2.1.2 Actualización Angular 20.3.16 (XSS fix) | Seguridad | 30 min | **CRÍTICA** | Sprint 1 — Día 1 |
| 2.1.3 Resolver mismatch @primeng/themes v19 vs primeng v20 | Corrección | 30 min | **ALTA** | Sprint 1 — Día 1 |
| 2.1.4 Estrategia Quill XSS | Seguridad | 1h | **ALTA** | Sprint 1 — Día 1 |
| 2.1.5 Eliminar yarn.lock, unificar a npm | Mantenimiento | 30 min | **MEDIA** | Sprint 1 — Día 2 |
| 2.1.6 npm audit en CI/CD | DevOps | 1h | **MEDIA** | Sprint 1 — Día 2 |
| 2.2.1 Lazy loading para 7 rutas | Rendimiento | 3h | **ALTA** | Sprint 1 — Días 3-4 |
| 2.2.2 Corrección RenderMode SSR | Corrección SSR | 1h | **ALTA** | Sprint 1 — Día 4 |
| 2.2.3 Refactorizar data.ts init() con switchMap | Calidad de código | 2h | **MEDIA** | Sprint 2 — Día 1 |
| 2.2.4 SSR-Safety getChartBackgroundColors() | Corrección SSR | 1h | **MEDIA** | Sprint 2 — Día 1 |
| 2.2.5 Corregir loadDocumentos() con reject() | Corrección bug | 1h | **BAJA** | Sprint 2 — Día 2 |
| 2.2.6 Ajustar budget de bundle angular.json | Configuración | 30 min | **BAJA** | Sprint 2 — Día 2 |
| 2.2.7 Eliminar detectChanges() innecesarios (20 archivos) | Refactoring | 1h | **BAJA** | Sprint 2 — Días 3-4 |

**Total estimado:** ~13 horas de desarrollo

**Esfuerzo por sprint:**
- Sprint 1 (seguridad y rendimiento crítico): ~6h
- Sprint 2 (calidad de código y correcciones menores): ~7h

---

*Documento generado el 21 de febrero de 2026 como parte del plan de mejoras rund-mgp.*
*Ver también: plan-mejoras-seccion-arquitectura.md (Sección 1), plan-mejoras-seccion-testing.md (Sección 3).*
