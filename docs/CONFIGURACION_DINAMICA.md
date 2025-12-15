# Configuración Dinámica de API - ConfigService

## 📋 Resumen

Se implementó un sistema de configuración dinámica centralizado para resolver el problema de dependencia circular entre `auth.ts`, `data.ts` y `api-config.ts`. Ahora la configuración de la API se carga **una sola vez al inicio de la aplicación** mediante `APP_INITIALIZER`.

## 🔄 Problema Original: Dependencia Circular

### Antes (❌ Dependencia Circular)

```
auth.ts → importa API_CONFIG de api-config.ts
         → modifica API_CONFIG.baseUrl en constructor
         → usa getEndpointUrl() que depende de API_CONFIG

data.ts → importa API_CONFIG de api-config.ts
         → modifica API_CONFIG.baseUrl en getConfig()
         → usa getEndpointUrl() que depende de API_CONFIG

api-config.ts → exporta API_CONFIG (objeto mutable global)
```

**Problemas:**
1. Dependencia circular entre módulos
2. Estado global mutable (`API_CONFIG`)
3. Configuración duplicada en múltiples servicios
4. Difícil de testear
5. No garantiza orden de inicialización

## ✅ Solución Implementada

### Arquitectura Nueva

```
APP_INITIALIZER (app.config.ts)
    ↓
ConfigService.loadConfig()  ← Carga /api/config UNA VEZ al inicio
    ↓
ConfigService almacena configuración
    ↓
┌─────────────┬──────────────┬────────────┐
↓             ↓              ↓            ↓
auth.ts    data.ts    certificados.ts  listados.ts
    ↓             ↓              ↓            ↓
usa ConfigService.getApiBaseUrl()
    ↓
getEndpointUrl(key, baseUrl)
```

**Ventajas:**
1. ✅ Sin dependencias circulares
2. ✅ Configuración cargada ANTES del arranque
3. ✅ Un solo punto de verdad (`ConfigService`)
4. ✅ Fácil de testear
5. ✅ Orden de inicialización garantizado

---

## 🔧 Implementación

### 1. ConfigService (`compartidos/servicios/config.service.ts`)

**Nuevo servicio** que centraliza la carga y acceso a la configuración:

```typescript
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;
  private loaded = false;

  /**
   * Carga la configuración desde /api/config
   * Se llama automáticamente por APP_INITIALIZER
   */
  async loadConfig(): Promise<void> {
    if (this.loaded) return;

    const config = await firstValueFrom(
      this.http.get<AppConfig>('/api/config')
    );
    this.config = config;
    this.loaded = true;
  }

  /**
   * Obtiene la URL base de la API
   */
  getApiBaseUrl(): string {
    return this.config?.apiBaseUrl || 'http://localhost:3000';
  }

  /**
   * Obtiene la configuración completa
   */
  getConfig(): AppConfig {
    return this.config || {
      apiBaseUrl: 'http://localhost:3000',
      environment: 'development',
      version: '1.0.0'
    };
  }
}
```

### 2. APP_INITIALIZER (`app.config.ts`)

Configuración para cargar `ConfigService` **antes** de arrancar la app:

```typescript
import { APP_INITIALIZER } from '@angular/core';
import { ConfigService } from './compartidos/servicios/config.service';

function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    // ... otros providers
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    }
  ]
};
```

**Orden de ejecución:**
1. Angular crea `ConfigService`
2. `APP_INITIALIZER` ejecuta `configService.loadConfig()`
3. Espera a que se complete la carga
4. Angular continúa arrancando la aplicación
5. Todos los servicios ya tienen acceso a `ConfigService`

### 3. api-config.ts (Actualizado)

Función `getEndpointUrl` ahora recibe `baseUrl` como parámetro:

```typescript
// ❌ ANTES: Dependía de API_CONFIG global
export function getEndpointUrl(endpointKey: string): string {
  const config = API_ENDPOINTS[endpointKey];
  return API_CONFIG.baseUrl + config.endpoint;
}

// ✅ AHORA: Recibe baseUrl como parámetro
export function getEndpointUrl(endpointKey: string, baseUrl: string): string {
  const config = API_ENDPOINTS[endpointKey];
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return normalizedBaseUrl + config.endpoint;
}
```

### 4. auth.ts (Refactorizado)

```typescript
import { ConfigService } from './config.service';
import { getEndpointUrl } from './api-config';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private configService = inject(ConfigService);

  login(username: string, password: string): Observable<LoginResponse> {
    const baseUrl = this.configService.getApiBaseUrl();
    const loginUrl = getEndpointUrl('login', baseUrl);

    return this.http.post<LoginResponse>(loginUrl, { username, password }, ...);
  }

  // Similar para logout, verificarSesion, refrescarJWT, devLogin
}
```

**Cambios:**
- ❌ Eliminado: `import { API_CONFIG } from './api-config'`
- ❌ Eliminado: método `getConfig()` duplicado
- ❌ Eliminado: método `init()` con `firstValueFrom`
- ✅ Añadido: `private configService = inject(ConfigService)`
- ✅ Actualizado: Todas las URLs usan `getEndpointUrl(key, baseUrl)`

### 5. data.ts (Refactorizado)

```typescript
import { ConfigService } from './config.service';
import { getEndpointUrl } from './api-config';

@Injectable({
  providedIn: 'root'
})
export class Data {
  private configService = inject(ConfigService);

  /**
   * Método auxiliar para obtener URL de endpoint
   */
  private getUrl(endpointKey: string): string {
    const baseUrl = this.configService.getApiBaseUrl();
    return getEndpointUrl(endpointKey, baseUrl);
  }

  init(): Observable<VarData> {
    const labelsUrl = this.getUrl('datos') + '/labels';
    const categoriasUrl = this.getUrl('datos') + '/categorias';
    // ...
  }

  getCategorias(): Observable<DataCategoria[]> {
    const url = this.getUrl('categorias');
    return this.http.get<{ arbol: DataCategoria[] }>(url);
  }
}
```

**Cambios:**
- ❌ Eliminado: `import { API_CONFIG } from './api-config'`
- ❌ Eliminado: método `getConfig()` duplicado
- ❌ Eliminado: `API_CONFIG.version` → Reemplazado por string literal `'2.0'`
- ❌ Eliminado: Referencias a `API_CONFIG.debug`
- ✅ Añadido: `private configService = inject(ConfigService)`
- ✅ Añadido: método auxiliar `getUrl()` para simplificar código
- ✅ Actualizado: Todos los `getEndpointUrl()` usan `this.getUrl()`

### 6. app.ts (Simplificado)

```typescript
ngOnInit(): void {
  if (isPlatformBrowser(this.platID)) {
    // ConfigService ya fue inicializado por APP_INITIALIZER
    this.configLoaded = true;

    // Verificar sesión al iniciar
    this.authServicio.verificarSesion().subscribe();

    this.data.init().subscribe((data: VarData) => {
      this.contenidos = this.data.elementosMenu;
      this.getRolMinimo();
      this.dataVars = true;
      this.cdr.detectChanges();
    });

    // ...
  }
}
```

**Cambios:**
- ❌ Eliminado: `this.data.getConfig().subscribe(...)`
- ✅ Simplificado: Ya no necesita esperar a que se cargue config

### 7. Otros Componentes Actualizados

**certificados.ts:**
```typescript
import { ConfigService } from '@servicios/config.service';

export class Certificados {
  private configService = inject(ConfigService);

  seleccionaOpcion(dato: Documento.Dato): void {
    this.preview = {
      background: this.configService.getApiBaseUrl() + '/img/base.jpg',
      // ...
    };
  }
}
```

**listados.ts:**
```typescript
import { ConfigService } from '@servicios/config.service';
import { DIRECT_URLS } from '@servicios/api-config';

export class Listados {
  private configService = inject(ConfigService);

  constructor() {
    this.loadList = this.configService.getApiBaseUrl() + '/' + DIRECT_URLS.uploadListados;
  }
}
```

---

## 📊 Comparación Antes/Después

### Carga de Configuración

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Punto de carga** | `auth.ts` y `data.ts` (duplicado) | `ConfigService` (centralizado) |
| **Momento de carga** | Durante inicialización de servicios | Antes del arranque (APP_INITIALIZER) |
| **Llamadas a `/api/config`** | 2 (duplicadas) | 1 (única) |
| **Estado global** | `API_CONFIG` (mutable) | `ConfigService.config` (encapsulado) |
| **Orden garantizado** | ❌ No | ✅ Sí |

### Uso de URLs

| Aspecto | Antes | Después |
|---------|-------|---------|
| **auth.ts** | URLs hardcodeadas | `getEndpointUrl('login', baseUrl)` |
| **data.ts** | `getEndpointUrl('datos')` | `this.getUrl('datos')` |
| **Dependencia** | `API_CONFIG` global | `ConfigService` inyectado |

---

## 🧪 Testing

### Verificar ConfigService

```typescript
// config.service.spec.ts
describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConfigService]
    });
    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should load config from /api/config', async () => {
    const mockConfig = {
      apiBaseUrl: 'http://test.com',
      environment: 'test',
      version: '1.0.0'
    };

    const promise = service.loadConfig();
    const req = httpMock.expectOne('/api/config');
    req.flush(mockConfig);
    await promise;

    expect(service.getApiBaseUrl()).toBe('http://test.com');
  });
});
```

### Verificar APP_INITIALIZER

```bash
# Build de producción (verifica que no hay errores)
npx ng build --configuration production

# Verificar que no hay dependencias circulares
npx ng build --configuration development 2>&1 | grep -i "circular"
# (no debería mostrar nada)
```

---

## 🔍 Troubleshooting

### Problema: ConfigService no está cargado

**Síntoma:** `getApiBaseUrl()` retorna `http://localhost:3000` en producción

**Solución:**
1. Verificar que `APP_INITIALIZER` está en `app.config.ts`
2. Verificar que `/api/config` devuelve JSON válido
3. Ver logs del navegador: `console.log('[ConfigService] Configuración cargada:', config)`

### Problema: Dependencia circular

**Síntoma:** Error al compilar: `Circular dependency detected`

**Solución:**
1. Verificar que NINGÚN archivo importa `API_CONFIG` de `api-config.ts`
2. Todos deben usar `ConfigService.getApiBaseUrl()`
3. `getEndpointUrl()` debe recibir `baseUrl` como parámetro

### Problema: URLs incorrectas

**Síntoma:** Peticiones HTTP apuntan a URL incorrecta

**Solución:**
1. Verificar que `/api/config` retorna `apiBaseUrl` correcta
2. Verificar que `getEndpointUrl()` normaliza la URL (añade `/` si falta)
3. Ver logs: `console.log('URL:', this.configService.getApiBaseUrl())`

---

## 📝 Buenas Prácticas

### ✅ Hacer

1. **Siempre usar ConfigService:**
   ```typescript
   const baseUrl = this.configService.getApiBaseUrl();
   const url = getEndpointUrl('login', baseUrl);
   ```

2. **Crear método auxiliar en servicios:**
   ```typescript
   private getUrl(key: string): string {
     return getEndpointUrl(key, this.configService.getApiBaseUrl());
   }
   ```

3. **Inyectar ConfigService:**
   ```typescript
   private configService = inject(ConfigService);
   ```

### ❌ NO Hacer

1. **NO usar API_CONFIG directamente:**
   ```typescript
   ❌ const url = API_CONFIG.baseUrl + '/api/v2/login';
   ```

2. **NO llamar a `/api/config` manualmente:**
   ```typescript
   ❌ this.http.get('/api/config').subscribe(...);
   ```

3. **NO hardcodear URLs:**
   ```typescript
   ❌ const url = 'http://localhost:3000/api/v2/login';
   ```

4. **NO guardar configuración en otro servicio:**
   ```typescript
   ❌ this.config = await this.http.get('/api/config').toPromise();
   ```

---

## 🚀 Migración de Código Existente

Si tienes código que usa el sistema antiguo, sigue estos pasos:

### Paso 1: Actualizar imports

```typescript
// ❌ Antes
import { API_CONFIG, getEndpointUrl } from '@servicios/api-config';

// ✅ Después
import { getEndpointUrl } from '@servicios/api-config';
import { ConfigService } from '@servicios/config.service';
```

### Paso 2: Inyectar ConfigService

```typescript
// ✅ Añadir en el componente/servicio
private configService = inject(ConfigService);
```

### Paso 3: Actualizar llamadas

```typescript
// ❌ Antes
const url = getEndpointUrl('login');
const baseUrl = API_CONFIG.baseUrl;

// ✅ Después
const baseUrl = this.configService.getApiBaseUrl();
const url = getEndpointUrl('login', baseUrl);

// O mejor aún, crear método auxiliar:
private getUrl(key: string): string {
  return getEndpointUrl(key, this.configService.getApiBaseUrl());
}

const url = this.getUrl('login');
```

---

## 📚 Referencias

- [Angular APP_INITIALIZER](https://angular.io/api/core/APP_INITIALIZER)
- [Dependency Injection in Angular](https://angular.io/guide/dependency-injection)
- [HttpClient](https://angular.io/guide/http)

---

**Última actualización:** 15 de diciembre de 2025
**Versión:** 1.0
**Autor:** Oliver Castelblanco Martínez / ESAP Development Team
