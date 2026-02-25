import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authInterceptor } from './auth-interceptor';
import { Auth } from '../servicios/auth';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let router: Router;
  let authMock: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj<Auth>('Auth', ['logout']);
    authMock.logout.and.returnValue(of({ success: true, message: 'ok' }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
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
    http.get('https://cdn.example.com/assets/logo.png').subscribe({ error: () => { /* noop */ } });

    const req = httpMock.expectOne('https://cdn.example.com/assets/logo.png');
    expect(req.request.withCredentials).toBeFalse();
    req.flush({});
  }));

  it('debe llamar logout() y redirigir a /login en error 401', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');

    http.get('http://localhost:3000/api/protected').subscribe({ error: () => { /* noop */ } });

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

    http.get('http://localhost:3000/api/admin').subscribe({ error: () => { /* noop */ } });

    httpMock.expectOne('http://localhost:3000/api/admin')
      .flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/acceso-denegado']);
  }));

  it('debe emitir console.error en error de red (status 0)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');

    http.get('http://localhost:3000/api/datos').subscribe({ error: () => { /* noop */ } });

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
