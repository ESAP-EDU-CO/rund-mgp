import { ChangeDetectorRef, Component, inject, isDevMode, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Auth } from '../../servicios/auth';
import { PrimengModule } from '@modulos/primeng/primeng-module';

import { Data } from '@servicios/data';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'mgp-login',
  imports: [
    ReactiveFormsModule,
    PrimengModule
],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private authService = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private dataServicio: Data = inject(Data);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  // Solo mostrar controles de desarrollo en entorno no-producción
  protected readonly isDev = isDevMode();

  // Signals para el estado del componente
  protected cargando = this.authService.cargando;
  protected errorMensaje = signal<string | null>(null);
  protected mostrarPassword = signal<boolean>(false);

  // Formulario de login
  protected loginForm: FormGroup;

  // URL de retorno después del login exitoso
  private returnUrl = '/';

  logo: string | ArrayBuffer | null = null;

  constructor() {
    // Crear formulario reactivo
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(3)]]
    });

    // Obtener returnUrl de los query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    // Si ya está autenticado, redirigir
    if (this.authService.estaAutenticado()) {
      this.router.navigate([this.returnUrl]);
    }
  }
  async ngOnInit(): Promise<void> {
    this.logo = await firstValueFrom(this.dataServicio.getImagen('logoESAP.svg'));
    this.cdr.detectChanges();
  }
  /**
   * Se procesa el formulario de login
   */
  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMensaje.set('Por favor, complete todos los campos correctamente.');
      return;
    }

    this.errorMensaje.set(null);

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        if (response.success) {
          // Login exitoso, redirigir
          this.router.navigate([this.returnUrl]);
        } else {
          // Error en login
          this.errorMensaje.set(response.message || 'Error de autenticación');
        }
      },
      error: (error) => {
        // Error de red o del servidor
        const mensaje = error.error?.error || 'Error al conectar con el servidor';
        this.errorMensaje.set(mensaje);
      }
    });
  }

  /**
   * Se alterna la visibilidad de la contraseña
   */
  protected togglePasswordVisibility(): void {
    this.mostrarPassword.set(!this.mostrarPassword());
  }

  /**
   * Login de desarrollo (solo para testing)
   * IMPORTANTE: Deshabilitar en producción
   */
  protected loginDev(): void {
    if (confirm('¿Usar login de desarrollo?')) {
      this.authService.devLogin('usuario.administrador@esap.edu.co').subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate([this.returnUrl]);
          } else {
            this.errorMensaje.set(response.message || 'Error en login de desarrollo');
          }
        },
        error: () => {
          this.errorMensaje.set('Error al conectar con el servidor');
        }
      });
    }
  }

  /**
   * Se limpia el mensaje de error
   */
  protected limpiarError(): void {
    this.errorMensaje.set(null);
  }

  /**
   * Getters para validación de campos
   */
  protected get usernameInvalid(): boolean {
    const control = this.loginForm.get('username');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  protected get passwordInvalid(): boolean {
    const control = this.loginForm.get('password');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
