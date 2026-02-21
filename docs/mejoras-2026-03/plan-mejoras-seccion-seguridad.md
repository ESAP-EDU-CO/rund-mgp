# Sección 1: Plan de Mejoras de Seguridad — rund-mgp

**Proyecto:** rund-mgp (Frontend Angular 20 SSR)
**Fecha de elaboracion:** 2026-02-21
**Autor:** Plan de mejoras — equipo RUND
**Version Angular actual:** 20.3.15

---

## Indice

- [1.1 Aplicar Guards de Autenticacion en Rutas](#11-aplicar-guards-de-autenticacion-en-rutas-critico---1h)
- [1.2 Actualizar Angular a >=20.3.16](#12-actualizar-angular-a-20316-critico---2h)
- [1.3 Refactorizar SafePipe](#13-refactorizar-safepipe-alto---4h)
- [1.4 Condicionar Login de Desarrollo a Entorno](#14-condicionar-login-de-desarrollo-a-entorno-medio---1h)
- [1.5 Mejorar Determinacion de Roles](#15-mejorar-determinacion-de-roles-medio---3h)
- [1.6 Implementar Vista /acceso-denegado](#16-implementar-vista-acceso-denegado-bajo---2h)
- [1.7 Limpieza de Configuracion](#17-limpieza-de-configuracion-bajo---30min)
- [Resumen de Esfuerzo](#resumen-de-esfuerzo--seguridad)

---

## 1.1 Aplicar Guards de Autenticacion en Rutas [CRITICO - 1h]

### Descripcion del problema

Los guards `authGuard` y `adminGuard` estan completamente implementados en
`src/app/compartidos/guards/auth-guard.ts` pero **ninguna ruta en `app.routes.ts` los usa**.
Esto significa que cualquier usuario sin autenticar puede acceder directamente a todas las
vistas del sistema simplemente navegando a la URL.

**Codigo actual** (`src/app/app.routes.ts`):

```typescript
// PROBLEMA: ninguna ruta tiene canActivate
export const routes: Routes = [
  { path: '', redirectTo: 'listados', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'consultas', component: Consultas },
  { path: 'listados', component: Listados },
  { path: 'certificados', component: Certificados },
  { path: 'gestion', component: Gestion },
  { path: 'herramientas', component: Herramientas },
  { path: 'validacion', component: Validacion },
  { path: '**', redirectTo: 'listados', pathMatch: 'full' },
];
```

### Clasificacion de rutas

| Ruta | Tipo | Guard requerido | Razon |
|------|------|-----------------|-------|
| `/login` | Publica | Ninguno | Punto de entrada de autenticacion |
| `/validacion` | Publica | Ninguno | Validacion de certificados es publica segun el dominio del sistema |
| `/acceso-denegado` | Publica | Ninguno | Destino de redireccion de guards |
| `/listados` | Protegida | `authGuard` | Listado de docentes, datos sensibles |
| `/consultas` | Protegida | `authGuard` | Consultas de hojas de vida |
| `/dashboard` | Protegida | `authGuard` | Panel de control |
| `/certificados` | Protegida | `authGuard` | Emision y gestion de certificados |
| `/gestion` | Protegida admin | `adminGuard` | Carga, edicion y borrado de documentos |
| `/herramientas` | Protegida admin | `adminGuard` | Herramientas administrativas |

> **Nota sobre `/validacion`:** si el negocio requiere que sea privada, aplicar `authGuard`.
> Confirmar con el equipo funcional antes de implementar.

### Codigo de solucion

**Archivo:** `src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { Gestion } from '@vistas/gestion/gestion';
import { Consultas } from '@vistas/consultas/consultas';
import { Dashboard } from '@vistas/dashboard/dashboard';
import { Certificados } from '@vistas/certificados/certificados';
import { Herramientas } from '@vistas/herramientas/herramientas';
import { Listados } from '@vistas/listados/listados';
import { Validacion } from '@vistas/validacion/validacion';
import { Login } from '@componentes/login/login';
import { AccesoDenegado } from '@componentes/acceso-denegado/acceso-denegado';
import { authGuard, adminGuard } from '@guards/auth-guard';

export const routes: Routes = [
  // Rutas publicas — sin guard
  { path: '', redirectTo: 'listados', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'validacion', component: Validacion },
  { path: 'acceso-denegado', component: AccesoDenegado },

  // Rutas protegidas — solo usuarios autenticados
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },
  {
    path: 'consultas',
    component: Consultas,
    canActivate: [authGuard]
  },
  {
    path: 'listados',
    component: Listados,
    canActivate: [authGuard]
  },
  {
    path: 'certificados',
    component: Certificados,
    canActivate: [authGuard]
  },

  // Rutas protegidas — solo administradores
  {
    path: 'gestion',
    component: Gestion,
    canActivate: [adminGuard]
  },
  {
    path: 'herramientas',
    component: Herramientas,
    canActivate: [adminGuard]
  },

  // Fallback — redirige a listados (el guard se encargara de redirigir a /login si no esta autenticado)
  { path: '**', redirectTo: 'listados', pathMatch: 'full' },
];
```

### Criterios de aceptacion

- [ ] Navegar a `/listados` sin sesion activa redirige a `/login?returnUrl=%2Flistados`
- [ ] Navegar a `/gestion` sin sesion activa redirige a `/login`
- [ ] Navegar a `/gestion` con sesion de rol `usuario` redirige a `/acceso-denegado`
- [ ] Navegar a `/login` con sesion activa redirige a la URL de retorno o `/`
- [ ] Navegar a `/validacion` sin sesion activa carga la vista normalmente
- [ ] Navegar a `/acceso-denegado` sin sesion activa carga la vista normalmente

### Posibles riesgos y breaking changes

- **Riesgo:** El componente `AccesoDenegado` no existe aun — debe crearse antes (ver seccion 1.6).
- **Riesgo:** Si hay pruebas E2E que navegan directamente a rutas protegidas, fallaran. Actualizar
  las pruebas para hacer login primero.
- **Riesgo bajo:** La redireccion fallback `**` a `listados` combinada con `authGuard` en `listados`
  producira un ciclo correcto: `** -> /listados -> authGuard -> /login`. Verificar que no haya bucles
  con el `returnUrl` si el usuario no tiene sesion.

---

## 1.2 Actualizar Angular a >=20.3.16 [CRITICO - 2h]

### Descripcion del problema

Angular 20.3.15 tiene una vulnerabilidad de XSS documentada en **GHSA-jrmj-c5cx-3cw6**. La
vulnerabilidad permite inyeccion de HTML malicioso en ciertos contextos del compilador de
templates. El fix esta en la version 20.3.16 segun el advisory oficial de GitHub.

La version actual se confirma en `package.json`:

```json
"@angular/core": "^20.3.15"
```

### Comandos de actualizacion

Ejecutar en orden:

```bash
# 1. Actualizar Angular CLI global (si se usa localmente)
npm install -g @angular/cli@latest

# 2. Desde la raiz del proyecto rund-mgp
cd rund-mgp

# 3. Actualizar todos los paquetes @angular/* a la ultima version del canal 20.x
npx ng update @angular/core @angular/common @angular/router @angular/forms \
  @angular/platform-browser @angular/platform-server @angular/compiler \
  @angular/compiler-cli @angular/cli

# 4. Si el comando anterior pide --force por dependencias de pares, revisar primero:
npx ng update @angular/core --dry-run

# 5. Verificar que no haya errores de compilacion
npx ng build --configuration=production

# 6. Verificar SSR
npx ng build --configuration=production && node dist/rund-mgp/server/server.mjs
```

### Verificacion post-actualizacion

```bash
# Confirmar version instalada (debe ser >= 20.3.16)
node -e "const p=require('./node_modules/@angular/core/package.json'); console.log(p.version)"

# Compilar en modo produccion sin errores
npx ng build --configuration=production 2>&1 | tail -5

# Ejecutar tests unitarios si existen
npx ng test --watch=false --browsers=ChromeHeadless
```

### Que verificar manualmente

1. El `SafePipe` sigue funcionando igual (el cambio de version no altera `DomSanitizer` en
   versiones patch).
2. Los signals de Angular 20 (usados en `auth.ts`, `login.ts`) siguen siendo compatibles.
3. PrimeNG sigue siendo compatible con la nueva version patch. Consultar la matriz de
   compatibilidad en https://primeng.org/guides/angular-compatibility.

### Posibles breaking changes

Las versiones patch (20.3.15 -> 20.3.16) **no introducen breaking changes** por politica de
Angular. Sin embargo:

- Si `package.json` usa `^20.3.15`, `npm install` ya puede haber instalado `20.3.15`. El
  prefijo `^` permite actualizaciones de minor y patch, por lo que `20.3.16` entrara sin
  conflicto.
- Si hay un `package-lock.json` con la version fijada a `20.3.15`, ejecutar
  `npm install @angular/core@^20.3.16` para forzar la actualizacion del lockfile.

---

## 1.3 Refactorizar SafePipe [ALTO - 4h]

### Descripcion del problema

`SafePipe` en `src/app/compartidos/pipes/safe-pipe.ts` expone **cinco metodos de bypass de
sanitizacion** en un pipe de proposito general sin ninguna validacion del origen ni del
contenido:

```typescript
// PROBLEMA: cualquier plantilla puede llamar valor | safe:'script'
// esto ejecuta JavaScript arbitrario sin sanitizacion
case 'script': return this.sanitizer.bypassSecurityTrustScript(value);
case 'html':   return this.sanitizer.bypassSecurityTrustHtml(value);
```

El caso de uso real identificado en el proyecto es incrustar PDFs de OpenKM en un `<iframe>`
usando `resourceUrl`. Los demas tipos (`html`, `style`, `script`, `url`) **no tienen un caso
de uso justificado** y representan superficie de ataque.

El vector de riesgo: si un atacante logra inyectar datos en una variable que se pasa a este
pipe con el tipo `script` o `html`, puede ejecutar codigo arbitrario en el navegador del
usuario, comprometiendo credenciales y sesion.

### Estrategia de refactorizacion

1. Reemplazar `SafePipe` generico por pipes especificos, uno por tipo de bypass requerido.
2. Agregar validacion de dominio de origen en el pipe de `resourceUrl`.
3. Eliminar `bypassSecurityTrustScript` — no tiene caso de uso legitimo en una SPA.
4. Mantener `bypassSecurityTrustHtml` solo si se requiere renderizar HTML del backend, con
   lista blanca de origenes.

### Codigo de solucion

#### Paso 1: Nuevo pipe especifico para PDFs (reemplaza el caso de uso real)

**Archivo nuevo:** `src/app/compartidos/pipes/safe-resource-url.pipe.ts`

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * SafeResourceUrlPipe
 *
 * Pipe seguro para incrustar recursos externos en <iframe> o <object>.
 * SOLO permite URLs que provengan de origenes conocidos y confiables.
 *
 * Uso en plantilla:
 *   <iframe [src]="urlDelPdf | safeResourceUrl"></iframe>
 *
 * Origenes permitidos (configurados segun entorno):
 *   - Interno Docker: http://rund-core:8080
 *   - Localhost dev:  http://localhost:8080
 *   - Produccion:     https://rund.esap.edu.co (ajustar segun dominio real)
 */
@Pipe({
  name: 'safeResourceUrl',
  standalone: true,
  pure: true
})
export class SafeResourceUrlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  // Origenes permitidos — ajustar segun entorno de despliegue
  private readonly origenesPermitidos: string[] = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://rund-core:8080',
    'http://rund-api:3000',
    // Agregar origen de produccion cuando se defina
    // 'https://rund.esap.edu.co',
  ];

  transform(url: string | null | undefined): SafeResourceUrl {
    if (!url) {
      // Retornar URL vacia en lugar de null para evitar errores en el template
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    // Validar que la URL provenga de un origen permitido
    if (!this.esOrigenPermitido(url)) {
      console.warn(
        `[SafeResourceUrlPipe] URL rechazada por origen no permitido: ${url}`
      );
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private esOrigenPermitido(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.origenesPermitidos.some(origen => {
        try {
          const origenObj = new URL(origen);
          return urlObj.origin === origenObj.origin;
        } catch {
          return false;
        }
      });
    } catch {
      // URL relativa — permitir (el navegador la resuelve contra el mismo origen)
      return url.startsWith('/') || url.startsWith('./');
    }
  }
}
```

#### Paso 2: Refactorizacion de SafePipe existente (eliminar script)

**Archivo modificado:** `src/app/compartidos/pipes/safe-pipe.ts`

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

/**
 * SafePipe — Version refactorizada
 *
 * IMPORTANTE: bypassSecurityTrustScript fue ELIMINADO.
 * No existe caso de uso legitimo para ejecutar scripts externos en esta aplicacion.
 *
 * Para incrustar PDFs en iframe, usar SafeResourceUrlPipe (safeResourceUrl).
 * Este pipe queda disponible solo para casos de HTML y estilos dinamicos internos.
 *
 * @deprecated Preferir pipes especificos: SafeResourceUrlPipe
 */
@Pipe({
  name: 'safe',
  standalone: false
})
export class SafePipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  public transform(value: string, type: 'html' | 'style' | 'url' | 'resourceUrl'): SafeHtml | SafeStyle | SafeUrl | SafeResourceUrl {
    switch (type) {
      case 'html':
        return this.sanitizer.bypassSecurityTrustHtml(value);
      case 'style':
        return this.sanitizer.bypassSecurityTrustStyle(value);
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(value);
      case 'resourceUrl':
        // Deprecado en favor de SafeResourceUrlPipe que valida el origen
        console.warn('[SafePipe] Usar SafeResourceUrlPipe para resourceUrl.');
        return this.sanitizer.bypassSecurityTrustResourceUrl(value);
      default:
        throw new Error(`[SafePipe] Tipo no permitido: ${type}. El tipo 'script' fue eliminado por seguridad.`);
    }
  }
}
```

#### Paso 3: Registrar el nuevo pipe

**Archivo:** `src/app/compartidos/modulos/pipes/pipes-module.ts`

Agregar `SafeResourceUrlPipe` a las exportaciones del modulo de pipes. Si los componentes
son standalone, importar `SafeResourceUrlPipe` directamente en cada componente que lo use.

#### Paso 4: Migrar uso en plantillas

Buscar todos los usos de `| safe:'resourceUrl'` en las plantillas del proyecto:

```bash
# Desde la raiz de rund-mgp
grep -rn "safe:'resourceUrl'\|safe: 'resourceUrl'" src/
```

Para cada ocurrencia, cambiar:
```html
<!-- Antes -->
<iframe [src]="urlPdf | safe:'resourceUrl'"></iframe>

<!-- Despues -->
<iframe [src]="urlPdf | safeResourceUrl"></iframe>
```

### Criterios de aceptacion

- [ ] `bypassSecurityTrustScript` no aparece en ninguna clase del proyecto
  (`grep -rn bypassSecurityTrustScript src/` retorna cero resultados)
- [ ] `SafeResourceUrlPipe` rechaza URLs que no provengan de origenes permitidos (verificar
  en consola del navegador que aparece el warning)
- [ ] Los iframes de visualizacion de PDF siguen funcionando correctamente
- [ ] La compilacion TypeScript pasa sin errores (`ng build --configuration=production`)
- [ ] El tipo `string` del parametro `type` en `SafePipe` NO incluye `'script'` en la firma

### Posibles riesgos y breaking changes

- **Riesgo moderado:** Si algun componente usa `| safe:'script'`, fallara en tiempo de
  ejecucion con un error claro. Hacer busqueda antes de implementar:
  `grep -rn "safe:'script'" src/`
- **Sin breaking change** para `html`, `style`, `url` — el comportamiento no cambia.
- Los origenes en `SafeResourceUrlPipe` deben actualizarse cuando se configure el dominio
  de produccion. Centralizar en `environment.ts` si el proyecto lo adopta en el futuro.

---

## 1.4 Condicionar Login de Desarrollo a Entorno [MEDIO - 1h]

### Descripcion del problema

El boton "Login de Desarrollo" esta renderizado incondicionalmente en `login.html` y el metodo
`loginDev()` en `login.ts` no verifica el entorno antes de ejecutarse. En produccion, este boton
permite autenticar como cualquier usuario de la lista de fake-users sin contrasena, siempre que el
servidor tenga `DEV_FAKE_LOGIN=true` en rund-auth. Si por error de despliegue esa variable queda
activa en produccion, el boton del frontend facilita la explotacion.

**Codigo actual en `login.html` (lineas 74-84):**
```html
<!-- Boton de desarrollo (solo en DEV) -->
<!-- IMPORTANTE: Comentar o eliminar en produccion -->
<p-button type="button"
          label="Login de Desarrollo"
          ...
          (onClick)="loginDev()" />
```

**Problema:** El comentario "Comentar o eliminar en produccion" depende de un paso manual
propenso a omitirse. No hay mecanismo automatico que lo oculte.

**Codigo actual en `login.ts` (lineas 102-117):**
```typescript
protected loginDev(): void {
  if (confirm('¿Usar login de desarrollo?')) {
    this.authService.devLogin('usuario.administrador@esap.edu.co').subscribe({...});
  }
}
```

El `configService` ya expone `environment` desde `/api/config`. Ese campo se puede usar.

### Codigo de solucion

#### Opcion A: Usar ConfigService (recomendada — ya disponible en el proyecto)

El `ConfigService` carga desde `/api/config` un objeto `AppConfig` que incluye
`environment: string`. Este campo ya indica si se esta en `development` o `production`.

**Archivo modificado:** `src/app/compartidos/componentes/login/login.ts`

```typescript
// Agregar signal para controlar visibilidad del boton DEV
protected readonly mostrarLoginDev = computed(() =>
  this.configService.getConfig().environment !== 'production'
);
```

Hacer `configService` accesible como `protected` en la clase:

```typescript
// Cambiar de private a protected para acceso en plantilla (o usar el signal)
protected configService = inject(ConfigService);
```

O exponer solo el signal derivado (mas limpio):

```typescript
@Component({...})
export class Login implements OnInit {
  private configService = inject(ConfigService);

  // Signal derivado del entorno — false si environment === 'production'
  protected readonly mostrarLoginDev = computed(
    () => this.configService.getConfig().environment !== 'production'
  );

  // ... resto del componente sin cambios
}
```

**Archivo modificado:** `src/app/compartidos/componentes/login/login.html`

```html
<!-- Boton de desarrollo — solo visible en entornos no-productivos -->
@if (mostrarLoginDev()) {
  <p-button type="button"
            label="Login de Desarrollo"
            icon="pi pi-cog"
            (onClick)="loginDev()"
            [loading]="cargando()"
            [disabled]="cargando()"
            styleClass="w-full mt-2"
            severity="secondary"
            [outlined]="true" />
}
```

**Defensa adicional en `login.ts`:** El metodo `loginDev()` debe verificar el entorno antes
de llamar al servicio, como segunda linea de defensa:

```typescript
protected loginDev(): void {
  // Defensa en profundidad: verificar entorno aunque el boton este oculto
  if (this.configService.getConfig().environment === 'production') {
    console.warn('[Login] loginDev() bloqueado en produccion');
    return;
  }

  if (confirm('¿Usar login de desarrollo?')) {
    this.authService.devLogin('usuario.administrador@esap.edu.co').subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate([this.returnUrl]);
        } else {
          this.errorMensaje.set(response.message || 'Error en login de desarrollo');
        }
      },
      error: () => {
        this.errorMensaje.set('Error al conectar con el servidor');
      }
    });
  }
}
```

#### Opcion B: Variable de entorno en tiempo de compilacion (alternativa)

Si el proyecto adopta `environment.ts` en el futuro:

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  showDevLogin: false
};

// src/environments/environment.ts
export const environment = {
  production: false,
  showDevLogin: true
};
```

La Opcion A es preferible porque no requiere crear archivos de entorno y usa la configuracion
ya cargada por `ConfigService` desde el servidor.

### Criterios de aceptacion

- [ ] Con `environment: 'production'` en `/api/config`, el boton "Login de Desarrollo" no
  se renderiza en el DOM (verificar con DevTools -> Inspector)
- [ ] Con `environment: 'development'`, el boton si aparece
- [ ] Llamar `loginDev()` directamente por consola del navegador en produccion retorna sin
  hacer la peticion HTTP (verificar en la pestana Network de DevTools)
- [ ] La compilacion TypeScript pasa sin errores

### Posibles riesgos

- **Riesgo bajo:** Si `ConfigService` no ha cargado todavia (race condition al inicio),
  `mostrarLoginDev()` puede retornar `true` brevemente. El `APP_INITIALIZER` ya garantiza
  que `ConfigService.loadConfig()` se ejecuta antes de renderizar, por lo que esto no
  deberia ocurrir. Verificar en el primer render.
- **Sin breaking changes** — cambio aditivo que solo oculta el boton segun configuracion.

---

## 1.5 Mejorar Determinacion de Roles [MEDIO - 3h]

### Descripcion del problema

En `src/app/compartidos/servicios/auth.ts`, el rol del usuario se determina **parcialmente
por patrones en la direccion de correo electronico**, lo cual es un mecanismo fragil e
inseguro:

**Codigo actual problematico (lineas 64-67 y 271-284):**

```typescript
// En computed signal esAdmin (linea 64-67):
public readonly esAdmin: Signal<boolean> = computed(() => {
  const usuario = this.usuarioSignal();
  return usuario?.rol === 'admin'
      || usuario?.roles?.includes('admin')
      || usuario?.email.includes('usuario.administrador')  // <- INSEGURO
      || false;
});

// En determinarRol() (lineas 271-284):
private determinarRol(user: Usuario): Rol {
  //* SOLO PARA DESARROLLO
  if ((!this.usuarioSignal() && user.email.includes('usuario.administrador')) || this.esAdmin()) {
    return 'admin';
  }
  if ((!this.usuarioSignal() && user.email.includes('usuario.gestor'))) {
    return 'gestor';
  }
  // ...
  //*/
```

**Problemas concretos:**

1. Cualquier usuario cuyo email contenga la cadena `usuario.administrador` (por ejemplo,
   `mi.usuario.administrador.esap@gmail.com`) obtiene privilegios de administrador.
2. El codigo de desarrollo marcado con `//* SOLO PARA DESARROLLO ... /*/` no esta
   condicionado al entorno — se ejecuta en produccion.
3. La logica de roles deberia ser responsabilidad exclusiva de `rund-auth` (backend), no
   del frontend.

### Propuesta de contrato con rund-auth

`rund-auth` debe incluir el rol en el payload del JWT y en la respuesta de sesion. El
campo ya existe en la interfaz `Usuario`:

```typescript
export interface Usuario {
  sub: string;
  name: string;
  email: string;
  tid: string;
  roles?: Rol[];   // Array de roles (viene de LDAP o Azure AD)
  rol?: Rol;       // Rol principal (calculado por rund-auth)
}
```

**Contrato esperado de rund-auth:**

El endpoint `POST /ldap/login` y `GET /session` deben retornar:

```json
{
  "success": true,
  "user": {
    "sub": "71799891",
    "name": "Juan Carlos Perez",
    "email": "jcperez@esap.edu.co",
    "tid": "esap",
    "rol": "gestor",
    "roles": ["gestor"]
  },
  "session_id": "abc123"
}
```

El campo `rol` es calculado por `rund-auth` segun:
- Membresía en grupos de Active Directory (atributo `memberOf`)
- O mapeo configurable por cedula/email en base de datos PostgreSQL
- El frontend NO debe calcular roles, solo consumirlos

### Codigo de solucion

**Archivo modificado:** `src/app/compartidos/servicios/auth.ts`

```typescript
// ANTES (inseguro):
public readonly esAdmin: Signal<boolean> = computed(() => {
  const usuario = this.usuarioSignal();
  return usuario?.rol === 'admin'
      || usuario?.roles?.includes('admin')
      || usuario?.email.includes('usuario.administrador')  // ELIMINAR
      || false;
});

// DESPUES (confia solo en el backend):
public readonly esAdmin: Signal<boolean> = computed(() => {
  const usuario = this.usuarioSignal();
  return usuario?.rol === 'admin'
      || (Array.isArray(usuario?.roles) && usuario.roles.includes('admin'));
});
```

**Refactorizacion de `determinarRol()`:**

```typescript
/**
 * Determina el rol del usuario a partir de los datos que vienen del backend.
 * El frontend NO infiere roles — confía exclusivamente en rund-auth.
 */
private determinarRol(user: Usuario): Rol {
  // Prioridad 1: campo rol directo del backend
  if (user.rol && this.esRolValido(user.rol)) {
    return user.rol;
  }

  // Prioridad 2: primer elemento del array de roles
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const primerRol = user.roles[0];
    if (this.esRolValido(primerRol)) {
      return primerRol;
    }
  }

  // Fallback seguro: rol de menor privilegio
  return 'usuario';
}

/**
 * Verifica que el rol sea uno de los valores validos definidos en el tipo Rol.
 */
private esRolValido(rol: string): rol is Rol {
  return ['admin', 'gestor', 'directivo', 'usuario'].includes(rol);
}
```

### Migracion del codigo de desarrollo

El bloque `/* SOLO PARA DESARROLLO */` en `determinarRol()` debe eliminarse del codigo
de produccion. Si se necesita para pruebas locales, usar el endpoint `devLogin` de rund-auth
que ya configura el rol correctamente en el backend.

Si transitoriamente se necesita mantener un fallback por email para desarrollo, envolverlo
en una condicion de entorno:

```typescript
private determinarRol(user: Usuario): Rol {
  // TEMPORAL: mapeo por email solo en desarrollo
  // TODO: eliminar cuando rund-auth implemente roles en LDAP
  if (this.configService.getConfig().environment !== 'production') {
    if (user.email.includes('usuario.administrador')) return 'admin';
    if (user.email.includes('usuario.gestor')) return 'gestor';
    if (user.email.includes('usuario.directivo')) return 'directivo';
    if (user.email.includes('usuario.usuario')) return 'usuario';
  }

  if (user.rol && this.esRolValido(user.rol)) return user.rol;
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const primerRol = user.roles[0];
    if (this.esRolValido(primerRol)) return primerRol;
  }

  return 'usuario';
}
```

### Criterios de aceptacion

- [ ] `usuario?.email.includes('usuario.administrador')` no aparece en el computed `esAdmin`
- [ ] Un usuario con email `mi.usuario.administrador.fake@gmail.com` cuyo backend retorna
  `rol: 'usuario'` NO obtiene privilegios de admin
- [ ] Un usuario cuyo backend retorna `rol: 'admin'` SI obtiene acceso a rutas con `adminGuard`
- [ ] `esRolValido()` rechaza valores arbitrarios (ejemplo: `rol: 'superuser'` retorna `'usuario'`)
- [ ] Compilacion sin errores

### Posibles riesgos y breaking changes

- **Dependencia de backend:** rund-auth debe enviar el campo `rol` en la respuesta de login
  y sesion. Coordinar con el equipo de backend antes de implementar el frontend.
- **Riesgo de regresion:** Si rund-auth no envía el campo `rol` todavia, todos los usuarios
  quedaran con rol `usuario`. Implementar en paralelo con el cambio de backend o mantener
  el fallback de entorno temporalmente.

---

## 1.6 Implementar Vista /acceso-denegado [BAJO - 2h]

### Descripcion del problema

El `adminGuard` en `auth-guard.ts` (lineas 82 y 93) redirige a `/acceso-denegado`:

```typescript
router.navigate(['/acceso-denegado']);
```

Sin embargo, esta ruta **no esta definida en `app.routes.ts`** ni existe el componente.
Cuando un usuario sin rol admin intenta acceder a `/gestion` o `/herramientas`, la navegacion
falla silenciosamente (el wildcard `**` lo redirige a `/listados`, que a su vez requiere
autenticacion, generando confusion).

### Codigo de solucion

#### Paso 1: Crear el componente

**Archivo nuevo:** `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.ts`

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@servicios/auth';
import { PrimengModule } from '@modulos/primeng/primeng-module';

@Component({
  selector: 'mgp-acceso-denegado',
  standalone: true,
  imports: [PrimengModule],
  templateUrl: './acceso-denegado.html',
  styleUrl: './acceso-denegado.scss'
})
export class AccesoDenegado {
  private router = inject(Router);
  private authService = inject(Auth);

  protected readonly usuario = this.authService.usuario;

  navegarAlInicio(): void {
    this.router.navigate(['/listados']);
  }

  cerrarSesion(): void {
    this.authService.logout().subscribe();
  }
}
```

**Archivo nuevo:** `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.html`

```html
<div class="acceso-denegado-container">
  <div class="acceso-denegado-card">
    <div class="icono-error">
      <i class="pi pi-lock" style="font-size: 4rem; color: var(--red-400)"></i>
    </div>

    <h1>Acceso Denegado</h1>
    <p class="mensaje-principal">
      No tiene los permisos necesarios para acceder a esta seccion.
    </p>

    @if (usuario()) {
      <p class="mensaje-usuario">
        Sesion activa como: <strong>{{ usuario()?.name }}</strong>
        ({{ usuario()?.rol || 'usuario' }})
      </p>
    }

    <p class="mensaje-contacto">
      Si necesita acceso, comuniquese con el administrador del sistema o con la OTIC de la ESAP.
    </p>

    <div class="acciones">
      <p-button
        label="Ir al inicio"
        icon="pi pi-home"
        (onClick)="navegarAlInicio()"
        severity="primary" />

      <p-button
        label="Cerrar sesion"
        icon="pi pi-sign-out"
        (onClick)="cerrarSesion()"
        severity="secondary"
        [outlined]="true" />
    </div>
  </div>
</div>
```

**Archivo nuevo:** `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.scss`

```scss
.acceso-denegado-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;

  .acceso-denegado-card {
    text-align: center;
    max-width: 480px;
    padding: 3rem 2rem;
    border-radius: 12px;
    background: var(--surface-card);
    box-shadow: var(--card-shadow);

    .icono-error {
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.75rem;
      color: var(--text-color);
      margin-bottom: 1rem;
    }

    .mensaje-principal {
      color: var(--text-color-secondary);
      font-size: 1.1rem;
      margin-bottom: 0.75rem;
    }

    .mensaje-usuario {
      background: var(--surface-ground);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .mensaje-contacto {
      color: var(--text-color-secondary);
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }

    .acciones {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
}
```

#### Paso 2: Registrar la ruta (ya incluida en la solucion de la seccion 1.1)

En `app.routes.ts`, la ruta ya se agrego como publica:

```typescript
{ path: 'acceso-denegado', component: AccesoDenegado },
```

#### Paso 3: Agregar alias en tsconfig para imports (si aplica)

Si el proyecto usa paths aliases como `@componentes`, verificar que el alias apunte al
directorio correcto e incluya `acceso-denegado`:

```json
// tsconfig.json — paths ya configurados
"@componentes/*": ["src/app/compartidos/componentes/*"]
```

El import en `app.routes.ts` quedaria:
```typescript
import { AccesoDenegado } from '@componentes/acceso-denegado/acceso-denegado';
```

### Criterios de aceptacion

- [ ] Navegar a `/acceso-denegado` directamente muestra el componente sin errores
- [ ] Un usuario con rol `usuario` que intenta acceder a `/gestion` es redirigido a
  `/acceso-denegado` y ve la vista correctamente
- [ ] Los botones "Ir al inicio" y "Cerrar sesion" funcionan
- [ ] El componente se muestra correctamente en mobile (flex-wrap en .acciones)
- [ ] La compilacion no reporta errores de importacion

### Posibles riesgos

- **Riesgo minimo:** Solo requiere crear tres archivos nuevos y agregar una ruta publica.
  No hay breaking changes.
- Verificar que `PrimengModule` incluya `p-button` o agregar `ButtonModule` directamente
  en los imports del componente standalone.

---

## 1.7 Limpieza de Configuracion [BAJO - 30min]

### Descripcion del problema

#### 7a. Analytics ID en angular.json

El archivo `angular.json` contiene en la linea 124:

```json
"cli": {
  "analytics": "d6259a39-3767-43be-9013-372f9e5ac5aa"
}
```

Este UUID es el **ID de telemetria del Angular CLI** vinculado a la maquina del desarrollador.
Cuando este ID esta en el repositorio y el CI/CD ejecuta comandos ng, Angular CLI envia
metricas anonimas de uso a Google asociadas a ese ID. En un proyecto de una entidad publica
colombiana es preferible tener control explicito sobre que informacion sale del entorno.

**Riesgo adicional:** Si el proyecto se hace publico (open source en el futuro), este ID
queda expuesto en el historial de git.

#### Codigo de solucion

**Archivo modificado:** `angular.json`

Eliminar la seccion `cli.analytics`:

```json
// ANTES:
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": { ... },
  "cli": {
    "analytics": "d6259a39-3767-43be-9013-372f9e5ac5aa"
  }
}

// DESPUES:
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": { ... }
}
```

**Deshabilitar analytics globalmente en el proyecto** (opcional, mas explicito):

```json
"cli": {
  "analytics": false
}
```

Esto deshabilita explicitamente la telemetria para cualquier desarrollador que clone el
repositorio, sin depender de la configuracion personal de su maquina.

#### 7b. Resolver coexistencia package-lock.json y yarn.lock (si aplica)

Si el informe de calidad identifico que coexisten `package-lock.json` y `yarn.lock` en el
repositorio, mantener solo el gestor de paquetes que use el equipo (recomendado: npm por
compatibilidad con las instrucciones del CLAUDE.md):

```bash
# Si el equipo usa npm:
rm yarn.lock
echo "yarn.lock" >> .gitignore  # Prevenir que vuelva a aparecer

# Si el equipo usa yarn:
rm package-lock.json
echo "package-lock.json" >> .gitignore
```

Agregar al `.gitignore` el lockfile que no se usa para evitar conflictos futuros.

### Criterios de aceptacion

- [ ] `grep "analytics" angular.json` retorna cero resultados, o retorna `"analytics": false`
- [ ] Los comandos `ng build` y `ng serve` siguen funcionando sin el campo analytics
- [ ] El repositorio no tiene ambos `package-lock.json` y `yarn.lock` comprometidos
- [ ] Los pipelines de CI/CD siguen funcionando (verificar que usen el gestor correcto)

### Posibles riesgos

- **Sin riesgos de funcionalidad.** El campo `analytics` solo afecta la telemetria del CLI,
  no el build ni el comportamiento de la aplicacion.

---

## Resumen de Esfuerzo — Seguridad

| Item | Problema | Prioridad | Esfuerzo | Sprint recomendado |
|------|----------|-----------|----------|--------------------|
| 1.1 Aplicar guards en rutas | Rutas sin proteccion | CRITICO | 1h | Sprint 1 — inmediato |
| 1.2 Actualizar Angular | CVE XSS GHSA-jrmj-c5cx-3cw6 | CRITICO | 2h | Sprint 1 — inmediato |
| 1.3 Refactorizar SafePipe | Bypass total de sanitizacion | ALTO | 4h | Sprint 1 |
| 1.4 Condicionar login dev | Boton dev visible en produccion | MEDIO | 1h | Sprint 1 |
| 1.5 Mejorar determinacion roles | Roles por contenido de email | MEDIO | 3h | Sprint 2* |
| 1.6 Vista /acceso-denegado | Ruta referenciada pero inexistente | BAJO | 2h | Sprint 1** |
| 1.7 Limpieza configuracion | Analytics ID en repo | BAJO | 30min | Sprint 1 |

**Total estimado:** 13.5 horas (aprox. 2 dias de trabajo)

**Notas:**

- `*` El item 1.5 tiene dependencia de backend (rund-auth debe exponer el campo `rol` en su
  respuesta). Implementar en Sprint 2 coordinando con el equipo de backend. Mientras tanto,
  envolver el codigo de roles por email en una condicion de entorno (ver seccion 1.5).

- `**` El item 1.6 debe completarse antes o en paralelo con el 1.1, ya que `adminGuard`
  redirige a `/acceso-denegado` — si la ruta no existe al aplicar el guard, el comportamiento
  es incorrecto.

### Orden de implementacion recomendado

```
1. Item 1.6 (crear componente acceso-denegado)         <- prerequisito para 1.1
2. Item 1.1 (aplicar guards en rutas)                  <- seguridad critica
3. Item 1.2 (actualizar Angular)                       <- CVE critica
4. Item 1.7 (limpieza angular.json)                    <- bajo esfuerzo, aprovechar el PR
5. Item 1.4 (condicionar login dev)                    <- bajo esfuerzo
6. Item 1.3 (refactorizar SafePipe)                    <- requiere analisis de usos en plantillas
7. Item 1.5 (mejora de roles)                          <- coordinar con backend
```

---

*Plan elaborado el 2026-02-21 — Version 1.0*
*Basado en revision del codigo fuente de rund-mgp v20.3.15*
