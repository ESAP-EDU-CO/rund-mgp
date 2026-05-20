import { NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
    RouterLinkActive,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu implements OnInit {
  elementosMenu: MenuElemento[] | undefined;
  conteo = 0;
  itemsUsados: string[] = [];

  private authServicio = inject(Auth);
  private dataServicio = inject(Data);
  protected usuario = this.authServicio.usuario;

  ngOnInit(): void {
    this.cargaMenu();
  }
  permiso(item: MenuElemento, rolUsuario: Rol | undefined): boolean {
    const rolMinimo: Rol = item.rol;
    return this.authServicio.tienePermisos(rolMinimo, rolUsuario as Rol);
  }
  cargaMenu(): void {
    this.elementosMenu = this.dataServicio.elementosMenu;
  }
}
