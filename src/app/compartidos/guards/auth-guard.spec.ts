import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';

import { authGuard, adminGuard } from './auth-guard';
import { Auth } from '../servicios/auth';

const mockRoute = {} as ActivatedRouteSnapshot;

const mockSessionOk = {
  success: true,
  user: { sub: '1', name: 'Test', email: 'test@esap.edu.co', tid: '1' },
  session_id: 'sess',
  should_refresh: false,
  last_activity: Date.now(),
};

const mockSessionFail = {
  success: false,
  user: {} as any,
  session_id: '',
  should_refresh: false,
  last_activity: 0,
};

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<Auth>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockState = { url: '/listados' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('Auth', [
      'estaAutenticado',
      'verificarSesion',
      'esAdmin',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('debería permitir el acceso cuando el usuario ya está autenticado en memoria', () => {
    authServiceSpy.estaAutenticado.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
    expect(authServiceSpy.verificarSesion).not.toHaveBeenCalled();
  });

  it('debería verificar sesión en servidor cuando no está autenticado en memoria', (done) => {
    authServiceSpy.estaAutenticado.and.returnValue(false);
    authServiceSpy.verificarSesion.and.returnValue(of(mockSessionOk));

    const result$ = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    ) as any;

    result$.subscribe((allowed: boolean) => {
      expect(allowed).toBeTrue();
      expect(authServiceSpy.verificarSesion).toHaveBeenCalled();
      done();
    });
  });

  it('debería redirigir a /login cuando la sesión no es válida', (done) => {
    authServiceSpy.estaAutenticado.and.returnValue(false);
    authServiceSpy.verificarSesion.and.returnValue(of(mockSessionFail));

    const result$ = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    ) as any;

    result$.subscribe((allowed: boolean) => {
      expect(allowed).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/login'],
        jasmine.objectContaining({ queryParams: { returnUrl: '/listados' } })
      );
      done();
    });
  });
});

describe('adminGuard', () => {
  let authServiceSpy: jasmine.SpyObj<Auth>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockState = { url: '/gestion' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('Auth', [
      'estaAutenticado',
      'verificarSesion',
      'esAdmin',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('debería permitir el acceso cuando está autenticado y es admin', () => {
    authServiceSpy.estaAutenticado.and.returnValue(true);
    authServiceSpy.esAdmin.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute, mockState)
    );

    expect(result).toBeTrue();
  });

  it('debería redirigir a /acceso-denegado cuando está autenticado pero no es admin', () => {
    authServiceSpy.estaAutenticado.and.returnValue(true);
    authServiceSpy.esAdmin.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute, mockState)
    );

    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/acceso-denegado']);
  });

  it('debería redirigir a /login cuando no está autenticado y la sesión falla', (done) => {
    authServiceSpy.estaAutenticado.and.returnValue(false);
    authServiceSpy.esAdmin.and.returnValue(false);
    authServiceSpy.verificarSesion.and.returnValue(of(mockSessionFail));

    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute, mockState)
    ) as any;

    result$.subscribe((allowed: boolean) => {
      expect(allowed).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/login'],
        jasmine.objectContaining({ queryParams: { returnUrl: '/gestion' } })
      );
      done();
    });
  });

  it('debería redirigir a /acceso-denegado cuando no está autenticado pero sesión es válida y no es admin', (done) => {
    authServiceSpy.estaAutenticado.and.returnValue(false);
    authServiceSpy.esAdmin.and.returnValue(false);
    authServiceSpy.verificarSesion.and.returnValue(of(mockSessionOk));

    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard(mockRoute, mockState)
    ) as any;

    result$.subscribe((allowed: boolean) => {
      expect(allowed).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/acceso-denegado']);
      done();
    });
  });
});
