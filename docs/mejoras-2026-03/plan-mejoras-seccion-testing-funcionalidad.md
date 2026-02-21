# Sección 3: Plan de Testing, Funcionalidad y Refactorización — rund-mgp

> **Contexto**: rund-mgp es un frontend Angular 20.3.15 con SSR para RUND (ESAP Colombia).
> Cobertura actual de pruebas: **0%** (cero archivos `.spec.ts` en `src/`).
> Este documento cubre las secciones 3.1, 3.2 y 3.3 del plan de mejoras general.

---

## 3.1 Estrategia de Pruebas Unitarias

### 3.1.1 Configuración Inicial

**Problema**: `angular.json` tiene `"skipTests": true` en los 8 tipos de schematics (`component`, `class`, `directive`, `guard`, `interceptor`, `pipe`, `resolver`, `service`). Además, `karma.conf.js` no existe — Angular 20 usa `@angular/build:karma` sin archivo de configuración explícito, pero no se ha configurado la cobertura de código.

**Esfuerzo estimado**: 30 minutos

**Solución — Cambiar `skipTests` en `angular.json`**:

```diff
// archivo: angular.json (fragmento)
  "schematics": {
    "@schematics/angular:component": {
      "style": "scss",
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:class": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:directive": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:guard": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:interceptor": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:pipe": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:resolver": {
-     "skipTests": true
+     "skipTests": false
    },
    "@schematics/angular:service": {
-     "skipTests": true
+     "skipTests": false
    }
  },
```

**Solución — Agregar cobertura de código en `angular.json`** (bloque `test`):

```diff
// archivo: angular.json (fragmento)
  "test": {
    "builder": "@angular/build:karma",
    "options": {
      "tsConfig": "tsconfig.spec.json",
      "inlineStyleLanguage": "scss",
+     "codeCoverage": true,
+     "codeCoverageExclude": [
+       "src/app/compartidos/modulos/**",
+       "src/app/compartidos/librerias/**",
+       "src/main.ts",
+       "src/main.server.ts",
+       "src/server.ts"
+     ],
      "assets": [
        {
          "glob": "**/*",
          "input": "public"
        }
      ],
      "styles": [
        "src/styles.scss"
      ]
    }
  }
```

**Solución — Crear `karma.conf.js`** en la raíz del proyecto para reportes de cobertura:

```javascript
// archivo: karma.conf.js
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // Para ver todos los fallos, no solo el primero
        stopSpecOnExpectationFailure: false,
      },
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/rund-mgp'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
      ],
      // Umbrales mínimos de cobertura — el build fallará si no se cumplen
      check: {
        global: {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
```

**Criterios de aceptación**:
- [ ] `ng test` ejecuta sin errores (aunque no haya specs todavía)
- [ ] `ng test --code-coverage` genera informe en `coverage/rund-mgp/`
- [ ] Los nuevos componentes generados con `ng generate` crean automáticamente el `.spec.ts`

---

### 3.1.2 Tests para Auth Service

**Problema**: `Auth` (`src/app/compartidos/servicios/auth.ts`) es el servicio más crítico de la aplicación — maneja sesiones, JWT y señales reactivas — y tiene 0% de cobertura. Cubre: `login()`, `logout()`, `verificarSesion()`, `refrescarJWT()`, `devLogin()`, `tienePermisos()`, `getAuth()` (deprecado), y los signals computados `estaAutenticado` y `esAdmin`.

**Esfuerzo estimado**: 1 día (8 horas)

**Prioridad**: ALTA — Es la base de seguridad de la aplicación.

**Crear**: `src/app/compartidos/servicios/auth.spec.ts`

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Auth, Usuario, LoginResponse, SessionResponse, LogoutResponse } from './auth';
import { ConfigService, AppConfig } from './config.service';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const USUARIO_ADMIN: Usuario = {
  sub: '123',
  name: 'Usuario Administrador',
  email: 'usuario.administrador@esap.edu.co',
  tid: 'tenant-001',
  rol: 'admin',
};

const USUARIO_GESTOR: Usuario = {
  sub: '456',
  name: 'María Gestora',
  email: 'maria.gestora@esap.edu.co',
  tid: 'tenant-001',
  rol: 'gestor',
};

const USUARIO_REGULAR: Usuario = {
  sub: '789',
  name: 'Juan Docente',
  email: 'juan.docente@esap.edu.co',
  tid: 'tenant-001',
  rol: 'usuario',
};

const LOGIN_RESPONSE_OK: LoginResponse = {
  success: true,
  user: USUARIO_GESTOR,
  session_id: 'sess-abc-123',
};

const SESSION_RESPONSE_OK: SessionResponse = {
  success: true,
  user: USUARIO_GESTOR,
  session_id: 'sess-abc-123',
  should_refresh: false,
  last_activity: Date.now(),
};

const CONFIG_MOCK: AppConfig = {
  apiBaseUrl: 'http://localhost:3000',
  environment: 'test',
  version: '1.0.0',
};

// ─── Mock ConfigService ─────────────────────────────────────────────────────

class ConfigServiceMock {
  getApiBaseUrl(): string { return CONFIG_MOCK.apiBaseUrl; }
  getConfig(): AppConfig { return CONFIG_MOCK; }
  isLoaded(): boolean { return true; }
}

// ─── Suite de pruebas ───────────────────────────────────────────────────────

describe('Auth Service', () => {
  let service: Auth;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        Auth,
        { provide: ConfigService, useClass: ConfigServiceMock },
      ],
    });
    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verificar que no quedan peticiones HTTP sin resolver
  });

  // ─── Estado inicial ──────────────────────────────────────────────────────

  describe('Estado inicial de signals', () => {
    it('usuario debe ser undefined al inicio', () => {
      expect(service.usuario()).toBeUndefined();
    });

    it('cargando debe ser false al inicio', () => {
      expect(service.cargando()).toBeFalse();
    });

    it('error debe ser null al inicio', () => {
      expect(service.error()).toBeNull();
    });

    it('estaAutenticado debe ser false al inicio', () => {
      expect(service.estaAutenticado()).toBeFalse();
    });

    it('esAdmin debe ser false al inicio', () => {
      expect(service.esAdmin()).toBeFalse();
    });
  });

  // ─── login() ─────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('debe autenticar correctamente con credenciales válidas', fakeAsync(() => {
      let resultado: LoginResponse | undefined;
      service.login('gestor001', 'password123').subscribe(r => (resultado = r));

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'gestor001', password: 'password123' });
      expect(req.request.withCredentials).toBeTrue();
      req.flush(LOGIN_RESPONSE_OK);
      tick();

      expect(resultado!.success).toBeTrue();
      expect(service.usuario()?.email).toBe(USUARIO_GESTOR.email);
      expect(service.estaAutenticado()).toBeTrue();
      expect(service.cargando()).toBeFalse();
      expect(service.error()).toBeNull();
    }));

    it('debe manejar error de credenciales incorrectas', fakeAsync(() => {
      let resultado: LoginResponse | undefined;
      service.login('gestor001', 'wrong').subscribe(r => (resultado = r));

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/login');
      req.flush(
        { error: 'Credenciales incorrectas', code: 'INVALID_CREDENTIALS' },
        { status: 401, statusText: 'Unauthorized' }
      );
      tick();

      expect(resultado!.success).toBeFalse();
      expect(service.usuario()).toBeNull();
      expect(service.estaAutenticado()).toBeFalse();
      expect(service.error()).toBe('Credenciales incorrectas');
      expect(service.cargando()).toBeFalse();
    }));

    it('debe manejar error de red (status 0)', fakeAsync(() => {
      let resultado: LoginResponse | undefined;
      service.login('gestor001', 'password').subscribe(r => (resultado = r));

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/login');
      req.flush(null, { status: 0, statusText: 'Unknown Error' });
      tick();

      expect(resultado!.success).toBeFalse();
      expect(service.error()).toBe('Error de autenticación');
    }));

    it('debe activar cargando durante la petición', () => {
      service.login('gestor001', 'password').subscribe();
      expect(service.cargando()).toBeTrue();

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/login');
      req.flush(LOGIN_RESPONSE_OK);
    });

    it('debe detectar rol admin por email que contiene usuario.administrador', fakeAsync(() => {
      const responseAdmin: LoginResponse = {
        success: true,
        user: USUARIO_ADMIN,
        session_id: 'sess-admin',
      };
      service.login('admin001', 'password').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/login');
      req.flush(responseAdmin);
      tick();

      expect(service.esAdmin()).toBeTrue();
    }));
  });

  // ─── logout() ────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('debe limpiar el usuario y navegar a login en logout exitoso', fakeAsync(() => {
      // Primero establecer un usuario autenticado
      service.login('gestor001', 'password').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login').flush(LOGIN_RESPONSE_OK);
      tick();

      expect(service.estaAutenticado()).toBeTrue();

      let logoutResp: LogoutResponse | undefined;
      service.logout().subscribe(r => (logoutResp = r));

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ success: true, message: 'Sesión cerrada' });
      tick();

      expect(service.usuario()).toBeNull();
      expect(service.estaAutenticado()).toBeFalse();
      expect(service.cargando()).toBeFalse();
    }));

    it('debe limpiar localmente aunque falle el logout en el servidor', fakeAsync(() => {
      service.login('gestor001', 'password').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login').flush(LOGIN_RESPONSE_OK);
      tick();

      service.logout().subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/logout')
        .flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });
      tick();

      // Aunque falle, debe limpiar el estado local
      expect(service.usuario()).toBeNull();
      expect(service.estaAutenticado()).toBeFalse();
    }));
  });

  // ─── verificarSesion() ───────────────────────────────────────────────────

  describe('verificarSesion()', () => {
    it('debe actualizar el usuario cuando la sesión es válida', fakeAsync(() => {
      let resultado: SessionResponse | undefined;
      service.verificarSesion().subscribe(r => (resultado = r));

      const req = httpMock.expectOne('http://localhost:3000/api/v2/auth/session');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush(SESSION_RESPONSE_OK);
      tick();

      expect(resultado!.success).toBeTrue();
      expect(service.usuario()?.email).toBe(USUARIO_GESTOR.email);
      expect(service.estaAutenticado()).toBeTrue();
    }));

    it('debe llamar refrescarJWT cuando should_refresh es true', fakeAsync(() => {
      const refreshSpy = spyOn(service, 'refrescarJWT').and.callThrough();
      const sessionConRefresh: SessionResponse = { ...SESSION_RESPONSE_OK, should_refresh: true };

      service.verificarSesion().subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/session').flush(sessionConRefresh);
      tick();

      expect(refreshSpy).toHaveBeenCalled();
      // Resolver la petición de refresh
      httpMock.expectOne('http://localhost:3000/api/v2/auth/refresh').flush({ success: true });
    }));

    it('debe poner usuario en null cuando la sesión no es válida', fakeAsync(() => {
      service.verificarSesion().subscribe();

      httpMock.expectOne('http://localhost:3000/api/v2/auth/session')
        .flush({ success: false, user: null, session_id: '', should_refresh: false, last_activity: 0 });
      tick();

      expect(service.usuario()).toBeNull();
      expect(service.estaAutenticado()).toBeFalse();
    }));

    it('debe manejar error de red poniendo usuario en null', fakeAsync(() => {
      service.verificarSesion().subscribe();

      httpMock.expectOne('http://localhost:3000/api/v2/auth/session')
        .flush(null, { status: 0, statusText: 'Network Error' });
      tick();

      expect(service.usuario()).toBeNull();
    }));
  });

  // ─── Computed signals ────────────────────────────────────────────────────

  describe('estaAutenticado (computed)', () => {
    it('debe ser false cuando usuario es undefined', () => {
      expect(service.estaAutenticado()).toBeFalse();
    });

    it('debe ser true cuando hay un usuario válido', fakeAsync(() => {
      service.login('u', 'p').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login').flush(LOGIN_RESPONSE_OK);
      tick();

      expect(service.estaAutenticado()).toBeTrue();
    }));
  });

  describe('esAdmin (computed)', () => {
    it('debe ser true para usuario con rol admin', fakeAsync(() => {
      const adminResponse: LoginResponse = { success: true, user: USUARIO_ADMIN, session_id: 'sess' };
      service.login('a', 'p').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login').flush(adminResponse);
      tick();

      expect(service.esAdmin()).toBeTrue();
    }));

    it('debe ser false para usuario con rol gestor', fakeAsync(() => {
      service.login('g', 'p').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login').flush(LOGIN_RESPONSE_OK);
      tick();

      expect(service.esAdmin()).toBeFalse();
    }));
  });

  // ─── tienePermisos() ─────────────────────────────────────────────────────

  describe('tienePermisos()', () => {
    it('admin debe tener todos los permisos', fakeAsync(() => {
      service.login('a', 'p').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login')
        .flush({ success: true, user: USUARIO_ADMIN, session_id: 'sess' });
      tick();

      expect(service.tienePermisos('admin')).toBeTrue();
      expect(service.tienePermisos('gestor')).toBeTrue();
      expect(service.tienePermisos('directivo')).toBeTrue();
      expect(service.tienePermisos('usuario')).toBeTrue();
    }));

    it('usuario regular solo debe tener permisos de usuario', fakeAsync(() => {
      service.login('u', 'p').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login')
        .flush({ success: true, user: USUARIO_REGULAR, session_id: 'sess' });
      tick();

      expect(service.tienePermisos('usuario')).toBeTrue();
      expect(service.tienePermisos('directivo')).toBeFalse();
      expect(service.tienePermisos('gestor')).toBeFalse();
      expect(service.tienePermisos('admin')).toBeFalse();
    }));

    it('debe aceptar rol explícito como parámetro', () => {
      expect(service.tienePermisos('gestor', 'admin')).toBeTrue();
      expect(service.tienePermisos('admin', 'gestor')).toBeFalse();
    });
  });

  // ─── getAuth() deprecado ─────────────────────────────────────────────────

  describe('getAuth() [deprecado]', () => {
    it('debe emitir console.warn y llamar verificarSesion()', () => {
      const warnSpy = spyOn(console, 'warn');
      const verificarSpy = spyOn(service, 'verificarSesion').and.returnValue({
        subscribe: () => {},
      } as any);

      service.getAuth();

      expect(warnSpy).toHaveBeenCalledWith('getAuth() está deprecado. Usar login() en su lugar.');
      expect(verificarSpy).toHaveBeenCalled();
    });
  });

  // ─── limpiarError() ──────────────────────────────────────────────────────

  describe('limpiarError()', () => {
    it('debe limpiar el error existente', fakeAsync(() => {
      service.login('u', 'wrong').subscribe();
      httpMock.expectOne('http://localhost:3000/api/v2/auth/login')
        .flush({ error: 'Credenciales incorrectas' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(service.error()).not.toBeNull();

      service.limpiarError();
      expect(service.error()).toBeNull();
    }));
  });
});
```

**Criterios de aceptación**:
- [ ] Todos los tests pasan (`ng test`)
- [ ] Cobertura de `auth.ts` >= 85% en statements y lines
- [ ] Se prueban los flujos de error y éxito de cada método público
- [ ] Los signals reactivos (`estaAutenticado`, `esAdmin`) se prueban directamente

---

### 3.1.3 Tests para ConfigService

**Problema**: `ConfigService` es inicializado por `APP_INITIALIZER` antes que cualquier otro servicio. Si falla y no tiene fallback probado, la aplicación no arranca. El error silencioso en producción es indetectable sin tests.

**Esfuerzo estimado**: 4 horas

**Prioridad**: MEDIA

**Crear**: `src/app/compartidos/servicios/config.service.spec.ts`

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigService, AppConfig } from './config.service';

const CONFIG_PROD: AppConfig = {
  apiBaseUrl: 'http://rund-api:3000',
  environment: 'production',
  version: '2.1.0',
};

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConfigService],
    });
    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── Estado inicial ──────────────────────────────────────────────────────

  describe('Estado inicial', () => {
    it('isLoaded() debe ser false antes de cargar', () => {
      expect(service.isLoaded()).toBeFalse();
    });

    it('getApiBaseUrl() debe retornar valor por defecto antes de cargar', () => {
      expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
    });

    it('getConfig() debe retornar config por defecto antes de cargar', () => {
      const config = service.getConfig();
      expect(config.apiBaseUrl).toBe('http://localhost:3000');
      expect(config.environment).toBe('development');
    });
  });

  // ─── loadConfig() exitoso ────────────────────────────────────────────────

  describe('loadConfig() — caso exitoso', () => {
    it('debe cargar la configuración desde /api/config', fakeAsync(async () => {
      const promise = service.loadConfig();

      const req = httpMock.expectOne('/api/config');
      expect(req.request.method).toBe('GET');
      req.flush(CONFIG_PROD);
      tick();
      await promise;

      expect(service.isLoaded()).toBeTrue();
      expect(service.getApiBaseUrl()).toBe('http://rund-api:3000');
      expect(service.getConfig().environment).toBe('production');
      expect(service.getConfig().version).toBe('2.1.0');
    }));

    it('no debe hacer una segunda petición si ya está cargado', fakeAsync(async () => {
      // Primera carga
      const p1 = service.loadConfig();
      httpMock.expectOne('/api/config').flush(CONFIG_PROD);
      tick();
      await p1;

      // Segunda llamada — no debe generar petición HTTP
      const p2 = service.loadConfig();
      httpMock.expectNone('/api/config');
      await p2;

      expect(service.isLoaded()).toBeTrue();
    }));
  });

  // ─── loadConfig() con error (fallback) ──────────────────────────────────

  describe('loadConfig() — caso de error con fallback', () => {
    it('debe usar valores por defecto si el servidor falla con 500', fakeAsync(async () => {
      const promise = service.loadConfig();

      httpMock.expectOne('/api/config')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });
      tick();
      await promise;

      // Con fallback, sigue marcado como cargado
      expect(service.isLoaded()).toBeTrue();
      expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
      expect(service.getConfig().environment).toBe('development');
    }));

    it('debe usar valores por defecto si no hay red (status 0)', fakeAsync(async () => {
      const consoleSpy = spyOn(console, 'error');
      const promise = service.loadConfig();

      httpMock.expectOne('/api/config')
        .flush(null, { status: 0, statusText: 'Network Error' });
      tick();
      await promise;

      expect(service.isLoaded()).toBeTrue();
      expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
      expect(consoleSpy).toHaveBeenCalled();
    }));
  });

  // ─── getApiBaseUrl() ─────────────────────────────────────────────────────

  describe('getApiBaseUrl()', () => {
    it('debe retornar la URL cargada del servidor', fakeAsync(async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('/api/config').flush(CONFIG_PROD);
      tick();
      await promise;

      expect(service.getApiBaseUrl()).toBe('http://rund-api:3000');
    }));

    it('debe retornar localhost:3000 como fallback', () => {
      expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
    });
  });
});
```

**Criterios de aceptación**:
- [ ] Se prueba la carga exitosa de configuración
- [ ] Se prueba el fallback cuando el servidor no responde
- [ ] Se verifica que no se hacen peticiones dobles
- [ ] Cobertura de `config.service.ts` >= 90%

---

### 3.1.4 Tests para Guards

**Problema**: `authGuard` y `adminGuard` son las puertas de acceso a todas las rutas protegidas. Un bug aquí puede: (a) bloquear el acceso a usuarios legítimos, o (b) permitir acceso no autorizado. Sin tests, cualquier cambio futuro es peligroso.

**Esfuerzo estimado**: 4 horas

**Prioridad**: MEDIA

**Crear**: `src/app/compartidos/guards/auth-guard.spec.ts`

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { authGuard, adminGuard } from './auth-guard';
import { Auth } from '../servicios/auth';
import { SessionResponse } from '../servicios/auth';

// ─── Mocks ────────────────────────────────────────────────────────────────

const SESSION_OK: SessionResponse = {
  success: true,
  user: {
    sub: '1',
    name: 'Test',
    email: 'test@esap.edu.co',
    tid: 't1',
    rol: 'gestor',
  },
  session_id: 'sess',
  should_refresh: false,
  last_activity: Date.now(),
};

const SESSION_FAIL: SessionResponse = {
  success: false,
  user: {} as any,
  session_id: '',
  should_refresh: false,
  last_activity: 0,
};

// Creamos una ruta y estado de ruta falsos para los guards funcionales
const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = { url: '/dashboard' } as RouterStateSnapshot;

// ─── authGuard ────────────────────────────────────────────────────────────

describe('authGuard', () => {
  let authMock: jasmine.SpyObj<Auth>;
  let router: Router;

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
  }

  beforeEach(() => {
    authMock = jasmine.createSpyObj<Auth>('Auth', [
      'estaAutenticado',
      'verificarSesion',
    ]);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [{ provide: Auth, useValue: authMock }],
    });
    router = TestBed.inject(Router);
  });

  it('debe permitir acceso cuando ya está autenticado en memoria', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(true);

    const result = runGuard();
    expect(result).toBeTrue();
  }));

  it('debe verificar sesión en servidor si no está autenticado en memoria', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(false);
    authMock.verificarSesion.and.returnValue(of(SESSION_OK));

    const navigateSpy = spyOn(router, 'navigate');
    let result: boolean | undefined;

    (runGuard() as any).subscribe((r: boolean) => (result = r));
    tick();

    expect(authMock.verificarSesion).toHaveBeenCalled();
    expect(result).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  }));

  it('debe redirigir a /login con returnUrl si la sesión no es válida', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(false);
    authMock.verificarSesion.and.returnValue(of(SESSION_FAIL));

    const navigateSpy = spyOn(router, 'navigate');
    let result: boolean | undefined;

    (runGuard() as any).subscribe((r: boolean) => (result = r));
    tick();

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/dashboard' } })
    );
  }));
});

// ─── adminGuard ───────────────────────────────────────────────────────────

describe('adminGuard', () => {
  let authMock: jasmine.SpyObj<Auth>;
  let router: Router;

  function runGuard() {
    return TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
  }

  beforeEach(() => {
    authMock = jasmine.createSpyObj<Auth>('Auth', [
      'estaAutenticado',
      'esAdmin',
      'verificarSesion',
    ]);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [{ provide: Auth, useValue: authMock }],
    });
    router = TestBed.inject(Router);
  });

  it('debe permitir acceso a admin autenticado en memoria', () => {
    authMock.estaAutenticado.and.returnValue(true);
    authMock.esAdmin.and.returnValue(true);

    const result = runGuard();
    expect(result).toBeTrue();
  });

  it('debe redirigir a /acceso-denegado si está autenticado pero no es admin', () => {
    authMock.estaAutenticado.and.returnValue(true);
    authMock.esAdmin.and.returnValue(false);

    const navigateSpy = spyOn(router, 'navigate');
    const result = runGuard();

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/acceso-denegado']);
  });

  it('debe verificar sesión si no está autenticado, y permitir si es admin', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(false);
    authMock.verificarSesion.and.returnValue(of(SESSION_OK));
    authMock.esAdmin.and.returnValue(true);

    let result: boolean | undefined;
    (runGuard() as any).subscribe((r: boolean) => (result = r));
    tick();

    expect(result).toBeTrue();
  }));

  it('debe verificar sesión y redirigir a /login si no está autenticado', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(false);
    authMock.verificarSesion.and.returnValue(of(SESSION_FAIL));

    const navigateSpy = spyOn(router, 'navigate');
    let result: boolean | undefined;

    (runGuard() as any).subscribe((r: boolean) => (result = r));
    tick();

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/dashboard' } })
    );
  }));

  it('debe redirigir a /acceso-denegado si sesión válida pero no es admin', fakeAsync(() => {
    authMock.estaAutenticado.and.returnValue(false);
    authMock.verificarSesion.and.returnValue(of(SESSION_OK));
    authMock.esAdmin.and.returnValue(false);

    const navigateSpy = spyOn(router, 'navigate');
    let result: boolean | undefined;

    (runGuard() as any).subscribe((r: boolean) => (result = r));
    tick();

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/acceso-denegado']);
  }));
});
```

**Criterios de aceptación**:
- [ ] Los 8 casos de prueba pasan
- [ ] Se cubre el caso sincrono (signal en memoria) y asíncrono (verificación servidor)
- [ ] Se verifica que `/acceso-denegado` se usa correctamente en `adminGuard`
- [ ] Cobertura de `auth-guard.ts` >= 90%

---

### 3.1.5 Tests para authInterceptor

**Problema**: El interceptor maneja `withCredentials`, redireccionamiento en 401, y navegación a `/acceso-denegado` en 403. Un error aquí afecta toda la capa HTTP.

**Esfuerzo estimado**: 3 horas

**Prioridad**: MEDIA

**Crear**: `src/app/compartidos/interceptores/auth-interceptor.spec.ts`

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authInterceptor } from './auth-interceptor';
import { Auth } from '../servicios/auth';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let router: Router;
  let authMock: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj<Auth>('Auth', ['logout']);
    authMock.logout.and.returnValue(of({ success: true, message: 'ok' }));

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        { provide: Auth, useValue: authMock },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe añadir withCredentials a peticiones que incluyen /api/', fakeAsync(() => {
    http.get('http://localhost:3000/api/v2/datos').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/v2/datos');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  }));

  it('debe añadir withCredentials a peticiones que incluyen localhost:3000', fakeAsync(() => {
    http.get('http://localhost:3000/health').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/health');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  }));

  it('NO debe añadir withCredentials a peticiones externas', fakeAsync(() => {
    http.get('https://cdn.example.com/assets/logo.png').subscribe({ error: () => {} });

    const req = httpMock.expectOne('https://cdn.example.com/assets/logo.png');
    expect(req.request.withCredentials).toBeFalse();
    req.flush({});
  }));

  it('debe llamar logout() y redirigir a /login en error 401', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');

    http.get('http://localhost:3000/api/protected').subscribe({ error: () => {} });

    httpMock.expectOne('http://localhost:3000/api/protected')
      .flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(authMock.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: jasmine.any(Object) })
    );
  }));

  it('debe redirigir a /acceso-denegado en error 403', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');

    http.get('http://localhost:3000/api/admin').subscribe({ error: () => {} });

    httpMock.expectOne('http://localhost:3000/api/admin')
      .flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/acceso-denegado']);
  }));

  it('debe emitir console.error en error de red (status 0)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');

    http.get('http://localhost:3000/api/datos').subscribe({ error: () => {} });

    httpMock.expectOne('http://localhost:3000/api/datos')
      .flush(null, { status: 0, statusText: 'Network Error' });
    tick();

    expect(consoleSpy).toHaveBeenCalled();
  }));

  it('debe re-lanzar el error para que los componentes puedan manejarlo', fakeAsync(() => {
    let errorCapturado: any;

    http.get('http://localhost:3000/api/datos').subscribe({
      error: (e) => (errorCapturado = e),
    });

    httpMock.expectOne('http://localhost:3000/api/datos')
      .flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    tick();

    expect(errorCapturado).toBeTruthy();
    expect(errorCapturado.status).toBe(404);
  }));
});
```

**Criterios de aceptación**:
- [ ] Los 7 tests pasan
- [ ] Se verifica el comportamiento de `withCredentials` según la URL
- [ ] El flujo 401 → logout + redirect está cubierto
- [ ] El flujo 403 → `/acceso-denegado` está cubierto
- [ ] Cobertura de `auth-interceptor.ts` >= 90%

---

### 3.1.6 Tests para SafePipe

**Problema**: `SafePipe` usa `bypassSecurityTrust*` del sanitizador de Angular. Un bypass incorrecto puede abrir vulnerabilidades XSS. Aunque la lógica es simple, los tests documentan el contrato y evitan regresiones.

**Esfuerzo estimado**: 2 horas

**Prioridad**: BAJA

**Crear**: `src/app/compartidos/pipes/safe-pipe.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { SafePipe } from './safe-pipe';

describe('SafePipe', () => {
  let pipe: SafePipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BrowserModule],
    });
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new SafePipe(sanitizer);
  });

  it('debe crear la instancia', () => {
    expect(pipe).toBeTruthy();
  });

  it('debe sanitizar HTML con tipo "html"', () => {
    const resultado = pipe.transform('<b>Texto seguro</b>', 'html');
    expect(resultado).toBeTruthy();
    // El resultado es un SafeHtml (objeto envuelto por Angular)
    expect(typeof resultado).not.toBe('string');
  });

  it('debe sanitizar URL con tipo "url"', () => {
    const resultado = pipe.transform('https://esap.edu.co', 'url');
    expect(resultado).toBeTruthy();
  });

  it('debe sanitizar resourceUrl con tipo "resourceUrl"', () => {
    const resultado = pipe.transform('https://esap.edu.co/embed', 'resourceUrl');
    expect(resultado).toBeTruthy();
  });

  it('debe sanitizar style con tipo "style"', () => {
    const resultado = pipe.transform('color: red', 'style');
    expect(resultado).toBeTruthy();
  });

  it('debe sanitizar script con tipo "script"', () => {
    const resultado = pipe.transform('console.log("test")', 'script');
    expect(resultado).toBeTruthy();
  });

  it('debe lanzar error para tipo desconocido', () => {
    expect(() => pipe.transform('valor', 'tipoInvalido')).toThrowError(
      'Invalid safe type specified: tipoInvalido'
    );
  });

  it('debe manejar cadena vacía sin errores', () => {
    expect(() => pipe.transform('', 'html')).not.toThrow();
  });
});
```

**Criterios de aceptación**:
- [ ] Los 8 tests pasan
- [ ] Se cubre el caso de tipo inválido (lanzar error)
- [ ] Cobertura de `safe-pipe.ts` >= 95%

---

### 3.1.7 Meta de Cobertura y CI/CD

**Umbrales mínimos** (configurados en `karma.conf.js` en sección 3.1.1):

| Métrica     | Umbral mínimo |
|-------------|--------------|
| Statements  | 70%          |
| Branches    | 60%          |
| Functions   | 70%          |
| Lines       | 70%          |

**Script de verificación de cobertura** para agregar en `package.json`:

```json
{
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadless --code-coverage",
    "test:coverage": "ng test --watch=false --code-coverage && open coverage/rund-mgp/index.html"
  }
}
```

**Integración en pipeline CI** (ejemplo para GitHub Actions o GitLab CI):

```yaml
# .github/workflows/test.yml (o equivalente)
test-frontend:
  stage: test
  script:
    - cd rund-mgp
    - npm ci
    - npm run test:ci
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: rund-mgp/coverage/rund-mgp/cobertura-coverage.xml
    paths:
      - rund-mgp/coverage/
```

**Criterios de aceptación**:
- [ ] `npm run test:ci` ejecuta en entorno headless sin errores
- [ ] El build del pipeline falla si no se alcanzan los umbrales
- [ ] El informe de cobertura en HTML se genera correctamente

---

## 3.2 Mejoras de Funcionalidad

### 3.2.1 Componente `/acceso-denegado`

**Problema**: Tanto `adminGuard` (en `auth-guard.ts`, línea 82) como `authInterceptor` (en `auth-interceptor.ts`, línea 46) redirigen a `/acceso-denegado` ante acceso no autorizado. Sin embargo, esta ruta no existe en `app.routes.ts` — el router usa el wildcard `'**'` que redirige a `/listados`, produciendo un comportamiento silenciosamente incorrecto y una pésima experiencia de usuario.

**Esfuerzo estimado**: 2 horas

**Prioridad**: ALTA (es un bug funcional activo)

**Solución — Crear componente**:

```
ng generate component compartidos/componentes/acceso-denegado --standalone
```

**Archivo**: `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.ts`

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@servicios/auth';

/**
 * Componente que se muestra cuando un usuario autenticado intenta acceder
 * a un recurso para el que no tiene permisos suficientes (error 403 o adminGuard).
 */
@Component({
  selector: 'mgp-acceso-denegado',
  standalone: true,
  templateUrl: './acceso-denegado.html',
  styleUrl: './acceso-denegado.scss',
})
export class AccesoDenegado {
  private router = inject(Router);
  private auth = inject(Auth);

  get nombreUsuario(): string {
    return this.auth.usuario()?.name ?? 'usuario';
  }

  get rolUsuario(): string {
    return this.auth.usuario()?.rol ?? 'usuario';
  }

  irAInicio(): void {
    this.router.navigate(['/']);
  }

  cerrarSesion(): void {
    this.auth.logout().subscribe();
  }
}
```

**Archivo**: `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.html`

```html
<div class="acceso-denegado-container">
  <div class="acceso-denegado-card">
    <div class="acceso-denegado-icono">
      <span class="material-symbols-outlined">lock</span>
    </div>

    <h1 class="acceso-denegado-titulo">Acceso denegado</h1>

    <p class="acceso-denegado-mensaje">
      Hola, <strong>{{ nombreUsuario }}</strong>. Tu cuenta tiene el perfil
      <strong>{{ rolUsuario }}</strong>, que no tiene permisos para acceder a esta sección.
    </p>

    <p class="acceso-denegado-submensaje">
      Si crees que esto es un error, comunícate con el administrador del sistema RUND.
    </p>

    <div class="acceso-denegado-acciones">
      <button
        class="btn-primario"
        (click)="irAInicio()"
        type="button">
        Ir al inicio
      </button>
      <button
        class="btn-secundario"
        (click)="cerrarSesion()"
        type="button">
        Cerrar sesión
      </button>
    </div>
  </div>
</div>
```

**Archivo**: `src/app/compartidos/componentes/acceso-denegado/acceso-denegado.scss`

```scss
.acceso-denegado-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px); // Descontar la altura del header
  padding: 2rem;
  background-color: var(--p-surface-ground);
}

.acceso-denegado-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem 2rem;
  background: var(--p-surface-card);
  border-radius: 12px;
  box-shadow: var(--p-card-shadow);
  max-width: 480px;
  text-align: center;
}

.acceso-denegado-icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--p-red-100);

  .material-symbols-outlined {
    font-size: 40px;
    color: var(--p-red-600);
  }
}

.acceso-denegado-titulo {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.acceso-denegado-mensaje {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.6;
}

.acceso-denegado-submensaje {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.acceso-denegado-acciones {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;

  button {
    padding: 0.625rem 1.5rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9375rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .btn-primario {
    background-color: var(--p-primary-color);
    color: var(--p-primary-contrast-color);

    &:hover {
      background-color: var(--p-primary-hover-color);
    }
  }

  .btn-secundario {
    background-color: transparent;
    color: var(--p-text-color);
    border: 1px solid var(--p-surface-border) !important;

    &:hover {
      background-color: var(--p-surface-hover);
    }
  }
}
```

**Actualizar `app.routes.ts`** para registrar la ruta:

```diff
// archivo: src/app/app.routes.ts
  import { Routes } from '@angular/router';
  import { Gestion } from '@vistas/gestion/gestion';
  import { Consultas } from '@vistas/consultas/consultas';
  import { Dashboard } from '@vistas/dashboard/dashboard';
  import { Certificados } from '@vistas/certificados/certificados';
  import { Herramientas } from '@vistas/herramientas/herramientas';
  import { Listados } from '@vistas/listados/listados';
  import { Validacion } from '@vistas/validacion/validacion';
  import { Login } from '@componentes/login/login';
+ import { AccesoDenegado } from '@componentes/acceso-denegado/acceso-denegado';

  export const routes: Routes = [
    { path: '', redirectTo: 'listados', pathMatch: 'full' },
    { path: 'login', component: Login },
+   { path: 'acceso-denegado', component: AccesoDenegado },
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

**Criterios de aceptación**:
- [ ] Navegar a `/acceso-denegado` muestra el componente (no redirige a listados)
- [ ] El botón "Ir al inicio" navega a `/`
- [ ] El botón "Cerrar sesión" llama a `auth.logout()` y redirige a `/login`
- [ ] El nombre y rol del usuario autenticado se muestran correctamente
- [ ] El diseño es responsive y usa los tokens de color de PrimeNG

---

### 3.2.2 Activar Dashboard y Consultas en el Menú

**Problema**: En `data.ts` (líneas 188-189), los items de menú para `Dashboard` y `Consultas` están comentados:

```typescript
// data.ts — línea 188
/*{ label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
{ label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },*/
```

Los componentes `Dashboard` (`dashboard.ts`) y `Consultas` (`consultas.ts`) están completamente implementados, tienen sus rutas registradas en `app.routes.ts`, y sus templates (`dashboard.html`, `consultas.html`) existen. El único impedimento es el comentario en el menú.

**Esfuerzo estimado**: 1 hora (incluye verificación de funcionamiento)

**Prioridad**: MEDIA

**Verificación previa antes de activar**:
1. Confirmar que `dashboard.html` y `consultas.html` existen y renderizan sin errores
2. Confirmar que la API endpoints usados (`/api/v2/categorias`, `/api/v2/cruce`) responden correctamente en el entorno

**Solución en `data.ts`**:

```diff
// archivo: src/app/compartidos/servicios/data.ts (líneas 187-195)
  public elementosMenu: MenuElemento[] = [
-   /*{ label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
-   { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },*/
+   { label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
+   { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },
    { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
    { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
    { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'gestor' },
    { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'gestor' },
    { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario' },
  ];
```

**Nota sobre roles**: El rol asignado es `'directivo'`, lo que significa que solo usuarios con rol `directivo` o superior (`gestor`, `admin`) verán estos items en el menú (según la jerarquía de `tienePermisos()`).

**Criterios de aceptación**:
- [ ] Usuarios con rol `directivo` o superior ven "Panel de control" y "Consultas" en el menú
- [ ] La ruta `/dashboard` carga el componente Dashboard sin errores en consola
- [ ] La ruta `/consultas` carga el componente Consultas sin errores en consola
- [ ] Los charts del Dashboard se renderizan cuando hay datos disponibles

---

### 3.2.3 Eliminar Código Muerto

**Problema 1**: `getAuth()` en `auth.ts` (líneas 311-316) está marcado como `@deprecated`. Es un método que no debería existir en producción — genera confusión y contiene un `console.warn` que contamina los logs.

**Problema 2**: `suficientesNodos()` en `consultas.ts` (líneas 178-183) tiene dos sentencias `return` consecutivas. La segunda (`return numDocs > (hijos * 5) && hijos > 1`) es código muerto — nunca se ejecuta. Lo mismo ocurre en `dashboard.ts` (líneas 85-90). Esto es probablemente lógica de negocio comentada de forma incorrecta.

**Esfuerzo estimado**: 30 minutos

**Prioridad**: BAJA (deuda técnica, no impacta funcionalidad)

**Solución 1 — Eliminar `getAuth()` de `auth.ts`**:

```diff
// archivo: src/app/compartidos/servicios/auth.ts
- /**
-  * Método legacy para compatibilidad con código existente
-  * @deprecated Usar login() en su lugar
-  */
- getAuth(): void {
-   console.warn('getAuth() está deprecado. Usar login() en su lugar.');
-   // Intentar verificar sesión
-   this.verificarSesion().subscribe();
- }
```

**Antes de eliminar**: Buscar en todo el proyecto si `getAuth()` se usa en algún componente:

```bash
grep -r "getAuth()" /rund-mgp/src/
# Si hay resultados, reemplazar los usos con verificarSesion() o login()
```

**Solución 2 — Corregir `suficientesNodos()` en `consultas.ts`**:

```diff
// archivo: src/app/vistas/consultas/consultas.ts (líneas 178-183)
  private suficientesNodos(nodo: DataCategoria): boolean {
    const hijos: number = nodo.children ? nodo.children.length : 0;
    const numDocs: number = this.sumaDocs(nodo);
-   return true;
-   return numDocs > (hijos * 5) && hijos > 1;
+   // TODO: Restaurar lógica real cuando los datos estén disponibles
+   // return numDocs > (hijos * 5) && hijos > 1;
+   return true; // Temporalmente siempre true para mostrar el componente
  }
```

**Solución 3 — Corregir `suficientesNodos()` en `dashboard.ts`**:

```diff
// archivo: src/app/vistas/dashboard/dashboard.ts (líneas 85-90)
  suficientesNodos(nodo: DataCategoria): boolean {
    const hijos: number = nodo.children ? nodo.children.length : 0;
    const numDocs: number = this.sumaDocs(nodo);
-   return true;
-   //return numDocs > (hijos * 5) && hijos > 1;
+   // TODO: Restaurar lógica real cuando los datos estén disponibles
+   // return numDocs > (hijos * 5) && hijos > 1;
+   return true; // Temporalmente siempre true para mostrar el componente
  }
```

**Nota**: El `return true` es intencional durante la fase actual de desarrollo. Se documenta con `// TODO` para que sea visible en una revisión futura. Si la lógica real se activa en el futuro, simplemente se descomenta.

**Criterios de aceptación**:
- [ ] No quedan referencias a `getAuth()` en el código fuente (verificar con grep)
- [ ] El código de `suficientesNodos()` tiene un solo `return` por rama
- [ ] TypeScript compila sin errores (`ng build` exitoso)
- [ ] ESLint (cuando se configure en 3.3.2) no reporta código inalcanzable

---

## 3.3 Refactorización del Servicio Data

### 3.3.1 División en Servicios Especializados

**Problema**: `data.ts` tiene 519 líneas y mezcla múltiples responsabilidades:
- Configuración del menú (elementos de navegación)
- Llamadas HTTP para categorías, cruces, documentos
- Llamadas HTTP para certificados y archivos
- Llamadas HTTP para listados y CSV
- Llamadas HTTP para firmas
- Lógica de transformación de datos (`setCategorias`, `tree2sel`)
- Gestión de colores de gráficos
- Definición de más de 20 interfaces/tipos (`DataCategoria`, `ChartData`, `MenuElemento`, etc.)

Un servicio con tantas responsabilidades viola el Principio de Responsabilidad Única y dificulta el testing unitario.

**Esfuerzo estimado**: 2 días (16 horas)

**Prioridad**: MEDIA (refactorización sin breaking changes)

**Propuesta de arquitectura — 5 servicios especializados**:

```
src/app/compartidos/servicios/
├── data.ts                  (existente — mantener como fachada)
├── data-types.ts            (NUEVO — todas las interfaces y tipos)
├── categoria.service.ts     (NUEVO — categorías y árbol de datos)
├── documento.service.ts     (NUEVO — generación y descarga de documentos)
├── listado.service.ts       (NUEVO — carga y consulta de listados)
└── menu.service.ts          (NUEVO — configuración del menú de navegación)
```

**Paso 1 — Extraer interfaces a `data-types.ts`**

Mover todas las interfaces y tipos de `data.ts` a un archivo dedicado. Esto es un cambio puro de organización sin lógica:

```typescript
// archivo: src/app/compartidos/servicios/data-types.ts
import { SelectItemGroup, TreeNode } from 'primeng/api';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { MenuItem } from 'primeng/api';
import { Rol } from '@servicios/auth';

export interface DataCategoria extends Omit<TreeNode, 'children'> {
  numDocs?: number;
  uuid: string;
  children?: DataCategoria[];
  path?: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string[];
  hoverBackgroundColor: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  plugins?: {
    legend?: {
      labels?: { usePointStyle?: boolean; color?: string; };
      position?: string;
    };
  };
}

export interface DataChart {
  nombre: string;
  data: ChartData;
  opciones: ChartOptions;
  tipoChart: 'pie' | 'bar';
}

export interface FilaTabla {
  label: string;
  data: number[];
}

export interface DataTabla {
  nomCol: string;
  nomFil: string;
  cols: string[];
  filas: FilaTabla[];
}

export interface VarData {
  categorias: CategoriaBase[];
  labels: { [key: string]: string };
}

export interface CategoriaBase {
  id: string;
  items: CategoriaBase[] | string[];
}

export interface MenuElemento extends MenuItem {
  tipo?: 'PrimeNG' | 'MaterialDesign';
  estilo?: 'material-symbols-outlined' | 'material-symbols-rounded';
  faIcon?: IconDefinition;
  rol: Rol;
}

export interface DatosCarpeta {
  origen: string[];
  categoria: string;
  label: string;
}

export interface ArchivoDocente {
  archivo: File;
  taxonomia: DatosCarpeta;
  tipo: string;
  formato: string;
  origen: string;
  esCedula: boolean;
}

export type DatoDemografico = { [key: string]: string[] | { [key: string]: string | string[] } };

export interface DatoArchivo {
  nombre: string;
  formato: string;
  tipo: string;
  origen: string;
}

export interface DatosProfesor {
  archivosProfesor: DatoArchivo[];
  datosDemograficos: DatoDemografico;
}

export type ListadoProps = { label: string; valor: any };

export namespace Documento {
  export interface ElementoPieTabla { colspan: number; texto: string; }
  export interface Origen {
    categoria: 'Listados';
    tipo: string;
    nombre: string;
    formato: TipoListado.Formato;
    extension: TipoListado.Extension;
  }
  export interface Tabla { encabezados: string[]; filas: string[][]; pie?: ElementoPieTabla[]; }
  export interface Firma { nombre: string; cargo: string; imagen: string; uuid?: string; }
  export interface Estructura {
    tipo: 'parrafo' | 'tabla' | 'firma';
    fontSize: number;
    fontWeight: 'regular' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    marginTop?: string;
    value: any | string | Tabla | Firma;
  }
  export interface Plantilla { plantilla: string; estructura: Estructura[]; }
  export interface Dato {
    label: string;
    value: any;
    type: 'text' | 'number' | 'multi' | 'select';
    encabezados: string[];
    plantilla: Plantilla;
    origen?: Origen;
    options?: any[];
  }
  export interface Listado { grupos: SelectItemGroup[]; datos: Dato[]; }
}

export namespace TipoListado {
  export type Origen = 'OneDrive ESAP' | 'ARCA' | 'RUND Side-car';
  export type Formato = 'Excel XLSX' | 'CSV';
  export type Extension = '.xlsx' | '.csv';
  export interface Propiedades {
    tipo: string;
    origen: Origen;
    formato: Formato;
    extension: Extension;
    nombre: string;
    encabezados: Array<string | number>;
  }
}
```

**Paso 2 — Estrategia de migración sin breaking changes**

Para no romper los 15+ componentes que inyectan `Data`, la migración sigue este patrón:

1. Crear los nuevos servicios especializados
2. Hacer que `Data` los inyecte internamente y delegue las llamadas
3. Actualizar el path de importación de las interfaces en cada componente
4. En un sprint posterior, migrar los componentes para inyectar los servicios especializados directamente

Esto permite hacer la refactorización de forma incremental y segura.

**Ejemplo — `categoria.service.ts`** (responsabilidad: árbol de categorías):

```typescript
// archivo: src/app/compartidos/servicios/categoria.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { getEndpointUrl } from './api-config';
import { DataCategoria, CategoriaBase, DataTabla } from './data-types';

/**
 * Servicio especializado en la gestión del árbol de categorías de RUND.
 * Maneja la obtención, transformación y almacenamiento en caché de las categorías.
 */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  // Cache en memoria (antes estaban en Data directamente)
  public dataCategorias: DataCategoria[] | undefined;
  public categorias: CategoriaBase[] = [];
  public labels: { [key: string]: string } = {};

  private readonly aNivel = [
    { label: 'Direcciones territoriales', superLabel: 'Distribución territorial' }
  ];

  private getUrl(endpointKey: string): string {
    return getEndpointUrl(endpointKey, this.configService.getApiBaseUrl());
  }

  /**
   * Obtiene el árbol completo de categorías desde la API.
   */
  getCategorias(): Observable<DataCategoria[]> {
    return this.http.get<{ arbol: DataCategoria[] }>(this.getUrl('categorias')).pipe(
      map((response: any) => response.arbol || response),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Obtiene datos de cruce entre dos categorías para consultas estadísticas.
   */
  getCruce(uuids: string[]): Observable<DataTabla> {
    const [x, y] = uuids;
    const url = this.getUrl('cruce') + `/${x}/${y}`;
    return this.http.get<{ cruce: DataTabla }>(url).pipe(
      map((response: any) => response.cruce || response),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Transforma el árbol de categorías aplicando ajustes de nivel territorial.
   * Almacena el resultado en caché (dataCategorias).
   */
  setCategorias(resp: DataCategoria[]): DataCategoria[] {
    resp.forEach((supercat) => {
      supercat.children?.forEach((cat) => {
        const ajuste = this.aNivel.find(n => n.label === cat.label);
        if (ajuste) {
          cat.label = ajuste.superLabel;
          const ghostNodo: DataCategoria[] = [{
            label: ajuste.label,
            children: JSON.parse(JSON.stringify(cat.children)),
            key: cat.key + '-0',
            uuid: cat.uuid,
            numDocs: cat.numDocs,
            path: cat.path,
          }];
          ghostNodo[0].children?.forEach((n, i) => (n.key = ghostNodo[0].key + '-' + i));
          cat.children = ghostNodo;
        }
      });
    });
    this.dataCategorias = resp;
    return resp;
  }
}
```

**Ejemplo — `menu.service.ts`** (responsabilidad: configuración del menú):

```typescript
// archivo: src/app/compartidos/servicios/menu.service.ts
import { Injectable, inject } from '@angular/core';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { MenuElemento } from './data-types';

/**
 * Servicio encargado de proveer la configuración del menú de navegación.
 * Centraliza la definición de items, iconos y roles requeridos.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private faIconLibrary = inject(FaIconLibrary);

  private get faGauge(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'gauge') as IconDefinition;
  }
  private get faMagnifyingGlassChart(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'magnifying-glass-chart') as IconDefinition;
  }
  private get faFileArrowUp(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'file-arrow-up') as IconDefinition;
  }
  private get faFileAlt(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'file-alt') as IconDefinition;
  }
  private get faCheckDouble(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'check-double') as IconDefinition;
  }

  /**
   * Retorna los elementos del menú de navegación principal.
   * Los items están ordenados según la jerarquía de roles.
   */
  getElementosMenu(): MenuElemento[] {
    return [
      { label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
      { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },
      { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
      { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
      { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'gestor' },
      { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'gestor' },
      { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario' },
    ];
  }
}
```

**Criterios de aceptación**:
- [ ] `data-types.ts` contiene todas las interfaces (sin lógica)
- [ ] `CategoriaService` y `MenuService` pasan sus tests unitarios
- [ ] `Data` sigue funcionando como fachada (no se rompe ningún componente existente)
- [ ] `ng build` compila sin errores
- [ ] El tamaño de `data.ts` se reduce en al menos 200 líneas en la primera iteración

---

### 3.3.2 Configurar ESLint + Angular ESLint

**Problema**: El proyecto no tiene ESLint configurado. Esto significa que errores como el `return` duplicado en `suficientesNodos()` o los `console.log` en producción no se detectan automáticamente. Angular ESLint es el linter estándar para proyectos Angular 20+.

**Esfuerzo estimado**: 2 horas

**Prioridad**: BAJA

**Instalación**:

```bash
# Desde la raíz de rund-mgp
ng add @angular-eslint/schematics
```

Este comando hace automáticamente:
- Instala `@angular-eslint/schematics`, `@angular-eslint/eslint-plugin`, `@angular-eslint/template-parser`
- Crea `eslint.config.js` (formato flat config para Angular 20)
- Actualiza `angular.json` para agregar el target `lint`
- Agrega script `"lint"` en `package.json`

**Verificar y ajustar `eslint.config.js`** generado — agregar reglas adicionales:

```javascript
// archivo: eslint.config.js (fragmento de ajustes post-instalación)
// @ts-check
const eslint = require('@eslint/js');
const tsEslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tsEslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tsEslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Reglas de Angular
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'mgp', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'mgp', style: 'kebab-case' },
      ],
      // Prohibir console en producción
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Prohibir código inalcanzable (captura el return duplicado)
      'no-unreachable': 'error',
      // Prohibir any explícito
      '@typescript-eslint/no-explicit-any': 'warn',
      // Preferir const
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
```

**Scripts en `package.json`**:

```json
{
  "scripts": {
    "lint": "ng lint",
    "lint:fix": "ng lint --fix"
  }
}
```

**Criterios de aceptación**:
- [ ] `npm run lint` ejecuta sin errores de configuración
- [ ] La regla `no-unreachable` detecta el `return` duplicado de `suficientesNodos()` como error
- [ ] La regla `no-console` reporta los `console.log` existentes
- [ ] `npm run lint:fix` corrige automáticamente los problemas autocorregibles

---

### 3.3.3 Eliminar `console.log` de Producción

**Problema**: Se encontraron las siguientes instancias de logging en código de producción:

| Archivo | Línea | Tipo | Mensaje |
|---------|-------|------|---------|
| `auth-interceptor.ts` | 33 | `console.warn` | `'Sesión expirada...'` |
| `auth-interceptor.ts` | 45 | `console.warn` | `'Acceso denegado...'` |
| `auth-interceptor.ts` | 49 | `console.error` | `'Error de conexión...'` |
| `consultas.ts` | 141 | `console.log` | `'NO SE HA DEFINIDO EL PANEL ACTUAL'` |
| `consultas.ts` | 154 | `console.log` | `v` (respuesta blob HTML) |
| `consultas.ts` | 155 | `console.log` | `e` (error blob) |
| `consultas.ts` | 164 | `console.log` | Error archivos temporales |
| `data.ts` | 239 | `console.error` | `'Error obteniendo categorías'` |
| `data.ts` | 245 | `console.error` | `'Error obteniendo labels'` |
| `data.ts` | 259 | `console.error` | `'Error obteniendo categorías'` |
| `data.ts` | 276 | `console.error` | `'Error obteniendo cruce'` |
| `config.service.ts` | 81 | `console.error` | `'Error al cargar configuración'` |

**Esfuerzo estimado**: 1 hora

**Prioridad**: BAJA

**Estrategia**: Crear un servicio de logging mínimo que en producción suprima los mensajes de `console.log` pero mantenga `console.error` para errores críticos:

```typescript
// archivo: src/app/compartidos/servicios/logger.service.ts
import { Injectable, isDevMode } from '@angular/core';

/**
 * Servicio de logging que suprime mensajes informativos en producción.
 * En desarrollo: todos los niveles se muestran.
 * En producción: solo errores críticos se muestran.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly isDev = isDevMode();

  log(...args: any[]): void {
    if (this.isDev) console.log(...args);
  }

  warn(...args: any[]): void {
    if (this.isDev) console.warn(...args);
  }

  error(...args: any[]): void {
    // Los errores siempre se muestran (dev y prod)
    console.error(...args);
  }
}
```

**Migración de `console.log` a `LoggerService`** — Ejemplo en `consultas.ts`:

```diff
// archivo: src/app/vistas/consultas/consultas.ts
+ import { LoggerService } from '@servicios/logger.service';

  export class Consultas implements OnInit {
    private data: Data = inject(Data);
+   private logger: LoggerService = inject(LoggerService);

    getConsultaFile(tipo: string): void {
      if (this.numPanel < 0) {
-       console.log('NO SE HA DEFINIDO EL PANEL ACTUAL');
+       this.logger.warn('getConsultaFile: numPanel no definido');
        return;
      }
      // ...
      if (blob.type == 'text/html; charset=utf-8') {
        blob.text()
-         .then((v: string) => console.log(v))
-         .catch((e: any) => console.log(e));
+         .then((v: string) => this.logger.error('Respuesta inesperada HTML:', v))
+         .catch((e: any) => this.logger.error('Error al leer blob:', e));
        return;
      }
      // ...
      if (tipo == 'pdf') {
        this.data.delTemp().subscribe((resp) => {
          if (!resp || resp.borrados.length != resp.aBorrar.length)
-           console.log("Error: no se limpiaron todos los archivos temporales, solo ", resp.borrados.join(', '));
+           this.logger.warn('No se limpiaron todos los archivos temporales:', resp.borrados.join(', '));
        });
      }
    }
  }
```

**Nota sobre `auth-interceptor.ts`**: Los `console.warn` del interceptor son aceptables como `console.error` (son eventos de seguridad). En este caso, migrarlos directamente a `LoggerService.error()` es la opción correcta:

```diff
// auth-interceptor.ts
+ import { LoggerService } from '../servicios/logger.service';
  export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(Auth);
+   const logger = inject(LoggerService);

    return next(clonedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
-         console.warn('Sesión expirada o no autenticada. Redirigiendo a login...');
+         logger.warn('Sesión expirada o no autenticada. Redirigiendo a login...');
          // ...
        } else if (error.status === 403) {
-         console.warn('Acceso denegado. El usuario no tiene permisos suficientes.');
+         logger.warn('Acceso denegado. El usuario no tiene permisos suficientes.');
        } else if (error.status === 0) {
-         console.error('Error de conexión con el servidor:', error);
+         logger.error('Error de conexión con el servidor:', error);
        }
        return throwError(() => error);
      })
    );
  };
```

**Criterios de aceptación**:
- [ ] `LoggerService` creado y provisto en la raíz
- [ ] Todos los `console.log` informativos reemplazados por `logger.log()` o `logger.warn()`
- [ ] Los `console.error` críticos reemplazados por `logger.error()`
- [ ] En modo producción (`ng build`), los logs informativos no aparecen en la consola del navegador
- [ ] En modo desarrollo (`ng serve`), todos los logs se siguen mostrando

---

## Resumen de Esfuerzo — Testing, Funcionalidad y Refactorización

| Ítem | Descripción | Esfuerzo | Sprint | Prioridad |
|------|-------------|----------|--------|-----------|
| 3.1.1 | Configuración inicial (skipTests, karma, coverage) | 30 min | 1 | ALTA |
| 3.1.2 | Tests para Auth Service | 1 día (8h) | 1 | ALTA |
| 3.2.1 | Componente `/acceso-denegado` | 2h | 1 | ALTA |
| 3.1.3 | Tests para ConfigService | 4h | 1 | MEDIA |
| 3.1.4 | Tests para Guards (authGuard, adminGuard) | 4h | 1 | MEDIA |
| 3.1.5 | Tests para authInterceptor | 3h | 1 | MEDIA |
| 3.2.2 | Activar Dashboard y Consultas en menú | 1h | 1 | MEDIA |
| 3.2.3 | Eliminar código muerto (getAuth, return duplicado) | 30 min | 1 | BAJA |
| 3.1.6 | Tests para SafePipe | 2h | 2 | BAJA |
| 3.1.7 | Meta de cobertura y CI/CD | 1h | 2 | MEDIA |
| 3.3.2 | Configurar ESLint + Angular ESLint | 2h | 2 | BAJA |
| 3.3.3 | Eliminar console.log de producción | 1h | 2 | BAJA |
| 3.3.1 | División de `Data` en servicios especializados | 2 días (16h) | 3 | MEDIA |
| **TOTAL** | | **~40h** | 3 sprints | |

**Notas de planificación**:
- Sprint 1 (prioridades ALTA y MEDIA urgentes): ~21h — aborda los bugs funcionales activos y la base de testing
- Sprint 2 (mejoras de calidad): ~8h — ESLint, logging, tests secundarios
- Sprint 3 (refactorización mayor): ~16h — División de `data.ts`, solo cuando Sprint 1 y 2 estén completos

**Deuda técnica remanente** (fuera del alcance de este plan):
- Tests de integración para componentes (`Dashboard`, `Consultas`, `Gestion`)
- Tests E2E con Cypress o Playwright
- Documentación JSDoc en componentes de vistas
- Migración de componentes para usar `CategoriaService` directamente (en lugar de `Data`)
