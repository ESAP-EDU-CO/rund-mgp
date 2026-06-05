import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Component, effect, inject, OnInit, PLATFORM_ID, Signal } from '@angular/core';
import { EventType, Router, RouterOutlet } from '@angular/router';
import { Header } from '@componentes/header/header';
import { Menu } from '@componentes/menu/menu';
import { Login } from '@componentes/login/login';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Rol, Usuario } from '@servicios/auth';
import { Data, MenuElemento, VarData } from '@servicios/data';

@Component({
  selector: 'mgp-root',
  imports: [
    RouterOutlet,
    Menu,
    Header,
    Login,
    PrimengModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  configLoaded = false;
  dataVars = false;
  seccionActual?: string;
  contenidos: MenuElemento[] = [];
  rolMinimo?: string;

  private platID: any = inject(PLATFORM_ID);
  private data: Data = inject(Data);
  private authServicio: Auth = inject(Auth);
  private router: Router = inject(Router);
  private document: Document = inject(DOCUMENT);
// Usar signal directamente
  protected usuario: Signal<Usuario | null | undefined> = this.authServicio.usuario;

  tienePermiso = false;

  constructor() {
    // Effect para detectar cambios en el usuario
    effect(() => this.inicializa());
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platID)) {
      // ConfigService ya fue inicializado por APP_INITIALIZER
      this.configLoaded = true;
      // Verificar sesión al iniciar
      this.authServicio.verificarSesion().subscribe();
      this.router.events.subscribe((ev: any) => {
        if (ev.type == EventType.NavigationEnd) this.inicializa();
      });
      // Sincroniza clase 'app-dark' en <html> con prefers-color-scheme
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applyDark = (dark: boolean) =>
        this.document.documentElement.classList.toggle('app-dark', dark);
      applyDark(darkQuery.matches);
      darkQuery.addEventListener('change', (e) => applyDark(e.matches));
    }
  }
  inicializa(): void {
    this.data.init().subscribe({
      next: (_data: VarData) => {
        this.seccionActual = this.router.url.split('?')[0];
        this.contenidos = this.data.elementosMenu;
        this.rolMinimo = this.seccionActual ? this.contenidos.find((item: MenuElemento) => item["route"] == this.seccionActual)?.rol : undefined;
        this.tienePermiso = this.authServicio.tienePermisos(this.rolMinimo as Rol, this.usuario()?.rol as Rol);
        this.dataVars = true;
        if (this.usuario() && this.seccionActual === '/login') this.router.navigate(['/']);
      },
      error: () => { /* sin sesión activa — el authGuard redirige a /login */ }
    });
  }
}
