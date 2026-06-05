import { Injectable, inject } from '@angular/core';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { MenuElemento } from './data-types';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private faIconLibrary = inject(FaIconLibrary);
  private _elementosMenu: MenuElemento[] | null = null;

  private get faFileArrowUp(): IconDefinition {
    return this.faIconLibrary.getIconDefinition('fas', 'file-arrow-up') as IconDefinition;
  }

  getElementosMenu(): MenuElemento[] {
    if (!this._elementosMenu) {
      this._elementosMenu = [
        { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
        { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
        { label: 'Extracción de datos', tipo: 'PrimeNG', icon: 'pi pi-chart-bar', route: '/extraccion', rol: 'gestor' },
      ];
    }
    return this._elementosMenu;
  }
}
