import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CategoriaService } from './categoria.service';
import { ConfigService } from './config.service';
import { DataCategoria, DataTabla } from './data-types';

const MOCK_API_URL = 'http://localhost:3000';

describe('CategoriaService', () => {
  let service: CategoriaService;
  let httpMock: HttpTestingController;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;

  beforeEach(() => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', ['getApiBaseUrl']);
    configServiceSpy.getApiBaseUrl.and.returnValue(MOCK_API_URL);

    TestBed.configureTestingModule({
      providers: [
        CategoriaService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: configServiceSpy },
      ],
    });

    service = TestBed.inject(CategoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debería tener propiedades públicas inicializadas', () => {
    expect(service.dataCategorias).toBeUndefined();
    expect(service.categorias).toEqual([]);
    expect(service.labels).toEqual({});
  });

  describe('getCategorias()', () => {
    it('debería hacer GET y mapear response.arbol', () => {
      const mockArbol: DataCategoria[] = [
        { uuid: 'uuid-1', label: 'Categoría 1', key: '0' },
      ];

      service.getCategorias().subscribe(result => {
        expect(result).toEqual(mockArbol);
      });

      const req = httpMock.expectOne(`${MOCK_API_URL}/api/v2/categorias/arbol`);
      expect(req.request.method).toBe('GET');
      req.flush({ arbol: mockArbol });
    });

    it('debería manejar respuesta directa sin propiedad arbol', () => {
      const mockData: DataCategoria[] = [
        { uuid: 'uuid-2', label: 'Categoría 2', key: '1' },
      ];

      service.getCategorias().subscribe(result => {
        expect(result).toEqual(mockData);
      });

      const req = httpMock.expectOne(`${MOCK_API_URL}/api/v2/categorias/arbol`);
      req.flush(mockData);
    });

    it('debería propagar el error cuando falla la petición', () => {
      let errorRecibido: any;

      service.getCategorias().subscribe({
        error: err => { errorRecibido = err; }
      });

      const req = httpMock.expectOne(`${MOCK_API_URL}/api/v2/categorias/arbol`);
      req.error(new ErrorEvent('Network error'));

      expect(errorRecibido).toBeTruthy();
    });
  });

  describe('getCruce()', () => {
    it('debería hacer GET con los UUIDs y mapear response.cruce', () => {
      const mockCruce: DataTabla = {
        nomCol: 'Columna',
        nomFil: 'Fila',
        cols: ['A', 'B'],
        filas: [{ label: 'Fila 1', data: [1, 2] }],
      };

      service.getCruce(['uuid-x', 'uuid-y']).subscribe(result => {
        expect(result).toEqual(mockCruce);
      });

      const req = httpMock.expectOne(`${MOCK_API_URL}/api/v2/categorias/cruce/uuid-x/uuid-y`);
      expect(req.request.method).toBe('GET');
      req.flush({ cruce: mockCruce });
    });

    it('debería propagar el error en getCruce', () => {
      let errorRecibido: any;

      service.getCruce(['a', 'b']).subscribe({
        error: err => { errorRecibido = err; }
      });

      const req = httpMock.expectOne(`${MOCK_API_URL}/api/v2/categorias/cruce/a/b`);
      req.error(new ErrorEvent('Network error'));

      expect(errorRecibido).toBeTruthy();
    });
  });

  describe('setCategorias()', () => {
    it('debería guardar las categorías en dataCategorias y retornarlas', () => {
      const mockResp: DataCategoria[] = [
        { uuid: 'uuid-1', label: 'Docentes', key: '0', children: [] },
      ];

      const result = service.setCategorias(mockResp);

      expect(service.dataCategorias).toEqual(mockResp);
      expect(result).toEqual(mockResp);
    });

    it('debería ajustar "Direcciones territoriales" a nivel fantasma', () => {
      const subHijo: DataCategoria = { uuid: 'uuid-sub', label: 'Cundinamarca', key: '0-0-0' };
      const hijo: DataCategoria = {
        uuid: 'uuid-hijo',
        label: 'Direcciones territoriales',
        key: '0-0',
        numDocs: 5,
        path: '/ruta',
        children: [subHijo],
      };
      const supercat: DataCategoria = {
        uuid: 'uuid-super',
        label: 'SuperCat',
        key: '0',
        children: [hijo],
      };

      const result = service.setCategorias([supercat]);

      const hijoModificado = result[0].children![0];
      expect(hijoModificado.label).toBe('Distribución territorial');
      expect(hijoModificado.children).toHaveSize(1);
      expect(hijoModificado.children![0].label).toBe('Direcciones territoriales');
      expect(hijoModificado.children![0].key).toBe('0-0-0');
    });

    it('no debería modificar categorías sin ajuste de nivel', () => {
      const hijo: DataCategoria = {
        uuid: 'uuid-otro',
        label: 'Otra categoría',
        key: '0-0',
        children: [],
      };
      const supercat: DataCategoria = {
        uuid: 'uuid-super',
        label: 'SuperCat',
        key: '0',
        children: [hijo],
      };

      const result = service.setCategorias([supercat]);

      expect(result[0].children![0].label).toBe('Otra categoría');
      expect(result[0].children![0].children).toEqual([]);
    });
  });
});
