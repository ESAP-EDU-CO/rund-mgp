import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { PrimengModule } from '@modulos/primeng/primeng-module';


@Component({
  selector: 'mgp-acceso-denegado',
  standalone: true,
  imports: [PrimengModule],
  templateUrl: './acceso-denegado.html',
  styleUrl: './acceso-denegado.scss',
})
export class AccesoDenegado {
  private router = inject(Router);
  private authService = inject(Auth);

  protected nombreUsuario = this.authService.usuario;
  protected readonly rolUsuario = computed(() => this.authService.usuario()?.rol);

  protected irInicio(): void {
    this.router.navigate(['/listados']);
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
