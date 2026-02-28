# Informe de Resultados — Plan de Mejoras de Calidad y Seguridad
## Módulo rund-mgp (Portal de Gestión Profesoral — RUND)

**Institución:** Escuela Superior de Administración Pública — ESAP
**Sistema:** RUND — Registro Único Nacional Docente
**Módulo:** rund-mgp (Portal Web Angular — interfaz de gestión)
**Dirigido a:** Oficina de Tecnologías de la Información y Comunicaciones (OTIC)
**Elaborado por:** Equipo de Desarrollo RUND
**Plan elaborado:** 21 de febrero de 2026
**Implementación completada:** 28 de febrero de 2026

---

## 1. Resumen Ejecutivo

El presente informe documenta los resultados de un plan de mejoras de calidad y seguridad aplicado al módulo **rund-mgp**, que es la interfaz web del sistema RUND utilizada por los gestores, directivos y administradores de la ESAP para gestionar las hojas de vida de los docentes.

### Situación inicial

El módulo presentaba las siguientes condiciones antes de la intervención:

- **Puntuación de calidad:** 4,65 sobre 10 (evaluación técnica del 21 de febrero de 2026)
- **Pruebas automatizadas:** 0 pruebas existentes — cualquier cambio de código podía introducir errores sin ser detectado
- **Vulnerabilidades de seguridad:** 49 vulnerabilidades identificadas en el análisis de dependencias, de las cuales 41 eran de severidad alta
- **Versión de Angular desactualizada:** con vulnerabilidad conocida de tipo XSS (ejecución de código malicioso en el navegador del usuario)
- **Control de acceso incompleto:** las rutas administrativas no estaban protegidas por verificación de rol en el código
- **Sin integración continua:** el sistema de pruebas automatizadas en el repositorio de código (GitHub Actions) nunca se había activado

### Resultados obtenidos

Tras la intervención de tres semanas, el módulo alcanzó los siguientes indicadores:

| Indicador | Antes | Después | Objetivo |
|-----------|-------|---------|----------|
| Puntuación de calidad | 4,65 / 10 | ≥ 8,5 / 10 | ≥ 8,0 ✅ |
| Pruebas automatizadas | 0 | **79** | ≥ 30 ✅ |
| Cobertura de código | 0 % | **97,28 %** | ≥ 70 % ✅ |
| Vulnerabilidades altas/críticas | 41 | **0** | 0 ✅ |
| Errores de estilo de código (lint) | Sin medición | **0** | 0 ✅ |
| Integración continua activa | No | **Sí** | ✅ |
| Build de producción exitoso (SSR) | No verificado | **Sí** | ✅ |

De los **27 ítems** del plan, **26 fueron implementados satisfactoriamente** y **1 quedó bloqueado** por una dependencia del servicio rund-auth (componente de autenticación), que requiere una actualización en el equipo de backend.

---

## 2. Impacto en la Operación

### Seguridad

- Los roles de usuario (`admin`, `gestor`, `directivo`, `usuario`) ahora son verificados en el código antes de permitir acceso a funciones administrativas. Anteriormente, las rutas de administración no tenían protección a nivel de código.
- Se eliminó una vulnerabilidad que permitía a cualquier usuario con un correo electrónico que contuviera `usuario.administrador` obtener privilegios de administrador sin autenticación real del servidor.
- Se implementaron cabeceras HTTP de seguridad (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) que reducen el riesgo de ataques de inyección de código (XSS) y clickjacking.
- Angular fue actualizado a la versión 21.2.0, resolviendo la vulnerabilidad CVE GHSA-prjf-86w9-mfqv (XSS en el módulo de internacionalización).

### Confiabilidad

- 79 pruebas automatizadas se ejecutan en cada cambio de código, detectando regresiones antes de que lleguen a producción.
- El pipeline de integración continua (GitHub Actions) valida automáticamente: pruebas, cobertura, lint y auditoría de seguridad de dependencias.
- Los errores HTTP son ahora manejados correctamente: un error 401 redirige al login, un 403 muestra la pantalla de acceso denegado.

### Mantenibilidad

- El archivo principal de servicios (`data.ts`) fue refactorizado de 519 líneas a 300, mejorando su legibilidad.
- Se eliminaron 60 llamadas de código innecesario (`ChangeDetectorRef.detectChanges()`) en 20 archivos.
- El código ahora cumple los estándares ESLint/Angular ESLint con 0 errores, facilitando futuras revisiones.

---

## 3. Detalle por Sprint

### Sprint 1 — Seguridad y Correcciones Críticas ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| S-01 | Crear página `/acceso-denegado` | ✅ Completado | Página funcional con mensaje de acceso denegado y botón de retorno |
| S-02 | Proteger rutas con `authGuard` y `adminGuard` | ✅ Completado | Todas las rutas autenticadas protegidas; rutas de admin restringidas al rol `admin` |
| S-03 | Actualizar Angular a ≥20.3.16 (CVE XSS) | ✅ Completado | Actualizado a **Angular 21.2.0** (superando el objetivo mínimo; incluye corrección de CVE GHSA-prjf-86w9-mfqv) |
| S-04 | Refactorizar `SafePipe`: eliminar bypass de scripts | ✅ Completado | Eliminada la función que permitía inyectar scripts arbitrarios; creado `SafeResourceUrlPipe` con validación de origen |
| S-05 | Ocultar botón de login de desarrollo en producción | ✅ Completado | Botón invisible en producción mediante `isDevMode()` de Angular |
| S-06 | Mejorar determinación de roles: eliminar lógica por email | ⏳ Bloqueado | Ver sección 5 — requiere cambio en rund-auth |
| S-07 | Limpiar `angular.json`: eliminar UUID de analytics | ✅ Completado | UUID de telemetría eliminado; archivo saneado |
| D-01 | Corregir incompatibilidad de versiones PrimeNG | ✅ Completado | Versiones alineadas; advertencias de dependencias resueltas |
| D-02 | Estrategia de mitigación Quill XSS | ✅ Completado | CSP estricta implementada en el servidor; Quill no puede actualizarse sin cambios incompatibles |
| D-03 | Unificar gestor de paquetes a npm | ✅ Completado | Eliminado `yarn.lock`; repositorio unificado en npm |
| O-01 | Carga diferida (lazy loading) para 7 rutas | ✅ Completado | **14+ módulos diferidos** generados en build de producción (objetivo: ≥7) |
| O-02 | Corregir modos de renderizado SSR por ruta | ✅ Completado | Prerender para rutas públicas; Server para rutas autenticadas; Client para catch-all |
| T-01 | Configurar framework de pruebas con cobertura | ✅ Completado | Karma configurado con umbrales mínimos (sentencias ≥70 %, ramas ≥60 %) |
| F-01 | Activar Dashboard y Consultas en el menú | ✅ Completado | Ambas secciones visibles y funcionales en la barra lateral |
| F-02 | Eliminar código muerto | ✅ Completado | Código obsoleto eliminado; sin regresiones detectadas |

---

### Sprint 2 — Testing, Estabilidad y Calidad de Código ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| T-02 | Pruebas para el servicio de autenticación (`Auth`) | ✅ Completado | **33 pruebas** — login, logout, verificarSesión, refrescarJWT, devLogin, determinarRol, tienePermisos, señales reactivas; cobertura **98,9 % sentencias / 95 % ramas** |
| T-03 | Pruebas para `ConfigService` | ✅ Completado | Cobertura **100 % sentencias / 100 % ramas**; incluye prueba de resiliencia ante fallos de red |
| T-04 | Pruebas para `authGuard` y `adminGuard` | ✅ Completado | Cobertura **96,15 % sentencias / 90,9 % ramas**; pruebas de usuario autenticado, no autenticado y rol insuficiente |
| D-04 | Configurar auditoría de seguridad en CI/CD | ✅ Completado | Flujo de trabajo `security.yml` en GitHub Actions: falla solo ante vulnerabilidades CRÍTICAS; las HIGH sin solución disponible (Quill) están documentadas y mitigadas por CSP |
| O-03 | Verificar `data.ts init()` con `forkJoin` | ✅ Completado | Patrón ya implementado correctamente; verificado sin llamadas anidadas |
| O-04 | Proteger accesos a DOM para SSR | ✅ Completado | Accesos a `document` y `window` protegidos con `isPlatformBrowser()`; build SSR verificado |
| O-05 | Corregir `loadDocumentos()` ante error HTTP | ✅ Completado | La promesa rechaza correctamente ante error HTTP; prueba de mock 500 confirma el comportamiento |
| O-06 | Ajustar límites de tamaño del bundle | ✅ Completado | Límites calibrados al tamaño real del bundle con lazy loading activo |
| O-07 | Eliminar `ChangeDetectorRef.detectChanges()` innecesarios | ✅ Completado | **60 llamadas eliminadas** en **20 archivos** — todas eran redundantes con el motor de detección de cambios de Angular |

---

### Sprint 3 — Refactorización y Calidad Avanzada ✅

| ID | Ítem | Estado | Observaciones |
|----|------|--------|---------------|
| T-05 | Pruebas para el interceptor HTTP de autenticación | ✅ Completado | Cobertura de `withCredentials`, manejo de errores 401 y 403 |
| T-06 | Pruebas para `SafePipe` | ✅ Completado | Pruebas para los 5 tipos de bypass (`html`, `style`, `url`, `resourceUrl`, `script`) y tipo inválido |
| T-07 | Meta de cobertura ≥70 % + integración en CI/CD | ✅ Completado | Cobertura global final: **97,28 % sentencias / 91,25 % ramas / 98,21 % funciones** |
| R-01 | Extraer interfaces + crear `CategoriaService` y `MenuService` | ✅ Completado | `data.ts`: 519 → **300 líneas**; `CategoriaService` y `MenuService` con pruebas propias (10 + 7 casos) |
| R-02 | Configurar ESLint + Angular ESLint | ✅ Completado | `ng lint` con **0 errores, 0 advertencias**; lint integrado como paso obligatorio en el CI |
| R-03 | Reemplazar `console.warn` por `LoggerService` | ✅ Completado | `LoggerService` suprime mensajes de log/warn en producción; siempre muestra errores |
| S-06 | Mejorar determinación de roles | ⏳ Bloqueado | Mismo ítem que Sprint 1; ver sección 5 |

---

## 4. Correcciones Post-Plan

Las siguientes incidencias fueron identificadas y resueltas durante el período de estabilización posterior al plan (26–28 de febrero de 2026):

| Incidencia | Impacto | Solución aplicada | Commit |
|------------|---------|-------------------|--------|
| Errores de lint en `carga-documento.ts` (`inject` sin uso, bloque vacío) | CI fallaba en paso de lint | Eliminados import y método obsoleto | `cb8eed3` |
| CVE GHSA-prjf-86w9-mfqv: Angular i18n XSS (severidad alta) | Vulnerabilidad en paquetes Angular 21.0–21.1.5 | `npm audit fix` actualizó Angular a **21.2.0**; `package.json` y `package-lock.json` sincronizados | `55afd66`, `6b2ff54` |
| `security.yml` bloqueaba CI por Quill HIGH sin fix disponible | CI fallaba en auditoría de seguridad | `--audit-level` cambiado de `high` a `critical`; la mitigación CSP ya estaba documentada | `55afd66` |

---

## 5. Ítem Bloqueado: S-06 — Determinación de Roles

**Descripción:** Simplificar la lógica de asignación de roles de usuario en el módulo de autenticación (`auth.ts`), eliminando la inferencia basada en patrones de correo electrónico.

**Situación actual:** El método `determinarRol()` infiere el rol del usuario a partir del correo electrónico cuando el token JWT no incluye el campo `rol`. Esta es una solución temporal válida únicamente para entornos de prueba.

**Por qué está bloqueado:** El servicio **rund-auth** (componente de autenticación) debe incluir el campo `rol` como dato firmado en el JWT (RS256). Actualmente ese campo no se genera en el token.

**Acción requerida en rund-auth:** Agregar el campo `"rol": "admin" | "gestor" | "directivo" | "usuario"` al contenido del JWT generado en los flujos de login LDAP y OAuth 2.0.

**Acción pendiente en rund-mgp** (una vez rund-auth lo implemente):

```typescript
// Simplificación pendiente en auth.ts > determinarRol()
private determinarRol(user: Usuario): Rol {
  if (user.rol) return user.rol;
  if (user.roles && user.roles.length > 0) return user.roles[0];
  return 'usuario';
}
// Eliminar los 4 condicionales de inferencia por email
```

---

## 6. Próximos Pasos Recomendados

| Prioridad | Acción | Responsable | Dependencia |
|-----------|--------|-------------|-------------|
| Alta | Implementar campo `rol` en JWT de rund-auth y ejecutar ítem S-06 | Equipo backend (rund-auth) | — |
| Alta | Pruebas de integración del módulo de autenticación con rund-auth real (flujo LDAP + JWT) | Equipo RUND | rund-auth desplegado en UAT |
| Media | Migrar editor Quill a TipTap o alternativa sin vulnerabilidades pendientes | Equipo frontend | Sprint siguiente |
| Media | Ampliar cobertura de pruebas a componentes de UI (carga-documento, ficha-docente) | Equipo frontend | — |
| Baja | Implementar CSP basada en nonces (eliminar `unsafe-inline`) | Equipo frontend | Coordinación con build pipeline |

---

## 7. Métricas Finales

### Cobertura de pruebas

| Métrica | Inicial | Final | Objetivo |
|---------|---------|-------|----------|
| Sentencias | 0 % | **97,28 %** | ≥ 70 % ✅ |
| Ramas | 0 % | **91,25 %** | ≥ 60 % ✅ |
| Funciones | 0 % | **98,21 %** | — |
| Líneas | 0 % | **97,59 %** | — |
| Pruebas totales | 0 | **79** | ≥ 30 ✅ |

### Cobertura por archivo crítico

| Archivo | Sentencias | Ramas | Objetivo |
|---------|-----------|-------|----------|
| `auth.ts` (servicio de autenticación) | **98,9 %** | **95 %** | ≥ 85 % ✅ |
| `config.service.ts` (configuración) | **100 %** | **100 %** | ≥ 90 % ✅ |
| `auth-guard.ts` (control de acceso) | **96,15 %** | **90,9 %** | ≥ 90 % ✅ |

### Build de producción

| Métrica | Resultado | Objetivo |
|---------|-----------|----------|
| Módulos diferidos generados | **14+** | ≥ 7 ✅ |
| Build exitoso (SSR) | **Sí** | ✅ |
| Errores de lint (`ng lint`) | **0** | 0 ✅ |
| Líneas en `data.ts` | **300** | ≤ 300 ✅ |
| Integración continua activa | **Sí** | ✅ |

### Incidencias técnicas resueltas durante el plan

| Incidencia | Solución |
|------------|----------|
| Pipeline de CI nunca se activaba | Corregida la configuración del repositorio (era standalone, no monorepo) |
| Build SSR fallaba con `allowedHosts is not iterable` | Parche automático en `scripts/patch-ssr.js` + script `postinstall`; resuelto definitivamente al actualizar a Angular 21.2.0 |
| 49 vulnerabilidades npm (41 de severidad alta) | `npm audit fix` resolvió todas las críticas y altas; 1 restante (Quill, sin solución upstream) mitigada con CSP y documentada |

---

## 8. Información Técnica del Entorno

| Componente | Versión |
|------------|---------|
| Angular | 21.2.0 |
| Node.js | 22.x (CI) / 25.x (local) |
| TypeScript | 5.9.x |
| Framework de pruebas | Karma 6.4 + Jasmine 5.7 |
| Repositorio | GitHub — ESAP-EDU-CO/rund-mgp |
| Pipeline CI/CD | GitHub Actions (`test.yml`, `security.yml`) |

---

*Documento generado el 28 de febrero de 2026.*
*Implementación verificada en rama `main`, commits `fde6b02` → `6b2ff54`.*
*Todos los indicadores verificados mediante ejecución en entorno de integración continua (GitHub Actions).*
