# Migración del Sistema de Roles en RUND-MGP

**Fecha:** 13 de diciembre de 2025
**Versión:** 1.0
**Estado:** ✅ Completado

---

## 📋 Resumen de Cambios

Se ha migrado el sistema de autenticación y roles de RUND-MGP de un sistema mock basado en BehaviorSubject a un sistema real de autenticación basado en Angular 20 Signals, con integración completa a rund-auth vía rund-api.

---

## 🔄 Cambios en Roles

### Roles Antiguos → Roles Nuevos

| Rol Anterior | Rol Nuevo | Cambio | Justificación |
|--------------|-----------|--------|---------------|
| `admin` | `admin` | Sin cambios | Usuario administrador con acceso total |
| `servicio` | `gestor` | ✅ Renombrado | Más descriptivo: "gestor" gestiona documentos |
| `consulta` | `directivo` | ✅ Renombrado | Más descriptivo: "directivo" consulta reportes |
| `usuario` | `usuario` | Sin cambios | Usuario profesor básico |

### Jerarquía de Roles (de mayor a menor privilegio)

```typescript
const roles: Rol[] = ['admin', 'gestor', 'directivo', 'usuario'];
```

**Interpretación:**
- `admin` tiene acceso a TODO
- `gestor` tiene acceso a todo excepto funciones exclusivas de admin
- `directivo` tiene acceso a consultas y reportes
- `usuario` tiene acceso solo a validación

---

## 📂 Archivos Modificados

### 1. **auth.ts** ([compartidos/servicios/auth.ts](../src/app/compartidos/servicios/auth.ts))

**Cambios:**
- ✅ Cambio de tipo `Rol`: `'servicio' | 'consulta'` → `'gestor' | 'directivo'`
- ✅ Actualización de jerarquía en `tienePermisos()`: `['admin', 'gestor', 'directivo', 'usuario']`
- ✅ Documentación de roles y permisos

**Antes:**
```typescript
export type Rol = 'admin' | 'servicio' | 'consulta' | 'usuario';

tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean {
  const roles: Rol[] = ['admin', 'servicio', 'consulta', 'usuario'];
  const rol = rolUsuario || this.usuarioSignal()?.rol || 'usuario';
  return roles.indexOf(rol) <= roles.indexOf(rolMinimo);
}
```

**Después:**
```typescript
export type Rol = 'admin' | 'gestor' | 'directivo' | 'usuario';

/**
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
```

### 2. **data.ts** ([compartidos/servicios/data.ts](../src/app/compartidos/servicios/data.ts))

**Cambios:**
- ✅ Actualización de roles en `elementosMenu`
- ✅ Habilitación de opciones de menú comentadas (dashboard, consultas)
- ✅ Reordenación de elementos de menú

**Antes:**
```typescript
public elementosMenu: MenuElemento[] = [
  /*{ label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'consulta' },
  { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'consulta' },*/
  { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'servicio' },
  { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'servicio' },
  { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'servicio' },
  { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario' },
  { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'servicio' },
];
```

**Después:**
```typescript
public elementosMenu: MenuElemento[] = [
  { label: 'Panel de control', faIcon: this.faGauge, route: '/dashboard', rol: 'directivo' },
  { label: 'Consultas', faIcon: this.faMagnifyingGlassChart, route: '/consultas', rol: 'directivo' },
  { label: 'Listados', tipo: 'PrimeNG', icon: 'pi pi-list-check', route: '/listados', rol: 'gestor' },
  { label: 'Gestión', faIcon: this.faFileArrowUp, route: '/gestion', rol: 'gestor' },
  { label: 'Certificados', faIcon: this.faFileAlt, route: '/certificados', rol: 'gestor' },
  { label: 'Herramientas', tipo: 'PrimeNG', icon: 'pi pi-wrench', route: '/herramientas', rol: 'gestor' },
  { label: 'Validación', faIcon: this.faCheckDouble, route: '/validacion', rol: 'usuario' },
];
```

### 3. **menu.ts** ([compartidos/componentes/menu/menu.ts](../src/app/compartidos/componentes/menu/menu.ts))

**Cambios:**
- ✅ Migración de BehaviorSubject a Signals
- ✅ Uso de `effect()` para detección de cambios reactiva
- ✅ Eliminación de suscripción manual
- ✅ Migración de constructor injection a `inject()` function

**Antes:**
```typescript
export class Menu implements OnInit {
  usuario?: Usuario;

  constructor(
    private authServicio: Auth,
    // ...
  ) {
    this.authServicio.usuario.subscribe((usuario: Usuario | null | undefined) =>
      this.usuario = usuario as Usuario
    );
  }
}
```

**Después:**
```typescript
export class Menu implements OnInit {
  private router = inject(Router);
  private authServicio = inject(Auth);
  private dataServicio = inject(Data);
  private platID = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  // Usar el signal directamente del servicio
  protected usuario = this.authServicio.usuario;

  constructor() {
    // Effect para detectar cambios en el usuario
    effect(() => {
      const user = this.usuario();
      if (user !== undefined) {
        this.cdr.detectChanges();
      }
    });
  }
}
```

**Template (sin cambios):**
```html
@if (permiso(item, usuario()?.rol)){
  <!-- ... -->
}
```

### 4. **header.ts** ([compartidos/componentes/header/header.ts](../src/app/compartidos/componentes/header/header.ts))

**Cambios:**
- ✅ Migración de BehaviorSubject a Signals
- ✅ Uso de `effect()` para detección de cambios
- ✅ Eliminación de método `login(tipo: string)` (ya no se usa)
- ✅ Actualización de método `logout()` para usar Observable
- ✅ Nuevo método `irALogin()` para redirigir a página de login

**Antes:**
```typescript
export class Header implements OnInit {
  usuario: Usuario | null | undefined;

  ngOnInit(): void {
    this.authServicio.usuario
      .subscribe((usuario: Usuario | null | undefined) => {
        this.usuario = usuario;
        this.cdr.detectChanges();
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
```

**Después:**
```typescript
export class Header implements OnInit {
  // Usar el signal directamente del servicio
  protected usuario = this.authServicio.usuario;

  constructor() {
    // Effect para detectar cambios en el usuario
    effect(() => {
      const user = this.usuario();
      if (user !== undefined) {
        this.cdr.detectChanges();
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authServicio.logout().subscribe();
  }
}
```

### 5. **header.html** ([compartidos/componentes/header/header.html](../src/app/compartidos/componentes/header/header.html))

**Cambios:**
- ✅ Uso de signal con `()` en template
- ✅ Eliminación de botones de login por tipo
- ✅ Reemplazo con un solo botón "Iniciar sesión"
- ✅ Uso de `usuario()?.name || usuario()?.email` para mostrar nombre

**Antes:**
```html
@if (usuario) {
  <div class="nombre">
    <span [innerHTML]="usuario.nombre"></span>
  </div>
  <p-button severity="secondary" (onClick)="logout()" icon="pi pi-sign-out" />
} @else {
  @for (tipo of ['admin', 'servicio', 'consulta', 'usuario']; track tipo){
    <p-button (onClick)="login(tipo)" [label]="tipo" />
  }
}
```

**Después:**
```html
@if (usuario()) {
  <div class="nombre">
    <span [innerHTML]="usuario()?.name || usuario()?.email"></span>
  </div>
  <p-button severity="secondary"
            (onClick)="logout()"
            icon="pi pi-sign-out"
            label="Cerrar sesión" />
} @else {
  <p-button (onClick)="irALogin()"
            label="Iniciar sesión"
            icon="pi pi-sign-in"
            severity="primary" />
}
```

---

## 🎯 Permisos por Rol

### Admin
**Acceso a:**
- ✅ Panel de control
- ✅ Consultas
- ✅ Listados
- ✅ Gestión
- ✅ Certificados
- ✅ Herramientas
- ✅ Validación

### Gestor (antes "Servicio")
**Acceso a:**
- ✅ Panel de control
- ✅ Consultas
- ✅ Listados
- ✅ Gestión
- ✅ Certificados
- ✅ Herramientas
- ❌ Funciones exclusivas de admin

### Directivo (antes "Consulta")
**Acceso a:**
- ✅ Panel de control
- ✅ Consultas
- ❌ Listados
- ❌ Gestión
- ❌ Certificados
- ❌ Herramientas

### Usuario (Profesor)
**Acceso a:**
- ✅ Validación
- ❌ Todo lo demás

---

## 🔍 Cómo Funciona `tienePermisos()`

```typescript
tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean {
  const roles: Rol[] = ['admin', 'gestor', 'directivo', 'usuario'];
  const rol = rolUsuario || this.usuarioSignal()?.rol || 'usuario';
  return roles.indexOf(rol) <= roles.indexOf(rolMinimo);
}
```

**Ejemplo 1:** Usuario con rol `gestor` intenta acceder a "Listados" (rolMinimo: `gestor`)
```typescript
roles.indexOf('gestor') <= roles.indexOf('gestor')  // 1 <= 1 → true ✅
```

**Ejemplo 2:** Usuario con rol `directivo` intenta acceder a "Listados" (rolMinimo: `gestor`)
```typescript
roles.indexOf('directivo') <= roles.indexOf('gestor')  // 2 <= 1 → false ❌
```

**Ejemplo 3:** Usuario con rol `admin` intenta acceder a "Validación" (rolMinimo: `usuario`)
```typescript
roles.indexOf('admin') <= roles.indexOf('usuario')  // 0 <= 3 → true ✅
```

**Ejemplo 4:** Usuario con rol `gestor` intenta acceder a "Consultas" (rolMinimo: `directivo`)
```typescript
roles.indexOf('gestor') <= roles.indexOf('directivo')  // 1 <= 2 → true ✅
```

---

## ⚠️ Puntos Importantes

### 1. Uso de Signals en Templates

**CORRECTO:**
```html
@if (usuario()) {
  <span>{{ usuario()?.name }}</span>
}
```

**INCORRECTO:**
```html
@if (usuario) {  <!-- ❌ Falta () -->
  <span>{{ usuario.name }}</span>  <!-- ❌ Falta () -->
}
```

### 2. Effect vs Subscribe

**Angular 20 con Signals:**
```typescript
// ✅ CORRECTO: Usar effect()
constructor() {
  effect(() => {
    const user = this.usuario();
    // reaccionar a cambios
  });
}

// ❌ INCORRECTO: No usar subscribe en signals
this.usuario.subscribe(...) // Error: Signal no tiene método subscribe
```

### 3. Detección de Cambios

Cuando se usa `effect()`, Angular detecta cambios automáticamente. Sin embargo, en algunos casos (como SSR o cambios externos), puede ser necesario forzar detección manual:

```typescript
effect(() => {
  const user = this.usuario();
  if (user !== undefined) {
    this.cdr.detectChanges(); // Forzar detección manual
  }
});
```

### 4. Property Initialization Order (inject() vs Constructor Injection)

**IMPORTANTE**: En Angular 20, si necesitas referenciar un servicio inyectado en una propiedad de clase, debes usar `inject()` en lugar de constructor injection:

**❌ INCORRECTO - Constructor Injection:**
```typescript
export class Menu {
  protected usuario = this.authServicio.usuario; // ❌ Error: authServicio usado antes de inicialización

  constructor(
    private authServicio: Auth, // Declarado después de la propiedad
  ) {}
}
```

**✅ CORRECTO - inject() Function:**
```typescript
export class Menu {
  private authServicio = inject(Auth); // ✅ inject() se ejecuta en la fase de inicialización de propiedades
  protected usuario = this.authServicio.usuario; // ✅ Ahora authServicio ya está disponible

  constructor() {
    // Constructor sin parámetros
  }
}
```

**Razón**: En TypeScript, las propiedades de clase se inicializan **antes** de que se ejecute el constructor. Por lo tanto, si usas constructor injection, las dependencias no están disponibles durante la inicialización de propiedades. La función `inject()` se ejecuta durante la fase de inicialización de propiedades, permitiendo que las dependencias estén disponibles para otras propiedades.

---

## 🧪 Testing

### Verificar Roles en Menu

1. Login como `admin` → Debe ver TODOS los elementos del menú
2. Login como `gestor` → Debe ver: Dashboard, Consultas, Listados, Gestión, Certificados, Herramientas
3. Login como `directivo` → Debe ver: Dashboard, Consultas
4. Login como `usuario` → Debe ver: Validación

### Verificar Header

1. Sin login → Debe mostrar botón "Iniciar sesión"
2. Con login → Debe mostrar nombre del usuario + botón "Cerrar sesión"
3. Click en "Cerrar sesión" → Debe redirigir a `/login`

---

## 📚 Referencias

- [Angular Signals Documentation](https://angular.io/guide/signals)
- [Angular Effect Documentation](https://angular.io/guide/signals#effects)
- [rund-mgp/docs/INTEGRACION_AUTH.md](./INTEGRACION_AUTH.md)
- [rund-api/docs/AUTENTICACION.md](../../rund-api/docs/AUTENTICACION.md)

---

**Última actualización:** 13 de diciembre de 2025
**Estado:** ✅ Migración completa - Sistema de roles funcionando con autenticación real
