import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
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
  configLoaded: boolean = false;
  dataVars: boolean = false;
  usuario: Usuario | null | undefined;
  seccionActual?: string;
  contenidos: MenuElemento[] = [];
  rolMinimo?: string;
  private platID: any = inject(PLATFORM_ID);
  private data: Data = inject(Data);
  private authServicio: Auth = inject(Auth);
  private router: Router = inject(Router);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  ngOnInit(): void {
    if (isPlatformBrowser(this.platID)) {
      this.data.getConfig()
        .subscribe((resp: boolean) => {
          // La configuración ya se actualiza automáticamente en API_CONFIG.baseUrl
          this.configLoaded = resp; // Ya se puede cargar el contenido, porque se ha leído la configuración que viene desde /api/config - Node.js
          this.authServicio.getAuth();
          this.authServicio.usuario.subscribe((usuario: Usuario | null | undefined) => {
            this.usuario = usuario;
            this.cdr.detectChanges();
          });
          this.data.init().subscribe((data: VarData) => {
            this.contenidos = this.data.elementosMenu;
            this.getRolMinimo();
            this.dataVars = true;
            this.cdr.detectChanges();
          });
          this.seccionActual = this.router.url.split('?')[0];
          this.getRolMinimo();
          this.router.events.subscribe((ev: any) => {
            if (ev.type == EventType.NavigationEnd) {
              this.seccionActual = ev.url.split('?')[0];
              this.getRolMinimo();
            }
          });
        });
    }
  }
  getRolMinimo(): void {
    this.rolMinimo = this.seccionActual ? this.contenidos.find((item: MenuElemento) => item["route"] == this.seccionActual)?.rol : undefined;
    this.cdr.detectChanges();
  }
  tienePermiso(): boolean {
    return this.authServicio.tienePermisos(this.rolMinimo as Rol, this.usuario?.rol as Rol);
  }
}
