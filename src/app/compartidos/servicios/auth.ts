import { Injectable, signal, computed, inject, Signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { getEndpointUrl } from './api-config';
import { ConfigService } from './config.service';

export type Rol = 'admin' | 'gestor' | 'directivo' | 'usuario';

export interface Usuario {
  sub: string;
  name: string;
  email: string;
  tid: string;
  roles?: Rol[];
  rol?: Rol;
}

export interface LoginResponse {
  success: boolean;
  user: Usuario;
  session_id: string;
  message?: string;
}

export interface SessionResponse {
  success: boolean;
  user: Usuario;
  session_id: string;
  should_refresh: boolean;
  last_activity: number;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private configService: ConfigService = inject(ConfigService);

  // Signals de Angular 20 para estado reactivo
  private usuarioSignal: WritableSignal<Usuario | null | undefined> = signal<Usuario | null | undefined>(undefined);
  private cargandoSignal: WritableSignal<boolean> = signal<boolean>(false);
  private errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  // Exponer signals como readonly
  public readonly usuario: Signal<Usuario | null | undefined> = this.usuarioSignal.asReadonly();
  public readonly cargando: Signal<boolean> = this.cargandoSignal.asReadonly();
  public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  // Computed signals
  public readonly estaAutenticado: Signal<boolean> = computed(() => this.usuarioSignal() !== null && this.usuarioSignal() !== undefined);
  public readonly esAdmin: Signal<boolean> = computed(() => {
    const usuario = this.usuarioSignal();
    return usuario?.rol === 'admin' || usuario?.roles?.includes('admin') || usuario?.email.includes('usuario.administrador') || false;
  });

  constructor() {
    // No hacer nada aquí - ConfigService ya debe estar inicializado
    // por APP_INITIALIZER antes de que se cree este servicio
  }
  /**
   * Se realiza el login con credenciales LDAP a través de rund-api
   */
  login(username: string, password: string): Observable<LoginResponse> {
    this.cargandoSignal.set(true);
    this.errorSignal.set(null);

    const baseUrl = this.configService.getApiBaseUrl();
    const loginUrl = getEndpointUrl('login', baseUrl);

    return this.http.post<LoginResponse>(
      loginUrl,
      { username, password },
      { withCredentials: true } // IMPORTANTE: enviar cookies
    ).pipe(
      tap((response) => {
        if (response.success && response.user) {
          // Mapear el usuario de rund-auth al formato de la aplicación
          const usuario: Usuario = {
            ...response.user,
            rol: this.determinarRol(response.user)
          };
          this.usuarioSignal.set(usuario);
          this.cargandoSignal.set(false);
        }
      }),
      catchError((error) => {
        this.cargandoSignal.set(false);
        const errorMsg = error.error?.error || 'Error de autenticación';
        this.errorSignal.set(errorMsg);
        this.usuarioSignal.set(null);
        return of({
          success: false,
          user: {} as Usuario,
          session_id: '',
          message: errorMsg
        });
      })
    );
  }

  /**
   * Se realiza el logout y se limpia la sesión
   */
  logout(): Observable<LogoutResponse> {
    this.cargandoSignal.set(true);

    const baseUrl = this.configService.getApiBaseUrl();
    const logoutUrl = getEndpointUrl('logout', baseUrl);

    return this.http.post<LogoutResponse>(
      logoutUrl,
      {},
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success) {
          this.usuarioSignal.set(null);
          this.cargandoSignal.set(false);
          this.router.navigate(['/login']);
        }
      }),
      catchError(() => {
        // Aunque falle el logout en el servidor, limpiar localmente
        this.usuarioSignal.set(null);
        this.cargandoSignal.set(false);
        this.router.navigate(['/login']);
        return of({
          success: false,
          message: 'Error al cerrar sesión'
        });
      })
    );
  }

  /**
   * Se verifica la sesión actual en rund-api
   */
  verificarSesion(): Observable<SessionResponse> {
    this.cargandoSignal.set(true);

    const baseUrl: string = this.configService.getApiBaseUrl();
    const sessionUrl: string = getEndpointUrl('session', baseUrl);

    return this.http.get<SessionResponse>(
      sessionUrl,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success && response.user) {
          const usuario: Usuario = {
            ...response.user,
            rol: this.determinarRol(response.user)
          };
          this.usuarioSignal.set(usuario);

          // Si el JWT necesita refrescarse, hacerlo automáticamente
          if (response.should_refresh) {
            this.refrescarJWT().subscribe();
          }
        } else {
          this.usuarioSignal.set(null);
        }
        this.cargandoSignal.set(false);
      }),
      catchError(() => {
        this.usuarioSignal.set(null);
        this.cargandoSignal.set(false);
        return of({
          success: false,
          user: {} as Usuario,
          session_id: '',
          should_refresh: false,
          last_activity: 0
        });
      })
    );
  }

  /**
   * Se refresca el JWT interno (llamado automáticamente cuando es necesario)
   */
  refrescarJWT(): Observable<any> {
    const baseUrl = this.configService.getApiBaseUrl();
    const refreshUrl = getEndpointUrl('refresh', baseUrl);

    return this.http.post(
      refreshUrl,
      {},
      { withCredentials: true }
    ).pipe(
      catchError(() => {
        // Si falla el refresh, hacer logout
        this.usuarioSignal.set(null);
        this.router.navigate(['/login']);
        return of({ success: false });
      })
    );
  }

  /**
   * Login de desarrollo (solo DEV)
   */
  devLogin(email: string): Observable<LoginResponse> {
    this.cargandoSignal.set(true);
    this.errorSignal.set(null);

    const baseUrl = this.configService.getApiBaseUrl();
    const devLoginUrl = getEndpointUrl('devLogin', baseUrl);

    return this.http.post<LoginResponse>(
      devLoginUrl,
      { email },
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        if (response.success && response.user) {
          const usuario: Usuario = {
            ...response.user,
            rol: this.determinarRol(response.user)
          };
          this.usuarioSignal.set(usuario);
          this.cargandoSignal.set(false);
        }
      }),
      catchError((error) => {
        this.cargandoSignal.set(false);
        const errorMsg = error.error?.error || 'Error en login de desarrollo';
        this.errorSignal.set(errorMsg);
        return of({
          success: false,
          user: {} as Usuario,
          session_id: '',
          message: errorMsg
        });
      })
    );
  }

  /**
   * Se verifica si el usuario tiene permisos según su rol
   *
   * Jerarquía de roles (de mayor a menor privilegio):
   * - admin: Acceso total
   * - gestor: Gestión de documentos y certificados
   * - directivo: Consultas y reportes
   * - usuario: Solo validación
   */
  tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean {
    const roles: Rol[] = ['admin', 'gestor', 'directivo', 'usuario'];
    const rol = rolUsuario || this.usuarioSignal()?.rol || 'usuario';
    return roles.indexOf(rol) <= roles.indexOf(rolMinimo);
  }

  /**
   * Se determina el rol del usuario basado en los datos de rund-auth
   */
  private determinarRol(user: Usuario): Rol {
    //* SOLO PARA DESARROLLO
    if ((!this.usuarioSignal() && user.email.includes('usuario.administrador')) || this.esAdmin()) {
      return 'admin';
    }
    if ((!this.usuarioSignal() && user.email.includes('usuario.gestor'))) {
      return 'gestor';
    }
    if ((!this.usuarioSignal() && user.email.includes('usuario.directivo'))) {
      return 'directivo';
    }
    if ((!this.usuarioSignal() && user.email.includes('usuario.usuario'))) {
      return 'usuario';
    }
    //*/

    // Si ya tiene rol definido, usarlo
    if (user.rol) {
      return user.rol;
    }

    // Si tiene array de roles, usar el primero
    if (user.roles && user.roles.length > 0) {
      return user.roles[0];
    }

    // Por defecto, asignar rol 'usuario'
    // TODO: Implementar lógica de determinación de rol según datos LDAP o Azure AD
    return 'usuario';
  }

  /**
   * Se limpia el error actual
   */
  limpiarError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Método legacy para compatibilidad con código existente
   * @deprecated Usar login() en su lugar
   */
  getAuth(): void {
    console.warn('getAuth() está deprecado. Usar login() en su lugar.');
    // Intentar verificar sesión
    this.verificarSesion().subscribe();
  }
}
