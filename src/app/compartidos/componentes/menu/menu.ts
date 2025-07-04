import { isPlatformBrowser, NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { EventType, Router, RouterLink } from '@angular/router';
import { IconsModule } from '@modulos/icons/icons-module';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Rol, Usuario } from '@servicios/auth';
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
  conteo: number = 0;
  itemsUsados: string[] = [];
  seccionActual: string = '';
  usuario?: Usuario;
  constructor(
    private router: Router,
    private authServicio: Auth,
    private dataServicio: Data,
    @Inject(PLATFORM_ID) private platID: any,
    private cdr: ChangeDetectorRef,
  ) {
    this.authServicio.usuario.subscribe((usuario: Usuario | null | undefined) => this.usuario = usuario as Usuario);
  }
  ngOnInit(): void {
    if (isPlatformBrowser(this.platID)) {
      this.seccionActual = this.router.url.split('?')[0];
      this.cdr.detectChanges();
      this.cargaMenu();
      this.router.events.subscribe((ev: any) => {
        if (ev.type == EventType.NavigationEnd) {
          this.seccionActual = ev.url.split('?')[0];
          this.cdr.detectChanges();
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
