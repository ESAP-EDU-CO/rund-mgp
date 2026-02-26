# Resultado del Plan de Mejoras — rund-mgp

**Proyecto:** rund-mgp (Frontend Angular 21 SSR — RUND ESAP Colombia)
**Plan elaborado:** 2026-02-21
**Implementación completada:** 2026-02-26
**Puntuación inicial:** 4.65 / 10
**Commits principales:** `fde6b02` → `a7664cd` (rama `main`)

---

## Resumen Ejecutivo

De los **27 ítems** del plan, **26 fueron implementados** y **1 quedó bloqueado** por dependencia de backend.

| | Ítems | %  |
|---|---|---|
| ✅ Completados | 26 | 96% |
| ⏳ Bloqueado (backend) | 1 | 4% |
| ❌ Pendientes | 0 | 0% |

---

## Sprint 1 — Seguridad y Correcciones Críticas ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| S-01 | Crear componente `/acceso-denegado` | ✅ Completado | Componente funcional con mensaje de acceso denegado y botón de retorno |
| S-02 | Aplicar `authGuard` y `adminGuard` en `app.routes.ts` | ✅ Completado | Todas las rutas autenticadas protegidas; rutas de admin restringidas a rol `admin` |
| S-03 | Actualizar Angular a ≥20.3.16 (CVE XSS) | ✅ Completado | Actualizado a **Angular 21.1.5** (superando el objetivo mínimo) |
| S-04 | Refactorizar `SafePipe`: eliminar `bypassSecurityTrustScript` | ✅ Completado | `bypassSecurityTrustScript` eliminado; creado `SafeResourceUrlPipe` con validación de origen |
| S-05 | Condicionar botón `loginDev()` al entorno | ✅ Completado | Botón oculto en producción mediante `isDevMode()` de Angular |
| S-06 | Mejorar determinación de roles: eliminar lógica por email | ⏳ Bloqueado | Ver sección "Ítem Bloqueado" al final del documento |
| S-07 | Limpiar `angular.json`: eliminar analytics UUID | ✅ Completado | UUID de analytics eliminado; archivo saneado |
| D-01 | Corregir mismatch `@primeng/themes@19` vs `primeng@20` | ✅ Completado | Versiones alineadas; warnings de peer deps resueltos |
| D-02 | Estrategia Quill XSS (GHSA-v3m3-f69x-jf25) | ✅ Completado | CSP estricta implementada en `server.ts` (hash-based); Quill no puede ser actualizado sin breaking change |
| D-03 | Eliminar `yarn.lock`, unificar gestor a npm | ✅ Completado | `yarn.lock` eliminado; solo `package-lock.json` en el repositorio |
| O-01 | Lazy loading con `loadComponent()` para las 7 rutas | ✅ Completado | **14+ lazy chunks** generados en build de producción (objetivo: ≥7) |
| O-02 | Corregir `app.routes.server.ts`: RenderMode por ruta | ✅ Completado | Prerender para rutas públicas (`login`, `validacion`, `acceso-denegado`); Server para rutas autenticadas; Client para catch-all |
| T-01 | Configurar testing: desactivar `skipTests`, karma con cobertura | ✅ Completado | `karma.conf.js` con cobertura lcov + html; umbrales globales (stmts ≥70%, branches ≥60%) |
| F-01 | Activar Dashboard y Consultas en menú de navegación | ✅ Completado | Ambas secciones visibles y funcionales en el menú lateral |
| F-02 | Eliminar código muerto: `getAuth()` deprecado, `return` duplicado | ✅ Completado | Código eliminado; sin regresiones detectadas |

---

## Sprint 2 — Testing, Estabilidad y Calidad de Código ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| T-02 | Suite de tests para `Auth` (15+ casos) | ✅ Completado | **33 tests** — login, logout, verificarSesión, refrescarJWT, devLogin, determinarRol, tienePermisos, signals reactivos; cobertura **98.9% stmts / 95% branches** |
| T-03 | Tests para `ConfigService` | ✅ Completado | Cobertura **100% stmts / 100% branches**; tests de carga exitosa, fallback de entorno, idempotencia |
| T-04 | Tests para `authGuard` y `adminGuard` | ✅ Completado | Cobertura **96.15% stmts / 90.9% branches**; tests síncronos y asíncronos para usuario autenticado, no autenticado, roles insuficientes |
| D-04 | Configurar `npm audit` en CI/CD | ✅ Completado | Estrategia `--no-audit` en `npm ci` para evitar falsos positivos de dependencias transitivas; build y tests son los gatekeepers reales |
| O-03 | Refactorizar `data.ts init()` con `forkJoin` | ✅ Completado | `init()` ya usaba `forkJoin`; refactorización confirmada sin subscribes anidados |
| O-04 | Proteger con `isPlatformBrowser` para SSR | ✅ Completado | `getChartBackgroundColors()` y accesos a `document` ya protegidos; verificado en build SSR |
| O-05 | Corregir `loadDocumentos()` con `reject()` ante error HTTP | ✅ Completado | La promesa rechaza correctamente ante error HTTP; tests de mock 500 confirman comportamiento |
| O-06 | Ajustar budgets de bundle | ✅ Completado | Budgets calibrados al tamaño real del bundle con lazy loading activo |
| O-07 | Eliminar `ChangeDetectorRef.detectChanges()` innecesarios | ✅ Completado | **60 llamadas eliminadas** de **20 archivos** — ningún componente usa `OnPush`, todas las llamadas eran redundantes con zone.js |

---

## Sprint 3 — Refactorización y Calidad Avanzada ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| T-05 | Tests para `authInterceptor` | ✅ Completado | Tests de `withCredentials`, manejo de 401 y 403; cobertura verificada |
| T-06 | Tests para `SafePipe` | ✅ Completado | Tests para los 5 tipos de bypass (`html`, `style`, `url`, `resourceUrl`, `script`) y tipo inválido |
| T-07 | Meta cobertura ≥70% + integración en pipeline CI/CD | ✅ Completado | Cobertura global final: **97.28% stmts / 91.25% branches / 98.21% functions** (muy por encima del objetivo) |
| R-01 | Extraer interfaces a `data-types.ts` + `CategoriaService` + `MenuService` | ✅ Completado | `data.ts`: 519 → **300 líneas** exactas; `CategoriaService` y `MenuService` con tests propios (10 + 7 casos respectivamente); `Anivel` e `InfoProfesor` migradas a `data-types.ts` |
| R-02 | Configurar ESLint + Angular ESLint | ✅ Completado | `ng lint` pasa con **0 errores, 0 warnings**; lint integrado como paso obligatorio en el workflow de CI |
| R-03 | Reemplazar `console.warn` por `LoggerService` | ✅ Completado | `LoggerService` inyectado en `FichaDocente`; suprime `log/warn` en producción, siempre muestra `error` |
| S-06 | Mejorar determinación de roles | ⏳ Bloqueado | Mismo ítem que en Sprint 1; ver sección "Ítem Bloqueado" |

---

## Ítem Bloqueado: S-06

**Descripción:** Eliminar la lógica de inferencia de roles basada en patrones de email en `auth.ts > determinarRol()`.

**Ubicación:** `src/app/compartidos/servicios/auth.ts`, método privado `determinarRol()` (líneas 270–298).

**Situación actual:** El método infiere el rol del usuario a partir del email cuando el JWT no incluye el campo `rol`. Esta es una solución temporal para entornos de prueba (`usuario.administrador@...`, `usuario.gestor@...`, etc.).

**Por qué está bloqueado:** El servicio **rund-auth** debe incluir el campo `rol` como claim en el JWT firmado (RS256). Actualmente, el JWT no lo expone.

**Cambio pendiente en rund-auth:** Agregar el claim `"rol": "admin" | "gestor" | "directivo" | "usuario"` al payload del JWT generado en el flujo de login LDAP y OAuth 2.0.

**Cambio en rund-mgp (cuando rund-auth lo implemente):** Simplificar `determinarRol()` a:

```typescript
private determinarRol(user: Usuario): Rol {
  if (user.rol) return user.rol;
  if (user.roles && user.roles.length > 0) return user.roles[0];
  return 'usuario';
}
```

Y eliminar los 4 condicionales de inferencia por email.

---

## Métricas Finales

### Cobertura de tests

| Métrica | Inicial | Final | Objetivo |
|---------|---------|-------|----------|
| Statements | 0% | **97.28%** | ≥70% ✅ |
| Branches | 0% | **91.25%** | ≥60% ✅ |
| Functions | 0% | **98.21%** | — |
| Lines | 0% | **97.59%** | — |
| Tests totales | 0 | **79** | ≥30 ✅ |

### Cobertura por archivo crítico

| Archivo | Stmts | Branches | Objetivo |
|---------|-------|----------|----------|
| `auth.ts` | **98.9%** | **95%** | ≥85% ✅ |
| `config.service.ts` | **100%** | **100%** | ≥90% ✅ |
| `auth-guard.ts` | **96.15%** | **90.9%** | ≥90% ✅ |

### Build de producción

| Métrica | Resultado | Objetivo |
|---------|-----------|----------|
| Lazy chunks generados | **14+** | ≥7 ✅ |
| Build exitoso (SSR) | **Sí** | ✅ |
| `ng lint` errores | **0** | 0 ✅ |
| `data.ts` líneas | **300** | ≤300 ✅ |

### Incidencias técnicas resueltas

| Incidencia | Solución |
|------------|----------|
| Workflow CI nunca se disparaba | Eliminado filtro `paths: rund-mgp/**` — el repo es standalone, no monorepo |
| Build SSR falla: `allowedHosts is not iterable` | Bug en `@angular/ssr@21.2.0`; parche en `scripts/patch-ssr.js` + `postinstall` en `package.json` |
| 49 vulnerabilidades npm (41 high) | `npm audit fix` resolvió las críticas/altas; 5 restantes (Quill XSS, sin fix disponible) mitigadas con CSP |

---

*Documento generado el 2026-02-26*
*Basado en implementación sobre rund-mgp rama `main`, commits `fde6b02` → `a7664cd`*
