# Plan de Mejoras — rund-mgp

**Proyecto:** rund-mgp (Frontend Angular 20 SSR — RUND ESAP Colombia)
**Elaborado:** 2026-02-21
**Basado en:** Informe de calidad rund-mgp v1.0 (puntuación global: 4.65/10)
**Alcance:** Seguridad · Dependencias · Optimización · Testing · Funcionalidad · Refactorización

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Inventario Consolidado de Mejoras](#2-inventario-consolidado-de-mejoras)
3. [Roadmap por Sprints](#3-roadmap-por-sprints)
4. [Criterios de Éxito Globales](#4-criterios-de-éxito-globales)
5. [Gestión de Riesgos](#5-gestión-de-riesgos)
6. [Dependencias entre Ítems](#6-dependencias-entre-ítems)
7. [Referencias a Secciones Detalladas](#7-referencias-a-secciones-detalladas)

---

## 1. Resumen Ejecutivo

El informe de calidad identificó **cinco áreas de mejora** en rund-mgp. Este plan sintetiza un total de **27 ítems accionables** organizados en tres sprints progresivos, con un esfuerzo total estimado de **~60 horas de desarrollo**.

### Puntuación actual vs. objetivo

| Dimensión | Actual | Objetivo Sprint 1 | Objetivo Final |
|-----------|--------|-------------------|----------------|
| **Seguridad** | 3.5 / 10 | 7.0 / 10 | 8.5 / 10 |
| **Dependencias** | 4.0 / 10 | 7.5 / 10 | 9.0 / 10 |
| **Optimización** | 5.0 / 10 | 6.5 / 10 | 8.0 / 10 |
| **Funcionalidad** | 6.0 / 10 | 7.5 / 10 | 8.5 / 10 |
| **Usabilidad** | 6.0 / 10 | 6.5 / 10 | 8.0 / 10 |
| **Global** | **4.65 / 10** | **7.0 / 10** | **8.5 / 10** |

### Hallazgos críticos que requieren acción inmediata

| Prioridad | Hallazgo | Impacto |
|-----------|----------|---------|
| 🔴 CRÍTICO | Ninguna ruta tiene `canActivate` — sistema completamente desprotegido | Acceso sin autenticación a todos los módulos |
| 🔴 CRÍTICO | Angular 20.3.15 con CVE XSS (GHSA-jrmj-c5cx-3cw6) | XSS en producción |
| 🟠 ALTO | `SafePipe` incluye `bypassSecurityTrustScript` sin validación | Ejecución de scripts arbitrarios |
| 🟠 ALTO | 49 vulnerabilidades npm (41 high), incluida Quill XSS | Vector de ataque adicional |
| 🟡 MEDIO | Botón "Login de Desarrollo" visible en producción | Acceso sin contraseña si backend mal configurado |

---

## 2. Inventario Consolidado de Mejoras

### 2.1 Seguridad (Sección 1)

| ID | Ítem | Prioridad | Esfuerzo | Sprint |
|----|------|-----------|----------|--------|
| S-01 | Implementar componente `/acceso-denegado` (prerequisito de S-02) | 🔴 CRÍTICO | 2h | 1 |
| S-02 | Aplicar `authGuard` y `adminGuard` en `app.routes.ts` | 🔴 CRÍTICO | 1h | 1 |
| S-03 | Actualizar Angular a >=20.3.16 (CVE XSS GHSA-jrmj-c5cx-3cw6) | 🔴 CRÍTICO | 2h | 1 |
| S-04 | Refactorizar `SafePipe`: eliminar `bypassSecurityTrustScript`, crear `SafeResourceUrlPipe` | 🟠 ALTO | 4h | 1 |
| S-05 | Condicionar botón y método `loginDev()` al entorno | 🟡 MEDIO | 1h | 1 |
| S-06 | Mejorar determinación de roles: eliminar lógica basada en email | 🟡 MEDIO | 3h | 3* |
| S-07 | Limpiar `angular.json`: eliminar analytics UUID, unificar lockfile | 🟢 BAJO | 30min | 1 |

> \* S-06 depende de coordinación con el equipo de backend (rund-auth debe exponer `rol` en el JWT)

### 2.2 Dependencias y Optimización (Sección 2)

| ID | Ítem | Prioridad | Esfuerzo | Sprint |
|----|------|-----------|----------|--------|
| D-01 | Corregir mismatch `@primeng/themes@19` vs `primeng@20` | 🟠 ALTO | 30min | 1 |
| D-02 | Estrategia para Quill XSS (GHSA-v3m3-f69x-jf25): actualizar o mitigar con CSP | 🟠 ALTO | 1h | 1 |
| D-03 | Eliminar `yarn.lock`, unificar gestor a npm | 🟡 MEDIO | 30min | 1 |
| D-04 | Configurar `npm audit` automático en CI/CD (GitHub Actions) | 🟡 MEDIO | 1h | 2 |
| O-01 | Lazy loading con `loadComponent()` para las 7 rutas | 🟠 ALTO | 3h | 1 |
| O-02 | Corregir `app.routes.server.ts`: RenderMode por ruta (Prerender/Server/Client) | 🟠 ALTO | 1h | 1 |
| O-03 | Refactorizar `data.ts init()`: reemplazar subscribes anidados por `forkJoin` | 🟡 MEDIO | 2h | 2 |
| O-04 | Proteger `getChartBackgroundColors()` y `document.documentElement` con `isPlatformBrowser` | 🟡 MEDIO | 1h | 2 |
| O-05 | Corregir `loadDocumentos()`: agregar `reject()` en caso de error | 🟢 BAJO | 1h | 2 |
| O-06 | Ajustar budgets de bundle: de 2MB/5MB a 500kB/1MB (gradual, post lazy-loading) | 🟢 BAJO | 30min | 2 |
| O-07 | Eliminar `ChangeDetectorRef.detectChanges()` innecesarios (20 archivos) | 🟢 BAJO | 1h | 2 |

### 2.3 Testing, Funcionalidad y Refactorización (Sección 3)

| ID | Ítem | Prioridad | Esfuerzo | Sprint |
|----|------|-----------|----------|--------|
| T-01 | Configurar testing: desactivar `skipTests`, karma con cobertura | 🟠 ALTO | 30min | 1 |
| T-02 | Suite de tests para `Auth` (15 casos: login, logout, sesión, signals) | 🟠 ALTO | 8h | 2 |
| T-03 | Tests para `ConfigService` (carga exitosa, fallback, idempotencia) | 🟡 MEDIO | 4h | 2 |
| T-04 | Tests para `authGuard` y `adminGuard` (síncronos y asíncronos) | 🟡 MEDIO | 4h | 2 |
| T-05 | Tests para `authInterceptor` (withCredentials, 401, 403) | 🟡 MEDIO | 3h | 3 |
| T-06 | Tests para `SafePipe` (5 tipos de bypass + tipo inválido) | 🟢 BAJO | 2h | 3 |
| T-07 | Meta de cobertura ≥70% + integración en pipeline CI/CD | 🟡 MEDIO | 1h | 3 |
| F-01 | Activar Dashboard y Consultas en menú de navegación | 🟡 MEDIO | 1h | 1 |
| F-02 | Eliminar código muerto: `getAuth()` deprecado, `return` duplicado en `suficientesNodos()` | 🟢 BAJO | 30min | 1 |
| R-01 | Extraer interfaces a `data-types.ts` y crear `CategoriaService` y `MenuService` | 🟡 MEDIO | 16h | 3 |
| R-02 | Configurar ESLint + Angular ESLint (reglas: no-console, no-unreachable, no-any) | 🟢 BAJO | 2h | 3 |
| R-03 | Reemplazar `console.log/warn` por `LoggerService` (supresión en producción) | 🟢 BAJO | 1h | 3 |

---

## 3. Roadmap por Sprints

### Sprint 1 — Seguridad y Correcciones Críticas

**Duración:** 5 días hábiles · **Esfuerzo total:** ~18 horas

**Objetivo:** Llevar el sistema de un estado desprotegido a uno con protección básica funcional. Al final del sprint, ninguna ruta estará accesible sin autenticación, Angular estará actualizado y el bundle será eficiente.

**Orden recomendado de implementación:**

```
Día 1 (mañana):
  S-01  Crear componente AccesoDenegado           2h   ← prerequisito de S-02
  S-02  Aplicar guards en app.routes.ts           1h   ← depende de S-01

Día 1 (tarde):
  S-03  Actualizar Angular 20.3.16               2h
  D-01  Corregir mismatch @primeng/themes        30min

Día 2:
  S-04  Refactorizar SafePipe                    4h

Día 3 (mañana):
  S-05  Condicionar loginDev al entorno           1h
  S-07  Limpiar angular.json (analytics + lock)  30min
  D-03  Eliminar yarn.lock                       30min

Día 3 (tarde):
  D-02  Estrategia Quill XSS                     1h

Día 4:
  O-01  Lazy loading para 7 rutas                3h
  O-02  Corregir RenderMode SSR                  1h

Día 5:
  T-01  Configurar testing (skipTests, karma)    30min
  F-01  Activar Dashboard y Consultas en menú    1h
  F-02  Eliminar código muerto                   30min
```

**Entregables del Sprint 1:**
- Todas las rutas protegidas con guard apropiado
- Angular actualizado a ≥20.3.16 sin CVE activas en producción
- `SafePipe` sin `bypassSecurityTrustScript`, nuevo `SafeResourceUrlPipe` validando origen
- Componente `/acceso-denegado` funcional
- Lazy loading activo (bundle inicial reducido ≥30%)
- SSR con RenderMode correcto por tipo de ruta
- `npm audit --omit=dev` sin vulnerabilidades HIGH/CRITICAL

---

### Sprint 2 — Testing, Estabilidad y Calidad de Código

**Duración:** 5 días hábiles · **Esfuerzo total:** ~21.5 horas

**Objetivo:** Establecer la red de seguridad de tests sobre los servicios críticos. Corregir los antipatrones reactivos en `data.ts`. Configurar la auditoría continua de dependencias.

**Ítems del Sprint 2:**

```
Día 6-7:
  T-02  Tests Auth Service (15 casos)            8h   ← core de la capa de seguridad

Día 8:
  T-03  Tests ConfigService                      4h

Día 9:
  T-04  Tests authGuard + adminGuard             4h
  D-04  npm audit en CI/CD (GitHub Actions)      1h

Día 10:
  O-03  Refactorizar data.ts init() con forkJoin 2h
  O-04  SSR-Safety en charts (isPlatformBrowser) 1h
  O-05  Corregir loadDocumentos() con reject()   1h
  O-06  Ajustar budgets bundle                   30min
  O-07  Eliminar detectChanges innecesarios       1h
```

**Entregables del Sprint 2:**
- Cobertura de tests en `auth.ts`, `config.service.ts`, `auth-guard.ts` ≥80%
- `npm audit` integrado en pipeline, bloqueando en HIGH de producción
- `data.ts init()` sin subscribes anidados, usando `forkJoin`
- SSR sin errores de `document.documentElement` en servidor
- `loadDocumentos()` con manejo correcto de errores

---

### Sprint 3 — Refactorización y Calidad Avanzada

**Duración:** 8 días hábiles · **Esfuerzo total:** ~29 horas

**Objetivo:** Reducir la deuda técnica estructural. Completar la cobertura de tests. Establecer herramientas de calidad continua (ESLint, logging). Descomponer el monolito `data.ts`.

**Nota:** R-01 (División de `Data`) requiere 16 horas y debe tratarse como sub-sprint independiente dentro del Sprint 3, con iteraciones diarias de 4h para minimizar el riesgo de regresión.

**Ítems del Sprint 3:**

```
Día 11:
  T-05  Tests authInterceptor                    3h
  T-06  Tests SafePipe                           2h

Día 12:
  T-07  Meta cobertura + CI/CD pipeline tests    1h
  R-02  Configurar ESLint + Angular ESLint        2h
  R-03  LoggerService (reemplazar console.log)   1h
  S-06  Mejorar roles (coord. backend)*          3h   ← si backend listo

Día 13-16: (sub-sprint R-01)
  R-01  División Data.ts en servicios esp.       16h
        ├── Día 13: Extraer data-types.ts (4h)
        ├── Día 14: Crear CategoriaService (4h)
        ├── Día 15: Crear MenuService + DocumentoService (4h)
        └── Día 16: Tests + integración fachada Data (4h)
```

**Entregables del Sprint 3:**
- Tests de `authInterceptor` y `SafePipe` completados
- Cobertura global ≥70% en statements/functions
- ESLint configurado y pipeline de lint activo
- `LoggerService` sustituyendo todos los `console.log` informativos
- `data-types.ts` con todas las interfaces, `CategoriaService` y `MenuService` funcionales
- `data.ts` reducido en ≥200 líneas, manteniendo retrocompatibilidad

---

## 4. Criterios de Éxito Globales

### Al finalizar Sprint 1

- [ ] `npm audit --audit-level=high --omit=dev` retorna 0 vulnerabilidades
- [ ] Navegar a `/listados` sin sesión redirige a `/login?returnUrl=%2Flistados`
- [ ] Navegar a `/gestion` con rol `usuario` redirige a `/acceso-denegado` (componente funcional)
- [ ] `grep -rn bypassSecurityTrustScript src/` retorna 0 resultados
- [ ] `node -e "require('./node_modules/@angular/core/package.json').version"` ≥ 20.3.16
- [ ] `npm run build` genera chunks lazy visibles (min. 7 chunks de rutas)
- [ ] El botón "Login de Desarrollo" no aparece en el DOM con `environment: 'production'`

### Al finalizar Sprint 2

- [ ] `ng test --watch=false` ejecuta con ≥30 specs pasando
- [ ] Cobertura `auth.ts` ≥ 85%, `config.service.ts` ≥ 90%, `auth-guard.ts` ≥ 90%
- [ ] El workflow de GitHub Actions ejecuta `npm audit` en cada PR
- [ ] `npm run build && node dist/rund-mgp/server/server.mjs` inicia sin errores de `document`
- [ ] `loadDocumentos()` rechaza la promesa ante error HTTP (verificar con mock 500)

### Al finalizar Sprint 3

- [ ] `ng lint` pasa sin errores (máximo warnings en `no-explicit-any`)
- [ ] Cobertura global ≥ 70% en statements, 60% en branches
- [ ] `data.ts` ≤ 300 líneas (actualmente 519)
- [ ] `CategoriaService` y `MenuService` tienen tests propios con ≥80% cobertura
- [ ] Todos los `console.log` informativos suprimidos en modo producción
- [ ] Puntuación estimada del proyecto: ≥ 8.5 / 10

---

## 5. Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **S-06 bloqueado por backend**: rund-auth no expone `rol` a tiempo | Alta | Medio | Envolver lógica de email en condición de entorno temporalmente |
| **Regresión visual en PrimeNG** al actualizar `@primeng/themes` | Media | Medio | Verificar manualmente tema Aura en 5 componentes clave post-actualización |
| **Quill sin fix disponible** en npm (CVE sin patch) | Media | Alto | Aplicar CSP estricto en `server.ts` como mitigación inmediata; evaluar migración a TipTap |
| **Ruptura SSR** al cambiar `RenderMode` | Baja | Alto | Verificar con `curl http://localhost:4000/login` que el HTML prerenderizado contiene contenido |
| **Lazy loading rompe imports** con aliases de tsconfig | Media | Medio | Hacer `ng build --dry-run` antes de commitear; verificar aliases en `tsconfig.app.json` |
| **R-01 genera regresión** en componentes que usan `Data` | Media | Alto | Migrar incrementalmente (4h/día); hacer `ng build` tras cada sub-tarea; no cambiar la API pública de `Data` |
| **Eliminación de detectChanges** rompe UI en componentes con estado mutable | Media | Medio | Eliminar uno por uno, verificar visualmente; convertir estado a signals si el componente no actualiza |

---

## 6. Dependencias entre Ítems

```
S-01 (AccesoDenegado) ──────────┬──→ S-02 (guards en rutas)
                                └──→ T-04 (tests adminGuard)

S-03 (Angular update) ──────────→ D-01 (@primeng/themes)

O-01 (lazy loading) ────────────→ O-06 (ajuste budgets)

T-01 (config testing) ──────────→ T-02 → T-03 → T-04 → T-05 → T-06

R-01 (dividir Data) ────────────depende de→ T-03 (ConfigService tests OK)
                                           (para no romper servicios que usa ConfigService)

S-06 (mejora roles) ────────────depende de→ Coordinación con equipo rund-auth
                                           (rund-auth debe exponer campo 'rol')

R-02 (ESLint) ──────────────────→ R-03 (eliminar console.log — ESLint lo detecta)
                                └──→ F-02 (return duplicado — ESLint no-unreachable lo valida)
```

---

## 7. Referencias a Secciones Detalladas

Este documento es el resumen ejecutivo y roadmap del plan de mejoras. Los detalles técnicos de implementación (código, criterios de aceptación, breaking changes, comandos exactos) se encuentran en los siguientes documentos:

| Sección | Documento | Contenido |
|---------|-----------|-----------|
| **Sección 1** | `docs/plan-mejoras-seccion-seguridad.md` | Guards (S-01/S-02), Angular update (S-03), SafePipe (S-04), loginDev (S-05), roles (S-06), angular.json (S-07) |
| **Sección 2** | `docs/plan-mejoras-seccion-dependencias-optimizacion.md` | Actualizaciones npm (D-01/D-02/D-03/D-04), lazy loading (O-01), RenderMode (O-02), refactorización reactiva (O-03/O-04/O-05/O-06/O-07) |
| **Sección 3** | `docs/plan-mejoras-seccion-testing-funcionalidad.md` | Tests completos (T-01 a T-07), componentes funcionales (F-01/F-02), refactorización Data (R-01/R-02/R-03) |
| **Informe base** | `docs/informe-calidad-rund-mgp.md` | Diagnóstico completo con puntuaciones por área |

---

## Apéndice: Resumen de Esfuerzo por Sprint

| Sprint | Ítems | Horas | Valor entregado |
|--------|-------|-------|-----------------|
| Sprint 1 | 14 ítems | ~18h | Seguridad funcional, CVEs resueltos, bundle optimizado |
| Sprint 2 | 9 ítems | ~21.5h | Red de seguridad de tests, estabilidad SSR, CI/CD |
| Sprint 3 | 9 ítems | ~29h | Calidad estructural, deuda técnica resuelta |
| **TOTAL** | **27 ítems** | **~68.5h** | **Puntuación estimada: 8.5/10** |

> **Nota sobre el esfuerzo total**: Los ítems S-03 y D-01/D-02 del Sprint 1 coordinan la actualización de Angular y dependencias en un solo proceso. El ítem S-01 (AccesoDenegado) aparece en Sección 1 y Sección 3; se cuenta una sola vez (2h). El total neto después de eliminar solapamientos es aproximadamente 60-65 horas efectivas de desarrollo.

---

*Plan de mejoras elaborado el 2026-02-21 — Versión 1.0*
*Basado en revisión de código fuente rund-mgp v20.3.15 (Angular 20.3.15)*
*Elaborado con metodología de análisis paralelo (3 agentes especializados + síntesis de lead)*
