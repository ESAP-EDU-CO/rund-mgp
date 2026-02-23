# Informe de Pruebas y Correcciones de Seguridad — rund-mgp

**Proyecto:** RUND Management Portal (rund-mgp)
**Versión:** Angular 21.1.5 / Node.js 25.6.1
**Fecha:** 23 de febrero de 2026
**Alcance:** Sprint 1 y Sprint 2 del Plan de Mejora de Calidad

---

## 1. Resumen Ejecutivo

Se ejecutaron **29 pruebas unitarias automatizadas** sobre los componentes críticos de autenticación, configuración y control de acceso de la aplicación. Todas las pruebas pasaron exitosamente. Adicionalmente, se identificaron y corrigieron dos vulnerabilidades de seguridad durante la revisión arquitectónica.

| Métrica | Valor |
|---------|-------|
| Total de pruebas | 29 |
| Pruebas exitosas | 29 (100%) |
| Pruebas fallidas | 0 |
| Cobertura de sentencias | 78.5% (113/144) |
| Cobertura de funciones | 82.7% (24/29) |
| Cobertura de ramas | 66.7% (40/60) |
| Errores TypeScript | 0 |
| Motor de pruebas | Karma 6.4.4 + Chrome 145 |

---

## 2. Vulnerabilidades Identificadas y Corregidas

### CVE-interno-001 — Escalación de Privilegios por Inferencia de Rol en Producción

**Severidad:** Alta
**Archivo:** `src/app/compartidos/servicios/auth.ts`
**Commits:** `d45426e`, `c381496`

**Descripción:** El método privado `determinarRol()` contenía un bloque de código delimitado por los marcadores `//\*` y `//\*/`. Estos marcadores son comentarios de línea ordinarios en TypeScript (no directivas de compilación condicional), por lo que el bloque ejecutaba **en todos los entornos, incluido producción**. El código asignaba el rol `admin` a cualquier usuario cuyo email contuviera la cadena `usuario.administrador`, sin verificar el entorno de ejecución.

**Impacto potencial:** Un atacante que controlara su dirección de correo electrónico registrada en el directorio LDAP podría obtener privilegios de administrador en la aplicación.

**Corrección aplicada:**

```typescript
// ANTES (ejecutaba en producción)
//* SOLO PARA DESARROLLO
if ((!this.usuarioSignal() && user.email.includes('usuario.administrador')) || this.esAdmin()) {
  return 'admin';
}
//*/

// DESPUÉS (tree-shaken en builds de producción)
if (isDevMode()) {
  if (!this.usuarioSignal() && user.email.includes('usuario.administrador')) {
    return 'admin';
  }
  // ...
}
```

`isDevMode()` de `@angular/core` retorna `false` en builds de producción y el compilador de Angular elimina el bloque mediante tree-shaking.

---

### CVE-interno-002 — Verificación de Rol Admin por Substring de Email

**Severidad:** Alta
**Archivo:** `src/app/compartidos/servicios/auth.ts:66`
**Commit:** `c381496`

**Descripción:** El signal computado `esAdmin` incluía la condición `usuario?.email.includes('usuario.administrador')` como criterio de autorización. Esta condición evaluaba en producción para todos los usuarios autenticados, exponiendo el mismo vector que CVE-interno-001 pero en un punto de evaluación diferente (usado directamente por los guards de rutas).

**Corrección aplicada:**

```typescript
// ANTES
public readonly esAdmin: Signal<boolean> = computed(() => {
  const usuario = this.usuarioSignal();
  return usuario?.rol === 'admin'
    || usuario?.roles?.includes('admin')
    || usuario?.email.includes('usuario.administrador')  // ← ELIMINADO
    || false;
});

// DESPUÉS
public readonly esAdmin: Signal<boolean> = computed(() => {
  const usuario = this.usuarioSignal();
  return usuario?.rol === 'admin' || usuario?.roles?.includes('admin') || false;
});
```

---

## 3. Suite de Pruebas Unitarias

### 3.1 Auth Service (`auth.spec.ts`) — 15 pruebas

Cubre el servicio de autenticación centralizado que gestiona el estado de sesión mediante Angular Signals.

| # | Caso de Prueba | Resultado |
|---|----------------|-----------|
| 1 | Creación del servicio | ✅ PASS |
| 2 | Estado inicial: `usuario` es `undefined` | ✅ PASS |
| 3 | Estado inicial: `cargando` es `false` | ✅ PASS |
| 4 | Estado inicial: `estaAutenticado` es `false` | ✅ PASS |
| 5 | `login()` exitoso establece el usuario en el signal | ✅ PASS |
| 6 | `login()` exitoso restablece `cargando` a `false` | ✅ PASS |
| 7 | `login()` fallido establece el mensaje de error | ✅ PASS |
| 8 | `login()` fallido establece `usuario` a `null` | ✅ PASS |
| 9 | `logout()` exitoso limpia el usuario del signal | ✅ PASS |
| 10 | `logout()` exitoso navega a `/login` | ✅ PASS |
| 11 | `logout()` fallido limpia el usuario y navega igualmente | ✅ PASS |
| 12 | `verificarSesion()` exitoso establece el usuario | ✅ PASS |
| 13 | `verificarSesion()` fallido establece `usuario` a `null` | ✅ PASS |
| 14 | `tienePermisos()` respeta la jerarquía `admin > gestor > directivo > usuario` | ✅ PASS |
| 15 | `limpiarError()` limpia el signal de error | ✅ PASS |

**Observaciones técnicas:**

- Las pruebas utilizan `HttpTestingController` para interceptar peticiones HTTP sin realizar llamadas reales a la red.
- `httpMock.verify()` en `afterEach` garantiza que no queden peticiones HTTP pendientes tras cada prueba.
- El acceso a signals privados mediante `(service as any).usuarioSignal.set()` es una práctica aceptada en pruebas unitarias de Angular; los modificadores de visibilidad de TypeScript son solo de tiempo de compilación.

---

### 3.2 ConfigService (`config.service.spec.ts`) — 7 pruebas

Cubre el servicio de configuración dinámica que se inicializa mediante `APP_INITIALIZER` antes de que cualquier otro servicio realice peticiones a la API.

| # | Caso de Prueba | Resultado |
|---|----------------|-----------|
| 1 | Creación del servicio | ✅ PASS |
| 2 | `getConfig()` retorna valores por defecto antes de cargarse | ✅ PASS |
| 3 | `getApiBaseUrl()` retorna URL por defecto antes de cargarse | ✅ PASS |
| 4 | `isLoaded()` es `false` inicialmente | ✅ PASS |
| 5 | `loadConfig()` carga la configuración desde el servidor | ✅ PASS |
| 6 | `loadConfig()` usa valores por defecto si el servidor falla | ✅ PASS |
| 7 | `loadConfig()` no recarga si ya fue cargado (idempotencia) | ✅ PASS |

**Observaciones técnicas:**

- La prueba 6 verifica la resiliencia ante fallos de red: el servicio debe continuar operando con valores de fallback.
- La prueba 7 usa `httpMock.expectNone('/api/config')` — una aserción fuerte que falla si se realiza cualquier petición inesperada, verificando correctamente la propiedad de idempotencia.
- El `console.error` que aparece en la salida del test para la prueba 6 es el comportamiento esperado y documentado del servicio; no indica un fallo.

---

### 3.3 Guards de Autenticación (`auth-guard.spec.ts`) — 7 pruebas

Cubre los guards funcionales `authGuard` y `adminGuard` que protegen las rutas de la aplicación.

#### authGuard (3 pruebas)

| # | Caso de Prueba | Resultado |
|---|----------------|-----------|
| 1 | Permite acceso cuando el usuario ya está autenticado en memoria (signal) | ✅ PASS |
| 2 | Verifica sesión en servidor cuando no hay autenticación en memoria | ✅ PASS |
| 3 | Redirige a `/login` con `returnUrl` cuando la sesión no es válida | ✅ PASS |

#### adminGuard (4 pruebas)

| # | Caso de Prueba | Resultado |
|---|----------------|-----------|
| 4 | Permite acceso cuando el usuario está autenticado y tiene rol `admin` | ✅ PASS |
| 5 | Redirige a `/acceso-denegado` cuando está autenticado pero no es admin | ✅ PASS |
| 6 | Redirige a `/login` cuando no está autenticado y la sesión falla | ✅ PASS |
| 7 | Redirige a `/acceso-denegado` cuando sesión es válida pero usuario no es admin | ✅ PASS |

**Observaciones técnicas:**

- Las pruebas usan `TestBed.runInInjectionContext()`, el patrón oficial de Angular para probar guards funcionales (`CanActivateFn`).
- La prueba 7 es la de mayor valor: cubre el edge case donde la verificación de sesión tiene éxito (usuario existe) pero el rol no es suficiente — garantizando que el guard no confunda "autenticado" con "autorizado".
- Los spies sobre `estaAutenticado` y `esAdmin` funcionan correctamente porque los Angular Signals son funciones invocables.

---

## 4. Controles de Seguridad Adicionales Implementados

### 4.1 Cabeceras de Seguridad HTTP (`src/server.ts`)

Se añadió middleware en el servidor Express/SSR que aplica las siguientes cabeceras a todas las respuestas:

| Cabecera | Valor | Propósito |
|----------|-------|-----------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src blob:` | Mitigación XSS (parcial — ver nota) |
| `X-Content-Type-Options` | `nosniff` | Previene MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Previene clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita exposición de URLs en referer |

> **Nota para el auditor:** El valor `unsafe-inline` en `script-src` es una limitación conocida requerida por la hidratación SSR de Angular. Una mitigación completa requeriría implementar CSP basado en nonces, lo que implica coordinación con el pipeline de build. Se documenta como deuda técnica para Sprint 3.

### 4.2 Auditoría de Dependencias en CI/CD (`.github/workflows/security.yml`)

Se configuró un workflow de GitHub Actions que ejecuta `npm audit --audit-level=high --omit=dev` en cada Pull Request y push a `main`. El pipeline falla automáticamente si se detectan vulnerabilidades de severidad **HIGH** o **CRITICAL** en dependencias de producción.

### 4.3 Protección del Botón de Login de Desarrollo

El botón "Login de Desarrollo" del componente `login` ahora se renderiza únicamente cuando `isDevMode()` es `true` (builds de desarrollo). En producción, el bloque es eliminado por tree-shaking del compilador de Angular.

---

## 5. Observación Pendiente (No Bloqueante)

El método `devLogin()` en `auth.ts` llama al endpoint `api/v2/auth/dev/login` sin un guard `isDevMode()` en el frontend. Si el backend tiene configurada la variable `DEV_FAKE_LOGIN=false` (como es el caso en producción según la documentación del proyecto), la ruta no existe en el servidor y la llamada falla con error HTTP. Sin embargo, **se recomienda verificar** que el servidor efectivamente deshabilita este endpoint en producción, ya que la seguridad no debe depender únicamente del frontend.

---

## 6. Entorno de Pruebas

| Componente | Versión |
|------------|---------|
| Angular | 21.1.5 |
| Node.js | 25.6.1 |
| Karma | 6.4.4 |
| Jasmine | (incluido en Karma) |
| Chrome | 145.0.0.0 |
| TypeScript | 5.x (tsc --noEmit: 0 errores) |
| Sistema Operativo | macOS 24.6.0 (Darwin) |

---

*Informe generado el 23 de febrero de 2026. Commits verificados: `d45426e` y `c381496` en `origin/main`.*
