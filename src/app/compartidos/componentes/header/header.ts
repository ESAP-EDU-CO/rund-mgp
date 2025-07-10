import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { PrimengModule } from '@modulos/primeng/primeng-module';
import { Auth, Rol, Usuario } from '@servicios/auth';

@Component({
  selector: 'mgp-header',
  imports: [
    PrimengModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  usuario: Usuario | null | undefined;
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  constructor(private authServicio: Auth) {
    this.authServicio.usuario.subscribe((usuario: Usuario | null | undefined) => this.usuario = usuario);
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
