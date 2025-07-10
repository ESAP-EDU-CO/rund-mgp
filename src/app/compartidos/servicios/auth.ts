import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Rol = 'admin' | 'servicio' | 'consulta' | 'usuario';

export interface Usuario {
  nombre: string;
  email: string;
  rol: Rol;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  public usuario: BehaviorSubject<Usuario | null | undefined> = new BehaviorSubject<Usuario | null | undefined>(undefined);
  getAuth(tipo: Rol = 'admin'): void {
    // Acciones necesarias para obtener el estado de autenticación y el usuario
    /* Temporalmente, se inicia con autenticación true y un usuario admin */
    const usuario: { [key: string]: Usuario } = {
      admin: {
        nombre: 'Usuario administrador',
        email: 'usuario.administrador@esap.edu.co',
        rol: 'admin'
      },
      servicio: {
        nombre: 'Usuario servicio',
        email: 'usuario.servicio@esap.edu.co',
        rol: 'servicio'
      },
      consulta: {
        nombre: 'Usuario consulta',
        email: 'usuario.consulta@esap.edu.co',
        rol: 'consulta'
      },
      usuario: {
        nombre: 'Usuario usuario',
        email: 'usuario.usuario@esap.edu.co',
        rol: 'usuario'
      }
    };
    this.usuario.next(undefined);
    setTimeout(() => this.usuario.next(usuario[tipo]), 1000);
  }
  logout(): void {
    // Acciones necesarias para iniciar sesión
    /* Temporalmente, se hace logout genérico */
    this.usuario.next(null);
  }
  tienePermisos(rolMinimo: Rol, rolUsuario: Rol): boolean {
    const roles: Rol[] = ['admin', 'servicio', 'consulta', 'usuario'];
    return roles.indexOf(rolUsuario) <= roles.indexOf(rolMinimo);
  }
}
