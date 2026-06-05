import { TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

import { MenuService } from './menu.service';

const mockIcon: IconDefinition = {
  prefix: 'fas',
  iconName: 'file-arrow-up',
  icon: [512, 512, [], 'f0ab', 'M0 0'],
};

describe('MenuService', () => {
  let service: MenuService;
  let faLibrarySpy: jasmine.SpyObj<FaIconLibrary>;

  beforeEach(() => {
    faLibrarySpy = jasmine.createSpyObj('FaIconLibrary', ['getIconDefinition', 'addIconPacks', 'addIcons']);
    faLibrarySpy.getIconDefinition.and.returnValue(mockIcon as any);

    TestBed.configureTestingModule({
      providers: [
        MenuService,
        { provide: FaIconLibrary, useValue: faLibrarySpy },
      ],
    });

    service = TestBed.inject(MenuService);
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('getElementosMenu()', () => {
    it('debería retornar un arreglo con 3 elementos de menú', () => {
      const elementos = service.getElementosMenu();
      expect(elementos.length).toBe(3);
    });

    it('debería contener las rutas correctas', () => {
      const elementos = service.getElementosMenu();
      const rutas = elementos.map(e => e['route']);
      expect(rutas).toContain('/listados');
      expect(rutas).toContain('/gestion');
      expect(rutas).toContain('/extraccion');
    });

    it('debería contener los labels correctos', () => {
      const elementos = service.getElementosMenu();
      const labels = elementos.map(e => e.label);
      expect(labels).toContain('Listados');
      expect(labels).toContain('Gestión');
      expect(labels).toContain('Extracción de datos');
    });

    it('debería retornar la misma instancia en llamadas sucesivas (caché)', () => {
      const primera = service.getElementosMenu();
      const segunda = service.getElementosMenu();
      expect(primera).toBe(segunda);
    });

    it('debería llamar a getIconDefinition para construir el icono FontAwesome de Gestión', () => {
      service.getElementosMenu();
      expect(faLibrarySpy.getIconDefinition).toHaveBeenCalledWith('fas', 'file-arrow-up');
    });

    it('los elementos PrimeNG deben tener icono PrimeIcons', () => {
      const elementos = service.getElementosMenu();
      const primeng = elementos.filter(e => e.tipo === 'PrimeNG');
      expect(primeng.length).toBe(2);
      primeng.forEach(e => {
        expect(e.icon).toBeDefined();
      });
    });
  });
});
