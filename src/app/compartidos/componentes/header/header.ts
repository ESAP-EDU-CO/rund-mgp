import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Rol, Usuario } from '@servicios/auth';
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
  usuario: Usuario | null | undefined;
  logo: string | ArrayBuffer | null = null;
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private data: Data = inject(Data);
  private authServicio: Auth = inject(Auth);
  ngOnInit(): void {
    this.authServicio.usuario
      .subscribe((usuario: Usuario | null | undefined) => {
        this.usuario = usuario;
        this.cdr.detectChanges();
      });
    this.data.getImagen('logoESAP.svg')
      .subscribe((logo: string | ArrayBuffer | null) => {
        if (logo) {
          this.logo = logo;
          this.cdr.detectChanges();
        }
      });
  }
  login(tipo: string): void {
    this.authServicio.getAuth(tipo as Rol);
    this.cdr.detectChanges();
  }
  logout(): void {
    this.authServicio.logout();
    this.cdr.detectChanges();
  }
}
