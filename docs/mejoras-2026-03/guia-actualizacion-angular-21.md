# Guía de Actualización Angular 20 → 21 — rund-mgp

**Fecha de elaboración:** 21 de febrero de 2026
**Versión origen:** Angular 20.3.16 (estado actual del proyecto)
**Versión destino:** Angular 21.x (latest stable)
**Complejidad:** Avanzada (SSR, zoneless, standalone, PrimeNG)

> Fuentes oficiales consultadas:
> - [Angular Update Guide (20→21, Advanced)](https://angular.dev/update-guide?v=20.0-21.0&l=3)
> - [Angular 21 – What's New? – Angular.love](https://angular.love/angular-21-whats-new/)
> - [The Ultimate Guide to Migrating from Angular 20 to 21](https://noumansehgal.com/blog/migrate-angular-v20-to-v21-guide)
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

## 3. Nuevas características en Angular 21

### 3.1 Signal Forms (Experimental)

Nueva API de formularios basada en signals que simplifica la gestión de formularios reactivos:

```typescript
// En lugar de FormBuilder tradicional:
protected readonly loginForm = form(this.initialValues);
// Acceso reactivo sin subscribe
const username = loginForm.value.username; // signal automática
```

**Para rund-mgp:** Aplicable al `login.ts` en Sprint 3+. Por ahora se mantiene ReactiveFormsModule.

### 3.2 Angular Aria (Developer Preview)

Nueva librería de componentes accesibles:

```bash
npm install @angular/aria
```

**Para rund-mgp:** Evaluar en Sprint 3 para mejorar accesibilidad del formulario de login y tablas de listados.

### 3.3 SimpleChanges Genérico

`SimpleChanges` ahora soporta genéricos para mayor seguridad de tipos:

```typescript
ngOnChanges(changes: SimpleChanges<MyComponent>): void { ... }
```

### 3.4 HttpResponse mejorado

Nueva propiedad `responseType` en `HttpResponse` y `HttpErrorResponse` para diagnóstico de problemas CORS.

---

## 4. Pasos de actualización

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
# Angular CDK (si se usa Angular Material)
npx @angular/cli@21 update @angular/cdk@21

# PrimeNG — esperar versión compatible con Angular 21
npm install primeng@21

# Si primeng@21 no está disponible aún, usar la versión más reciente compatible:
npm install primeng@latest
npm install @primeng/themes@latest
```

### FASE 3: Schematics de migración automática

Ejecutar en orden después de `ng update`:

```bash
# 3.1 Migrar zoneless de experimental a estable (si no se aplicó automáticamente)
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

### FASE 4: Ajustes manuales específicos de rund-mgp

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

## 5. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| PrimeNG v21 no disponible al momento | Media | Medio | Usar `primeng@latest` y esperar release oficial |
| Cambios visuales por CSS selector parsing | Media | Medio | Pruebas visuales completas en FASE 5 |
| Interceptores HttpClient con doble provisión | Baja | Alto | Revisar app.config.ts antes de build |
| SSR roto por cambios en @angular/ssr | Baja | Alto | Verificar app.routes.server.ts post-update |
| Schematics de migración con conflictos | Baja | Medio | Revisar git diff después de cada schematic |

---

## 6. Relación con el plan de mejoras existente

Esta actualización es **prerequisito** para Sprint 2 y Sprint 3:

| Sprint | Ítem | Dependencia de Angular 21 |
|---|---|---|
| Sprint 2 | T-01: Habilitar testing | Vitest (ng update instala config base) |
| Sprint 2 | T-02 a T-06: Tests unitarios | Vitest como runner |
| Sprint 3 | R-01: División de data.ts | Signal Forms (opcional pero recomendado) |
| Sprint 3 | O-05: Eliminar detectChanges() | Zoneless API estable |

---

## 7. Checklist de ejecución

```
FASE 0 — Pre-actualización
  [ ] Repositorio limpio (git status)
  [ ] Rama feat/angular-21-upgrade creada
  [ ] Node ≥ 18 LTS verificado
  [ ] Compilación TypeScript base pasa (0 errores)

FASE 1 — Framework
  [ ] ng update @angular/core@21 @angular/cli@21 ejecutado
  [ ] Sin errores de compilación post-update

FASE 2 — Dependencias
  [ ] @angular/cdk@21 actualizado
  [ ] primeng@21 (o latest) actualizado
  [ ] @primeng/themes actualizado

FASE 3 — Schematics
  [ ] Migración zoneless aplicada
  [ ] Migración ngClass aplicada
  [ ] Migración ngStyle aplicada
  [ ] Vitest configurado (karma-to-vitest)

FASE 4 — Ajustes manuales
  [ ] app.config.ts verificado (provideHttpClient + interceptores)
  [ ] app.routes.server.ts verificado
  [ ] Estilos PrimeNG verificados visualmente

FASE 5 — Verificación
  [ ] tsc --noEmit: 0 errores
  [ ] npm run build: exitoso
  [ ] Login funcional
  [ ] Rutas con guards funcionales
  [ ] /acceso-denegado funcional
  [ ] PrimeNG visualmente correcto

FASE 6 — Merge
  [ ] Commit descriptivo
  [ ] Push y merge a main
```

---

**Tiempo estimado de ejecución:** 2–4 horas (según disponibilidad de PrimeNG v21)
**Responsable sugerido:** Desarrollador con conocimiento de Angular y acceso al entorno de desarrollo
