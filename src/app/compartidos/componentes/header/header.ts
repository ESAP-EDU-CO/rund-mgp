import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { EventType, Router } from '@angular/router';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth } from '@servicios/auth';
import { Data } from '@servicios/data';

@Component({
  selector: 'mgp-header',
  imports: [
    PrimengModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  protected logo: string | ArrayBuffer | null = null;

  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private data: Data = inject(Data);
  private authServicio: Auth = inject(Auth);
  private router: Router = inject(Router);

  // Usar el signal directamente del servicio
  protected usuario = this.authServicio.usuario;

  enLogin: boolean = false;

  ngOnInit(): void {
    this.data.getImagen('logoESAP.svg')
      .subscribe((logo: string | ArrayBuffer | null) => {
        if (logo) {
          this.logo = logo;
          this.cdr.detectChanges();
        }
      });
    this.router.events.subscribe((ev: any) => {
      if (ev.type == EventType.NavigationEnd) this.enLogin = ev.url.split('?')[0] === '/login';
      this.cdr.detectChanges();
    });
  }

  /**
   * Redirige a la página de login
   */
  irALogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.authServicio.logout().subscribe();
  }
}
