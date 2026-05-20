import { Injectable, inject } from '@angular/core';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { MenuElemento } from './data-types';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private faIconLibrary = inject(FaIconLibrary);
  private _elementosMenu: MenuElemento[] | null = null;

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

  getElementosMenu(): MenuElemento[] {
    if (!this._elementosMenu) {
      this._elementosMenu = [
        { label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo', visible: false },
        { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo', visible: false },
        { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
        { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
        { label: 'Extracción de datos', tipo: 'PrimeNG', icon: 'pi pi-chart-bar', route: '/extraccion', rol: 'gestor' },
        { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'gestor', visible: false },
        { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'gestor', visible: false },
        { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario', visible: false },
      ];
    }
    return this._elementosMenu;
  }
}
