import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { Auth } from './auth';
import { ConfigService } from './config.service';

describe('Auth', () => {
  let service: Auth;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;

  const mockUsuario = {
    sub: '1001',
    name: 'Juan Pérez',
    email: 'juan.perez@esap.edu.co',
    tid: 'tenant1',
    rol: 'usuario' as const,
  };

  beforeEach(() => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', ['getApiBaseUrl']);
    configServiceSpy.getApiBaseUrl.and.returnValue('http://localhost:3000');

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        Auth,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // 1. Creación del servicio
  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // 2. Estado inicial: usuario es undefined
  it('debería tener usuario = undefined inicialmente', () => {
    expect(service.usuario()).toBeUndefined();
  });

  // 3. Estado inicial: cargando es false
  it('debería tener cargando = false inicialmente', () => {
    expect(service.cargando()).toBeFalse();
  });

  // 4. Estado inicial: estaAutenticado es false
  it('debería tener estaAutenticado = false inicialmente', () => {
    expect(service.estaAutenticado()).toBeFalse();
  });

  // 5. login() exitoso establece el usuario
  it('login() debería establecer el usuario al tener éxito', () => {
    const mockResponse = { success: true, user: mockUsuario, session_id: 'sess123' };

    service.login('jperez', 'password').subscribe(resp => {
      expect(resp.success).toBeTrue();
      expect(service.usuario()).toBeTruthy();
      expect(service.usuario()?.name).toBe('Juan Pérez');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login')).flush(mockResponse);
  });

  // 6. login() exitoso establece cargando = false
  it('login() debería establecer cargando = false tras éxito', () => {
    const mockResponse = { success: true, user: mockUsuario, session_id: 'sess123' };

    service.login('jperez', 'password').subscribe(() => {
      expect(service.cargando()).toBeFalse();
    });

    httpMock.expectOne(r => r.url.includes('/auth/login')).flush(mockResponse);
  });

  // 7. login() fallido establece mensaje de error
  it('login() debería establecer el mensaje de error al fallar', () => {
    service.login('jperez', 'mal_password').subscribe(resp => {
      expect(resp.success).toBeFalse();
      expect(service.error()).toBe('Credenciales inválidas');
    });

    httpMock
      .expectOne(r => r.url.includes('/auth/login'))
      .flush({ error: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
  });

  // 8. login() fallido establece usuario = null
  it('login() debería establecer usuario = null al fallar', () => {
    service.login('jperez', 'mal_password').subscribe(() => {
      expect(service.usuario()).toBeNull();
    });

    httpMock
      .expectOne(r => r.url.includes('/auth/login'))
      .flush({ error: 'Error' }, { status: 401, statusText: 'Unauthorized' });
  });

  // 9. logout() exitoso limpia el usuario
  it('logout() debería limpiar el usuario al tener éxito', () => {
    (service as any).usuarioSignal.set(mockUsuario);

    service.logout().subscribe(() => {
      expect(service.usuario()).toBeNull();
    });

    httpMock.expectOne(r => r.url.includes('/auth/logout')).flush({ success: true, message: 'OK' });
  });

  // 10. logout() exitoso navega a /login
  it('logout() debería navegar a /login al tener éxito', () => {
    service.logout().subscribe(() => {
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    httpMock.expectOne(r => r.url.includes('/auth/logout')).flush({ success: true, message: 'OK' });
  });

  // 11. logout() fallido limpia el usuario y navega igual
  it('logout() debería limpiar el usuario y navegar a /login aunque falle el servidor', () => {
    (service as any).usuarioSignal.set(mockUsuario);

    service.logout().subscribe(() => {
      expect(service.usuario()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    httpMock
      .expectOne(r => r.url.includes('/auth/logout'))
      .error(new ErrorEvent('Network error'));
  });

  // 12. verificarSesion() exitoso establece el usuario
  it('verificarSesion() debería establecer el usuario al tener éxito', () => {
    const mockResponse = {
      success: true,
      user: mockUsuario,
      session_id: 'sess',
      should_refresh: false,
      last_activity: Date.now(),
    };

    service.verificarSesion().subscribe(() => {
      expect(service.usuario()).toBeTruthy();
      expect(service.usuario()?.email).toBe('juan.perez@esap.edu.co');
    });

    httpMock.expectOne(r => r.url.includes('/auth/session')).flush(mockResponse);
  });

  // 13. verificarSesion() fallido establece usuario = null
  it('verificarSesion() debería establecer usuario = null al fallar', () => {
    service.verificarSesion().subscribe(() => {
      expect(service.usuario()).toBeNull();
    });

    httpMock
      .expectOne(r => r.url.includes('/auth/session'))
      .error(new ErrorEvent('Unauthorized'));
  });

  // 14. tienePermisos() respeta jerarquía de roles
  it('tienePermisos() debería respetar la jerarquía de roles', () => {
    // admin tiene acceso a todos los niveles
    expect(service.tienePermisos('admin', 'admin')).toBeTrue();
    expect(service.tienePermisos('gestor', 'admin')).toBeTrue();
    expect(service.tienePermisos('directivo', 'admin')).toBeTrue();
    expect(service.tienePermisos('usuario', 'admin')).toBeTrue();

    // usuario solo tiene acceso al nivel usuario
    expect(service.tienePermisos('usuario', 'usuario')).toBeTrue();
    expect(service.tienePermisos('directivo', 'usuario')).toBeFalse();
    expect(service.tienePermisos('gestor', 'usuario')).toBeFalse();
    expect(service.tienePermisos('admin', 'usuario')).toBeFalse();

    // gestor tiene acceso a directivo y usuario
    expect(service.tienePermisos('gestor', 'gestor')).toBeTrue();
    expect(service.tienePermisos('directivo', 'gestor')).toBeTrue();
    expect(service.tienePermisos('admin', 'gestor')).toBeFalse();
  });

  // 15. limpiarError() limpia el signal de error
  it('limpiarError() debería limpiar el signal de error', () => {
    (service as any).errorSignal.set('Credenciales inválidas');
    expect(service.error()).toBe('Credenciales inválidas');

    service.limpiarError();

    expect(service.error()).toBeNull();
  });
});
