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

  // 16. login() usa mensaje por defecto cuando error.error no existe
  it('login() debería usar mensaje por defecto cuando error.error no está presente', () => {
    service.login('jperez', 'mal_password').subscribe(resp => {
      expect(resp.message).toBe('Error de autenticación');
    });

    httpMock
      .expectOne(r => r.url.includes('/auth/login'))
      .flush({}, { status: 500, statusText: 'Server Error' });
  });

  // 17. estaAutenticado pasa a true después de login exitoso
  it('estaAutenticado debería ser true tras login exitoso', () => {
    service.login('jperez', 'password').subscribe(() => {
      expect(service.estaAutenticado()).toBeTrue();
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: mockUsuario, session_id: 'sess123' });
  });

  // 18. esAdmin es true cuando rol = admin
  it('esAdmin debería ser true cuando el usuario tiene rol admin', () => {
    const adminUser = { ...mockUsuario, rol: 'admin' as const };

    service.login('admin', 'pass').subscribe(() => {
      expect(service.esAdmin()).toBeTrue();
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: adminUser, session_id: 'sess' });
  });

  // 19. esAdmin es true cuando roles incluye admin (sin rol directo)
  it('esAdmin debería ser true cuando roles[] incluye admin', () => {
    const userConRoles = { ...mockUsuario, rol: undefined, roles: ['admin', 'gestor'] as const };

    service.login('admin', 'pass').subscribe(() => {
      expect(service.esAdmin()).toBeTrue();
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: userConRoles, session_id: 'sess' });
  });

  // 20. esAdmin es false cuando usuario no es admin
  it('esAdmin debería ser false para un usuario sin rol admin', () => {
    service.login('jperez', 'pass').subscribe(() => {
      expect(service.esAdmin()).toBeFalse();
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: mockUsuario, session_id: 'sess' });
  });

  // 21. verificarSesion() llama refrescarJWT cuando should_refresh=true
  it('verificarSesion() debería llamar refrescarJWT cuando should_refresh es true', () => {
    const mockResponse = {
      success: true,
      user: mockUsuario,
      session_id: 'sess',
      should_refresh: true,
      last_activity: Date.now(),
    };

    service.verificarSesion().subscribe(() => {
      expect(service.usuario()).toBeTruthy();
    });

    httpMock.expectOne(r => r.url.includes('/auth/session')).flush(mockResponse);
    httpMock.expectOne(r => r.url.includes('/auth/refresh')).flush({ success: true });
  });

  // 22. verificarSesion() establece null cuando success=false
  it('verificarSesion() debería establecer usuario=null cuando success es false', () => {
    const mockResponse = {
      success: false,
      user: null,
      session_id: '',
      should_refresh: false,
      last_activity: 0,
    };

    service.verificarSesion().subscribe(() => {
      expect(service.usuario()).toBeNull();
    });

    httpMock.expectOne(r => r.url.includes('/auth/session')).flush(mockResponse);
  });

  // 23. refrescarJWT() llama al endpoint de refresh
  it('refrescarJWT() debería llamar al endpoint de refresh', () => {
    service.refrescarJWT().subscribe(resp => {
      expect(resp).toBeTruthy();
    });

    httpMock.expectOne(r => r.url.includes('/auth/refresh')).flush({ success: true });
  });

  // 24. refrescarJWT() fallido limpia usuario y navega a /login
  it('refrescarJWT() debería limpiar usuario y navegar a /login al fallar', () => {
    (service as any).usuarioSignal.set(mockUsuario);

    service.refrescarJWT().subscribe(resp => {
      expect(resp).toEqual({ success: false });
      expect(service.usuario()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    httpMock.expectOne(r => r.url.includes('/auth/refresh'))
      .error(new ErrorEvent('Network error'));
  });

  // 25. devLogin() exitoso establece el usuario
  it('devLogin() debería establecer el usuario al tener éxito', () => {
    const devUser = { ...mockUsuario, email: 'dev@esap.edu.co' };

    service.devLogin('dev@esap.edu.co').subscribe(resp => {
      expect(resp.success).toBeTrue();
      expect(service.usuario()).toBeTruthy();
    });

    httpMock.expectOne(r => r.url.includes('/auth/dev'))
      .flush({ success: true, user: devUser, session_id: 'dev-sess' });
  });

  // 26. devLogin() fallido establece error
  it('devLogin() debería establecer el error al fallar', () => {
    service.devLogin('bad@test.com').subscribe(resp => {
      expect(resp.success).toBeFalse();
      expect(service.error()).toBe('Dev login error');
    });

    httpMock.expectOne(r => r.url.includes('/auth/dev'))
      .flush({ error: 'Dev login error' }, { status: 400, statusText: 'Bad Request' });
  });

  // 27. devLogin() usa mensaje por defecto cuando error.error no existe
  it('devLogin() debería usar mensaje por defecto cuando error.error no está presente', () => {
    service.devLogin('bad@test.com').subscribe(resp => {
      expect(resp.message).toBe('Error en login de desarrollo');
    });

    httpMock.expectOne(r => r.url.includes('/auth/dev'))
      .flush({}, { status: 500, statusText: 'Server Error' });
  });

  // 28. determinarRol() por email: usuario.administrador → admin
  it('determinarRol() debería retornar admin para email usuario.administrador', () => {
    const adminEmail = { ...mockUsuario, email: 'usuario.administrador@esap.edu.co', rol: undefined };

    service.login('admin', 'pass').subscribe(() => {
      expect(service.usuario()?.rol).toBe('admin');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: adminEmail, session_id: 'sess' });
  });

  // 29. determinarRol() por email: usuario.gestor → gestor
  it('determinarRol() debería retornar gestor para email usuario.gestor', () => {
    const gestorEmail = { ...mockUsuario, email: 'usuario.gestor@esap.edu.co', rol: undefined };

    service.login('gestor', 'pass').subscribe(() => {
      expect(service.usuario()?.rol).toBe('gestor');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: gestorEmail, session_id: 'sess' });
  });

  // 30. determinarRol() por email: usuario.directivo → directivo
  it('determinarRol() debería retornar directivo para email usuario.directivo', () => {
    const directEmail = { ...mockUsuario, email: 'usuario.directivo@esap.edu.co', rol: undefined };

    service.login('directivo', 'pass').subscribe(() => {
      expect(service.usuario()?.rol).toBe('directivo');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: directEmail, session_id: 'sess' });
  });

  // 31. determinarRol() usa roles[] cuando no hay rol directo ni email patrón
  it('determinarRol() debería usar el primer elemento de roles[] como fallback', () => {
    const userRoles = { ...mockUsuario, email: 'otro@esap.edu.co', rol: undefined, roles: ['gestor'] as const };

    service.login('otro', 'pass').subscribe(() => {
      expect(service.usuario()?.rol).toBe('gestor');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: userRoles, session_id: 'sess' });
  });

  // 32. determinarRol() default → usuario cuando no hay info de rol
  it('determinarRol() debería retornar usuario por defecto cuando no hay info de rol', () => {
    const noRoleUser = { ...mockUsuario, email: 'otro@esap.edu.co', rol: undefined, roles: undefined };

    service.login('otro', 'pass').subscribe(() => {
      expect(service.usuario()?.rol).toBe('usuario');
    });

    httpMock.expectOne(r => r.url.includes('/auth/login'))
      .flush({ success: true, user: noRoleUser, session_id: 'sess' });
  });

  // 33. tienePermisos() usa el rol del signal cuando no se pasa rolUsuario
  it('tienePermisos() debería usar el rol del usuario autenticado cuando no se pasa parámetro', () => {
    const gestorUser = { ...mockUsuario, rol: 'gestor' as const };
    (service as any).usuarioSignal.set(gestorUser);

    expect(service.tienePermisos('gestor')).toBeTrue();
    expect(service.tienePermisos('directivo')).toBeTrue();
    expect(service.tienePermisos('admin')).toBeFalse();
  });
});
