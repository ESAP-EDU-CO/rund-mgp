import { isPlatformBrowser, NgClass } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { EventType, Router, RouterLink } from '@angular/router';
import { IconsModule } from '@modulos/icons/icons-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Rol } from '@servicios/auth';
import { Data, MenuElemento } from '@servicios/data';

@Component({
  selector: 'mgp-menu',
  imports: [
    PrimengModule,
    NgClass,
    IconsModule,
    RouterLink,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu implements OnInit {
  elementosMenu: MenuElemento[] | undefined;
  conteo = 0;
  itemsUsados: string[] = [];
  seccionActual = '';

  private router = inject(Router);
  private authServicio = inject(Auth);
  private dataServicio = inject(Data);
  private platID = inject(PLATFORM_ID);
// Usar el signal directamente del servicio
  protected usuario = this.authServicio.usuario;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platID)) {
      this.seccionActual = this.router.url.split('?')[0];
      
      this.cargaMenu();
      this.router.events.subscribe((ev: any) => {
        if (ev.type == EventType.NavigationEnd) {
          this.seccionActual = ev.url.split('?')[0];
          
        }
      });
    }
  }
  permiso(item: MenuElemento, rolUsuario: Rol | undefined): boolean {
    const rolMinimo: Rol = item.rol;
    return this.authServicio.tienePermisos(rolMinimo, rolUsuario as Rol);
  }
  cargaMenu(): void {
    this.elementosMenu = this.dataServicio.elementosMenu;
  }
}
