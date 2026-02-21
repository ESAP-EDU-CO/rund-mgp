# Guía de Actualización Angular 20 → 21 — rund-mgp

**Fecha de elaboración:** 21 de febrero de 2026
**Versión origen:** Angular 20.3.16 (estado actual del proyecto)
**Versión destino:** Angular 21.x (latest stable)
**Complejidad:** Avanzada (SSR, zoneless, standalone, PrimeNG)

> Fuentes oficiales consultadas:
> - [Angular Update Guide (20→21, Advanced)](https://angular.dev/update-guide?v=20.0-21.0&l=3)
> - [Angular Zoneless Guide](https://angular.dev/guide/zoneless)
> - [Angular 21 – What's New? – Ninja Squad](https://blog.ninja-squad.com/2025/11/20/what-is-new-angular-21.0)
> - [Angular 21 – What's New? – Angular.love](https://angular.love/angular-21-whats-new/)
> - [PrimeNG v21 Migration Guide](https://primeng.org/migration/v21)
> - [PrimeNG v21 Release Notes (llms)](https://primeng.org/llms/pages/v21.md)
> - [PrimeNG + Zoneless Discussion](https://github.com/orgs/primefaces/discussions/2310)
> - [Angular 20+ to 21+ Transition Guide (Medium)](https://medium.com/@flaviusson/angular-20-to-21-transition-guide-breaking-changes-best-practices-and-migration-paths-2026-9a66338ac33e)

---

## 1. Estado actual del proyecto

| Paquete | Versión actual | Versión objetivo |
|---|---|---|
| `@angular/core` | 20.3.16 | 21.x |
| `@angular/cli` | 20.3.16 | 21.x |
| `@angular/ssr` | 20.3.16 | 21.x |
| `@angular/cdk` | ~20.2.14 | 21.x |
| `primeng` | ^20.0.0 | ^21.0.0 |
| `typescript` | ~5.8.2 | ✅ compatible (≥ 5.6) |
| `node` | v25.6.1 | ✅ compatible |

**Configuración relevante del proyecto:**
- Standalone components: ✅ (todos los componentes)
- Zoneless change detection: ✅ (`experimentalZonelessChangeDetection`)
- SSR habilitado: ✅ (`@angular/ssr` + `app.routes.server.ts`)
- Control flow moderno: ✅ (`@if`, `@for`, `@switch`)

---

## 2. Cambios breaking en Angular 21

### 2.1 Vitest reemplaza Karma como test runner por defecto

Karma queda oficialmente en modo legacy. Angular 21 usa Vitest como runner predeterminado. El proyecto actualmente tiene `skipTests: true` en los 8 schematics (pendiente de Sprint 2), por lo que este cambio se alinea perfectamente con la estrategia de habilitar testing desde cero.

**Impacto:** Alto si se hubiera configurado Karma. En rund-mgp: **bajo** (no hay karma.conf.js).

### 2.2 HttpClient provisto por defecto en el root injector

Angular 21 inyecta `HttpClient` automáticamente sin necesidad de llamar a `provideHttpClient()`. Si el `app.config.ts` actual tiene una llamada explícita a `provideHttpClient()`, debe revisarse para evitar doble provisión.

**Impacto:** Potencialmente medio — puede causar comportamiento inesperado en interceptores.

### 2.3 Zoneless deja de ser experimental

La opción `experimentalZonelessChangeDetection` que usa el proyecto se migra a la API estable. El schematic lo actualiza automáticamente.

**Impacto:** Bajo (schematic automático).

### 2.4 Deprecación de ngClass y ngStyle

`ngClass` y `ngStyle` son deprecados en favor de binding de clase/estilo directo. Se proveen schematics automáticos.

**Impacto:** Bajo a medio dependiendo del uso en plantillas.

### 2.5 Cambios en parseo de selectores CSS

Se refactorizó el parseo de selectores CSS, especialmente en pseudo-selectores `:where()`, `:is()`, `:host` y `:host-context`. Pueden cambiar la especificidad resultante. Afecta principalmente a componentes con encapsulación de vista y estilos de PrimeNG con host-context.

**Impacto:** Medio — requiere pruebas visuales post-update.

### 2.6 TypeScript 5.6 como mínimo

Angular 21 requiere TypeScript ≥ 5.6. El proyecto usa `~5.8.2`.

**Impacto:** ✅ Ninguno — ya cumple el requisito.

---

## 3. Breaking changes en PrimeNG v21

### 3.1 Animaciones CSS nativas — eliminación de Angular Animations

PrimeNG v21 migra a animaciones basadas en CSS nativo, abandonando `@angular/animations`. Las propiedades de transición **ya no tienen efecto** aunque no producen error en tiempo de compilación.

| Propiedad deprecada | Estado en v21 | Eliminación | Acción requerida |
|---|---|---|---|
| `showTransitionOptions` | Deprecada, ignorada | v22 | Eliminar de las plantillas |
| `hideTransitionOptions` | Deprecada, ignorada | v22 | Eliminar de las plantillas |

**Búsqueda en rund-mgp:**
```bash
grep -r "showTransitionOptions\|hideTransitionOptions" src/ --include="*.html" --include="*.ts"
```

Si hay resultados, eliminar esas propiedades. Las animaciones ahora son controladas por CSS custom properties del tema Aura.

### 3.2 Renombrado de atributos PT (PassThrough)

Los atributos directivos de PassThrough cambian de notación prefijo a sufijo:

| Antes (v20) | Después (v21) |
|---|---|
| `ptInputText` | `pInputTextPT` |
| `ptButton` | `pButtonPT` |
| `ptTable` | `pTablePT` |

**Búsqueda en rund-mgp:**
```bash
grep -r "\bpt[A-Z]" src/ --include="*.html"
```

**Eliminación prevista:** v22. No es urgente pero sí recomendable migrar en esta actualización.

### 3.3 contextMenuSelectionMode "joint" eliminado

En `p-tree`, `p-treetable` y `p-table`, el modo `contextMenuSelectionMode="joint"` es eliminado. Usar `"separate"` en su lugar.

**Impacto en rund-mgp:** Bajo (verificar si hay p-table con contextMenu en listados/gestion).

### 3.4 Versiones mínimas de paquetes internos

```bash
# Estos paquetes deben ser ≥ 2.0.2 o se producen errores visuales silenciosos
npm install @primeuix/styles@^2.0.2 @primeuix/themes@^2.0.2
```

**Verificar después de la actualización:**
```bash
npm list @primeuix/styles @primeuix/themes
```

---

## 4. ⚠️ Problema crítico: PrimeNG + Zoneless + OnPush

> **Este es el riesgo más alto de la migración.** El usuario ya ha experimentado este problema en proyectos anteriores.

### 4.1 Descripción del problema

PrimeNG fue diseñado asumiendo que **Zone.js** dispara la detección de cambios automáticamente. Cuando se usa `ChangeDetectionStrategy.OnPush` con zoneless, muchos componentes de PrimeNG no actualizan su vista porque:

1. Zone.js no intercepta los eventos internos de PrimeNG
2. Sin Zone.js, Angular solo re-renderiza cuando recibe una notificación explícita
3. PrimeNG no emite esas notificaciones internamente de forma consistente

**Estado oficial:** El mantenedor principal de PrimeNG (cagataycivici) confirmó en abril 2025:
> *"Zoneless es una característica experimental; trabajaremos en ello cuando esté listo para producción."*

PrimeNG v21 incluye "Initial Zoneless Support" pero **no es soporte completo**.

### 4.2 Síntomas conocidos

| Síntoma | Componente | Causa |
|---|---|---|
| Labels no se desplazan al cargar datos | `p-floatlabel`, `p-inputtext` | No se notifica el cambio de valor |
| Dropdown no muestra el valor seleccionado | `p-select`, `p-dropdown` | Estado interno no sincronizado |
| Tabla no refleja cambios de datos | `p-table` | Rows no se re-renderizan |
| Diálogo no se cierra visualmente | `p-dialog` | Animación CSS no dispara detección |
| Botón muestra estado incorrecto | `p-button` (loading) | Signal de loading no propagada |

### 4.3 Estrategia recomendada para rund-mgp

**Opción A — Conservadora (recomendada para esta migración):**
Volver a Zone.js durante la migración a Angular 21, hasta que PrimeNG tenga soporte completo.

```typescript
// src/app/app.config.ts
import { provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), // ← añadir
    // Eliminar o comentar: provideExperimentalZonelessChangeDetection()
    // ...resto de providers
  ]
};
```

**Ventaja:** Cero riesgo de regresión visual con PrimeNG. Permite completar el Sprint 2 y Sprint 3 sin sorpresas.

**Opción B — Zoneless con workarounds (avanzada):**
Mantener zoneless e inyectar `ChangeDetectorRef` en cada componente que use PrimeNG interactivo.

```typescript
// Patrón para componentes con PrimeNG en modo zoneless
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, ... })
export class ListadosComponent {
  private cdr = inject(ChangeDetectorRef);

  cargarDatos(): void {
    this.servicio.getDatos().subscribe(datos => {
      this.datos = datos;
      this.cdr.markForCheck(); // ← obligatorio con PrimeNG + zoneless
    });
  }

  // En operaciones síncronas que afectan PrimeNG:
  onSeleccion(item: any): void {
    this.seleccionado = item;
    this.cdr.detectChanges(); // ← fuerza render inmediato
  }
}
```

### 4.4 Cuándo usar markForCheck() vs detectChanges()

| Método | Cuándo usarlo | Efecto |
|---|---|---|
| `markForCheck()` | Después de cambios asíncronos (HTTP, timers) | Marca el componente y sus padres para la próxima ronda de CD |
| `detectChanges()` | Cuando el cambio debe verse inmediatamente (ej: abrir un dialog) | Ejecuta CD sincrónico en el árbol del componente |
| `Signals` | Estado reactivo nuevo | Se propagan automáticamente, sin necesidad de CD manual |

**Regla práctica en rund-mgp:**
- Respuestas HTTP → `markForCheck()`
- Interacciones directas con PrimeNG (open/close dialog, selección, filtros) → `detectChanges()`
- Estado nuevo que se puede modelar como signal → usar `signal()` directamente

### 4.5 Decisión para esta migración

```
¿Está rund-mgp listo para zoneless completo con PrimeNG v21?
                         │
             ┌───────────┴───────────┐
             │                       │
    PrimeNG v21 tiene         PrimeNG v21 tiene
    soporte zoneless           soporte parcial
    completo                   (situación actual)
             │                       │
             ▼                       ▼
    Mantener zoneless        ⚠️ Usar Opción A:
    + migrar signals          provideZoneChangeDetection()
                              hasta PrimeNG v22
```

**Recomendación:** Aplicar **Opción A** en esta migración. Revisar el estado de zoneless en PrimeNG antes de Sprint 3 y decidir si retomar.

---

## 5. Nuevas características en Angular 21

### 5.1 Signal Forms (Experimental)

Nueva API de formularios basada en signals que simplifica la gestión de formularios reactivos:

```typescript
// En lugar de FormBuilder tradicional:
protected readonly loginForm = form(this.initialValues);
// Acceso reactivo sin subscribe
const username = loginForm.value.username; // signal automática
```

**Para rund-mgp:** Aplicable al `login.ts` en Sprint 3+. Por ahora se mantiene ReactiveFormsModule.

### 5.2 Angular Aria (Developer Preview)

Nueva librería de componentes accesibles:

```bash
npm install @angular/aria
```

**Para rund-mgp:** Evaluar en Sprint 3 para mejorar accesibilidad del formulario de login y tablas de listados.

### 5.3 SimpleChanges Genérico

`SimpleChanges` ahora soporta genéricos para mayor seguridad de tipos:

```typescript
ngOnChanges(changes: SimpleChanges<MyComponent>): void { ... }
```

### 5.4 HttpResponse mejorado

Nueva propiedad `responseType` en `HttpResponse` y `HttpErrorResponse` para diagnóstico de problemas CORS.

---

## 6. Pasos de actualización

### FASE 0: Pre-actualización (obligatorio)

```bash
# 1. Verificar que el repositorio está limpio
git -C rund-mgp status
# → Debe mostrar "nothing to commit"

# 2. Crear rama de actualización
git -C rund-mgp checkout -b feat/angular-21-upgrade

# 3. Verificar versión de Node
node --version  # → v25.x.x ✅

# 4. Verificar versión actual de Angular
rund-mgp/node_modules/.bin/ng version

# 5. Confirmar que la app compila en v20
rund-mgp/node_modules/.bin/tsc -p rund-mgp/tsconfig.json --noEmit
```

### FASE 1: Actualización del framework

```bash
# Ejecutar desde el directorio rund-mgp/
cd rund-mgp

# Actualizar Angular core y CLI
npx @angular/cli@21 update @angular/core@21 @angular/cli@21

# Si hay errores de peer dependencies:
npx @angular/cli@21 update @angular/core@21 @angular/cli@21 --force

# Verificar que los schematics automáticos se ejecutaron correctamente
# (ng update aplica automáticamente las migraciones del framework)
```

### FASE 2: Actualizar dependencias relacionadas

```bash
# Angular CDK
npx @angular/cli@21 update @angular/cdk@21

# PrimeNG v21 + paquetes internos requeridos (≥ 2.0.2 obligatorio)
npm install primeng@21 @primeng/themes@latest
npm install @primeuix/styles@^2.0.2 @primeuix/themes@^2.0.2

# Verificar versiones instaladas:
npm list primeng @primeuix/styles @primeuix/themes

# Si primeng@21 no está disponible aún:
npm install primeng@latest @primeng/themes@latest
npm install @primeuix/styles@latest @primeuix/themes@latest
```

> ⚠️ Si `@primeuix/styles` o `@primeuix/themes` quedan en versión < 2.0.2,
> los componentes de PrimeNG pueden tener errores visuales silenciosos
> (colores incorrectos, bordes que desaparecen, temas que no aplican).

### FASE 3: Schematics de migración automática

Ejecutar en orden después de `ng update`:

```bash
# 3.1 Migrar zoneless de experimental a estable (si no se aplicó automáticamente)
# ⚠️ PRECAUCIÓN: ver sección 4 sobre PrimeNG + zoneless antes de ejecutar
ng generate @angular/core:zoneless

# 3.2 Migrar ngClass a class bindings
ng generate @angular/core:ngclass-to-class

# 3.3 Migrar ngStyle a style bindings
ng generate @angular/core:ngstyle-to-style

# 3.4 Migrar testing de Jasmine/Karma a Vitest (Sprint 2)
ng generate @schematics/angular:refactor-jasmine-vitest
# Alternativa (si el schematic anterior no funciona):
ng generate @angular/core:karma-to-vitest
```

> **Sobre el schematic 3.1 (zoneless):** `ng update` puede aplicarlo automáticamente,
> convirtiendo `provideExperimentalZonelessChangeDetection()` en `provideZonelessChangeDetection()`.
> Después de aplicarlo, **revisar FASE 4.5** para decidir si mantener zoneless o
> revertir a `provideZoneChangeDetection()` por compatibilidad con PrimeNG.

### FASE 4: Ajustes manuales específicos de rund-mgp

#### 4.0 Decisión zoneless vs Zone.js (PRIORITARIO — leer antes de continuar)

Basado en la experiencia previa con PrimeNG y los problemas reportados (sección 4):

```typescript
// src/app/app.config.ts — OPCIÓN A (recomendada)
import { provideZoneChangeDetection } from '@angular/core';
// Eliminar: import { provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), // ← compatibilidad PrimeNG
    // NO usar: provideZonelessChangeDetection()
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // ...
  ]
};
```

Con esta configuración, eliminar también `zone.js` de los imports explícitos si se hubiera removido:
```bash
# Verificar que zone.js sigue en package.json
cat package.json | grep zone
# Si no está, reinstalar:
npm install zone.js
```

#### 4.1 Revisar provideHttpClient() en app.config.ts

```typescript
// ANTES (Angular 20): necesario explícito
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),  // ← revisar
    // ...
  ]
};

// DESPUÉS (Angular 21): HttpClient se provee automáticamente
// PERO si usas interceptores personalizados (authInterceptor), MANTENER:
export const appConfig: ApplicationConfig = {
  providers: [
    // Mantener si hay interceptores:
    provideHttpClient(withInterceptors([authInterceptor])),
    // SIN interceptores: puede eliminarse, pero no es obligatorio
  ]
};
```

**Acción:** Verificar `src/app/app.config.ts` — si tiene `withInterceptors([authInterceptor])`, mantenerlo.

#### 4.2 Verificar app.routes.server.ts con nueva versión de @angular/ssr

El `app.routes.server.ts` fue actualizado en Sprint 1 con RenderMode por ruta. Confirmar que la API de `ServerRoute` no cambió en Angular 21:

```typescript
// Verificar que estos imports siguen siendo válidos en v21:
import { RenderMode, ServerRoute } from '@angular/ssr';
```

#### 4.3 Revisar selectores CSS de PrimeNG

Después de actualizar PrimeNG a v21, verificar visualmente:
- Tema Aura (colores, bordes, sombras)
- Tablas (`p-table`) en listados
- Diálogos y overlays
- Formulario de login
- Componente AccesoDenegado (botones `p-button`)

#### 4.4 Actualizar @types/node si es necesario

```bash
# Angular 21 puede requerir @types/node más reciente
npm install --save-dev @types/node@latest
```

#### 4.5 Eliminar showTransitionOptions/hideTransitionOptions de PrimeNG

Buscar y eliminar estas propiedades deprecadas en todas las plantillas:

```bash
# Buscar usos
grep -r "showTransitionOptions\|hideTransitionOptions" src/ --include="*.html" -l
```

Si hay resultados, eliminar los atributos. Ejemplo:
```html
<!-- ANTES (v20) -->
<p-dialog [showTransitionOptions]="'300ms ease-in'" [hideTransitionOptions]="'200ms ease-out'">

<!-- DESPUÉS (v21) — las animaciones son CSS automáticas -->
<p-dialog>
```

#### 4.6 Migrar atributos PT si se usan

```bash
# Buscar atributos PT con notación antigua (prefijo)
grep -r "\[pt[A-Z]\|pt[A-Z][a-z]*=" src/ --include="*.html" -l
```

Renombrar de `ptComponenteName` a `pComponentNamePT`. Ejemplo:
```html
<!-- ANTES -->
<p-inputtext ptInputText="...">
<!-- DESPUÉS -->
<p-inputtext pInputTextPT="...">
```

### FASE 5: Verificación post-actualización

```bash
# 5.1 Verificar TypeScript sin errores
./node_modules/.bin/tsc -p tsconfig.json --noEmit
# → 0 errores

# 5.2 Build de producción
npm run build
# → Build succeeded

# 5.3 Build SSR
npm run build:ssr  # o el script equivalente en package.json
# → Build succeeded

# 5.4 Ejecutar servidor de desarrollo
npm start
# → Verificar manualmente: login, listados, navegación con guards

# 5.5 Verificar en navegador
# → http://localhost:4200
# → Probar login LDAP y rutas protegidas
# → Probar /acceso-denegado
# → Verificar que PrimeNG se ve correctamente
```

### FASE 6: Commit y merge

```bash
# Desde rund-mgp/
git add -A
git commit -m "feat(mgp): actualizar Angular 20.3.16 → 21.x

- ng update @angular/core@21 @angular/cli@21
- Migración zoneless a API estable
- Migraciones ngClass/ngStyle automáticas
- PrimeNG actualizado a v21
- Vitest configurado como test runner (preparando Sprint 2)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin feat/angular-21-upgrade

# Crear PR o merge directo a main según flujo del equipo
git checkout main
git merge feat/angular-21-upgrade
git push origin main
```

---

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **PrimeNG + zoneless: componentes no actualizan** | **Alta** | **Alto** | **Usar Opción A: `provideZoneChangeDetection()`** |
| PrimeNG v21 no disponible al momento | Media | Medio | Usar `primeng@latest`; verificar `@primeuix/styles ≥ 2.0.2` |
| Cambios visuales por CSS selector parsing | Media | Medio | Pruebas visuales completas en FASE 5 |
| showTransitionOptions ignorados silenciosamente | Alta | Bajo | Buscar y eliminar con grep antes del build |
| Interceptores HttpClient con doble provisión | Baja | Alto | Revisar app.config.ts antes de build |
| SSR roto por cambios en @angular/ssr | Baja | Alto | Verificar app.routes.server.ts post-update |
| Schematics de migración con conflictos | Baja | Medio | Revisar git diff después de cada schematic |
| zone.js eliminado por schematic automático | Media | Alto | Verificar `package.json` y `polyfills` post-update |

---

## 8. Relación con el plan de mejoras existente

Esta actualización es **prerequisito** para Sprint 2 y Sprint 3:

| Sprint | Ítem | Dependencia de Angular 21 |
|---|---|---|
| Sprint 2 | T-01: Habilitar testing | Vitest (ng update instala config base) |
| Sprint 2 | T-02 a T-06: Tests unitarios | Vitest como runner |
| Sprint 3 | R-01: División de data.ts | Signal Forms (opcional pero recomendado) |
| Sprint 3 | O-05: Eliminar detectChanges() | ⚠️ Solo si PrimeNG tiene soporte zoneless completo |

> **Nota sobre O-05 (eliminar detectChanges()):** El plan de mejoras original incluye
> eliminar las 20 llamadas a `detectChanges()` en el Sprint 3. Con la estrategia
> **Opción A** (Zone.js), `detectChanges()` sigue siendo innecesario con Zone.js activo
> y puede eliminarse igualmente. Con **Opción B** (zoneless + PrimeNG), algunas llamadas
> a `detectChanges()` son **obligatorias** y no deben eliminarse hasta que PrimeNG
> tenga soporte zoneless completo.

---

## 9. Checklist de ejecución

```
FASE 0 — Pre-actualización
  [ ] Repositorio limpio (git status)
  [ ] Rama feat/angular-21-upgrade creada
  [ ] Node ≥ 18 LTS verificado
  [ ] Compilación TypeScript base pasa (0 errores)

FASE 1 — Framework
  [ ] ng update @angular/core@21 @angular/cli@21 ejecutado
  [ ] Sin errores de compilación post-update
  [ ] Revisar si schematic automático modificó app.config.ts (zoneless)

FASE 2 — Dependencias
  [ ] @angular/cdk@21 actualizado
  [ ] primeng@21 (o latest) actualizado
  [ ] @primeuix/styles ≥ 2.0.2 instalado
  [ ] @primeuix/themes ≥ 2.0.2 instalado
  [ ] npm list confirma versiones correctas

FASE 3 — Schematics
  [ ] Decisión zoneless vs Zone.js tomada (ver sección 4)
  [ ] Migración ngClass aplicada
  [ ] Migración ngStyle aplicada
  [ ] Vitest configurado (karma-to-vitest)

FASE 4 — Ajustes manuales PrimeNG + Angular
  [ ] app.config.ts: provideZoneChangeDetection() o provideZonelessChangeDetection()
  [ ] zone.js presente en package.json (si Opción A)
  [ ] showTransitionOptions/hideTransitionOptions eliminados de plantillas
  [ ] Atributos PT migrados (ptX → pXPT) si aplica
  [ ] app.config.ts verificado (provideHttpClient + interceptores)
  [ ] app.routes.server.ts verificado

FASE 5 — Verificación
  [ ] tsc --noEmit: 0 errores
  [ ] npm run build: exitoso
  [ ] Login funcional (formulario, error messages)
  [ ] Rutas con guards funcionales
  [ ] /acceso-denegado funcional
  [ ] Tablas (p-table) en listados muestran datos correctamente
  [ ] Dialogs (p-dialog) abren y cierran correctamente
  [ ] Dropdowns (p-select) muestran selección correcta
  [ ] FloatLabels se desplazan al escribir
  [ ] Tema Aura visualmente correcto

FASE 6 — Merge
  [ ] Commit descriptivo
  [ ] Push y merge a main
```

---

**Tiempo estimado de ejecución:** 3–5 horas (según disponibilidad de PrimeNG v21 y pruebas visuales)
**Responsable sugerido:** Desarrollador con conocimiento de Angular y acceso al entorno de desarrollo
