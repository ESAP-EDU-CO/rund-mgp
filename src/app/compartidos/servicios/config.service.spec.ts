import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ConfigService, AppConfig } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  const mockConfig: AppConfig = {
    apiBaseUrl: 'http://api.esap.edu.co',
    environment: 'production',
    version: '2.0.0',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getConfig() debería retornar valores por defecto antes de cargarse', () => {
    const config = service.getConfig();
    expect(config.apiBaseUrl).toBe('http://localhost:3000');
    expect(config.environment).toBe('development');
    expect(config.version).toBe('1.0.0');
  });

  it('getApiBaseUrl() debería retornar la URL por defecto antes de cargarse', () => {
    expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('isLoaded() debería ser false inicialmente', () => {
    expect(service.isLoaded()).toBeFalse();
  });

  it('loadConfig() debería cargar la configuración desde el servidor', async () => {
    const promise = service.loadConfig();
    httpMock.expectOne('/api/config').flush(mockConfig);
    await promise;

    expect(service.isLoaded()).toBeTrue();
    expect(service.getApiBaseUrl()).toBe('http://api.esap.edu.co');
    expect(service.getConfig().environment).toBe('production');
    expect(service.getConfig().version).toBe('2.0.0');
  });

  it('loadConfig() debería usar valores por defecto si el servidor falla', async () => {
    const promise = service.loadConfig();
    httpMock.expectOne('/api/config').error(new ErrorEvent('Network error'));
    await promise;

    expect(service.isLoaded()).toBeTrue();
    expect(service.getApiBaseUrl()).toBe('http://localhost:3000');
    expect(service.getConfig().environment).toBe('development');
  });

  it('loadConfig() no debería recargar si ya está cargado', async () => {
    // Primera carga
    const promise1 = service.loadConfig();
    httpMock.expectOne('/api/config').flush(mockConfig);
    await promise1;

    expect(service.getApiBaseUrl()).toBe('http://api.esap.edu.co');

    // Segunda llamada — no debe generar una nueva petición HTTP
    await service.loadConfig();
    httpMock.expectNone('/api/config');

    // El valor sigue siendo el de la primera carga
    expect(service.getApiBaseUrl()).toBe('http://api.esap.edu.co');
  });
});
