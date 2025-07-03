import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { afterNextRender, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { EventType, Router, RouterOutlet } from '@angular/router';
import { Header } from '@componentes/header/header';
import { Menu } from '@componentes/menu/menu';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Usuario, Rol } from '@servicios/auth';
import { Data, MenuElemento, VarData } from '@servicios/data';

@Component({
  selector: 'mgp-root',
  imports: [
    RouterOutlet,
    Menu,
    Header,
    PrimengModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  dataVars: boolean = false;
  usuario: Usuario | null | undefined;
  seccionActual?: string;
  contenidos: MenuElemento[] = [];
  rolMinimo?: string;
  constructor(
    @Inject(PLATFORM_ID) private platID: any,
    private data: Data,
    private authServicio: Auth,
    private router: Router,
  ) {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platID)) {
        // Si se está ejecutando en el browser
      }
      if (isPlatformServer(this.platID)) {
        // Si se está ejecutando en el server
      }
    });
  }
  ngOnInit(): void {
    if (isPlatformBrowser(this.platID)) {
      // Si se está ejecutando en el browser
      this.authServicio.getAuth();
      this.authServicio.usuario.subscribe((usuario: Usuario | null | undefined) => this.usuario = usuario);
      this.data.init().subscribe((data: VarData) => {
        this.data.host = data.host;
        //*
        this.data.api = data.host + this.data.api;
        this.data.file = data.host + this.data.file;
        this.data.clean = data.host + this.data.clean;
        this.data.loadList = data.host + this.data.loadList;
        this.data.uploadFile = data.host + this.data.uploadFile;
        //*/
        this.contenidos = this.data.elementosMenu;
        this.getRolMinimo();
        this.dataVars = true;
      });
      this.seccionActual = this.router.url.split('?')[0];
      this.getRolMinimo();
      this.router.events.subscribe((ev: any) => {
        if (ev.type == EventType.NavigationEnd) {
          this.seccionActual = ev.url.split('?')[0];
          this.getRolMinimo();
        }
      });
    }
  }
  getRolMinimo(): void {
    this.rolMinimo = this.seccionActual ? this.contenidos.find((item: MenuElemento) => item["route"] == this.seccionActual)?.rol : undefined;
  }
  tienePermiso(): boolean {
    return this.authServicio.tienePermisos(this.rolMinimo as Rol, this.usuario?.rol as Rol);
  }
}
