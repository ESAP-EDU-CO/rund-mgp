# Integración de Autenticación en RUND-MGP

**Fecha:** 13 de diciembre de 2025
**Versión:** 1.0
**Estado:** ✅ Implementado - Listo para pruebas

---

## 📋 Resumen

Se ha completado la integración del sistema de autenticación en **rund-mgp** (frontend Angular 20) con el flujo:

```
rund-mgp (Angular) → rund-api (PHP BFF) → rund-auth (Node.js)
```

---

## 🎯 Componentes Implementados

### 1. **AuthService** (`compartidos/servicios/auth.ts`)

Servicio completo de autenticación usando Angular 20 Signals.

**Características:**
- ✅ Signals reactivos (usuario, cargando, error)
- ✅ Computed signals (estaAutenticado, esAdmin)
- ✅ Login con credenciales LDAP
- ✅ Logout y limpieza de sesión
- ✅ Verificación de sesión activa
- ✅ Refresh automático de JWT
- ✅ Login de desarrollo (DEV)
- ✅ withCredentials: true en todas las peticiones

**Métodos principales:**
```typescript
login(username: string, password: string): Observable<LoginResponse>
logout(): Observable<LogoutResponse>
verificarSesion(): Observable<SessionResponse>
refrescarJWT(): Observable<any>
devLogin(email: string): Observable<LoginResponse>
tienePermisos(rolMinimo: Rol, rolUsuario?: Rol): boolean
```

**Signals expuestos:**
```typescript
readonly usuario: Signal<Usuario | null | undefined>
readonly cargando: Signal<boolean>
readonly error: Signal<string | null>
readonly estaAutenticado: ComputedSignal<boolean>
readonly esAdmin: ComputedSignal<boolean>
```

### 2. **AuthGuard** (`compartidos/guards/auth-guard.ts`)

Guards de protección de rutas.

**Guards implementados:**
- `authGuard`: Verifica sesión activa, redirige a login si no autenticado
- `adminGuard`: Requiere rol de administrador

**Uso en routes:**
```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [authGuard]
}

{
  path: 'admin/settings',
  component: SettingsComponent,
  canActivate: [adminGuard]
}
```

### 3. **AuthInterceptor** (`compartidos/interceptores/auth-interceptor.ts`)

Interceptor HTTP para manejo automático de errores de autenticación.

**Funcionalidades:**
- ✅ Añade `withCredentials: true` a peticiones de la API
- ✅ Captura errores 401 (Unauthorized) → redirige a login
- ✅ Captura errores 403 (Forbidden) → redirige a acceso denegado
- ✅ Preserva returnUrl para redirección después del login

### 4. **Login Component** (`compartidos/componentes/login/`)

Componente de login completo con PrimeNG 20.x.

**Archivos:**
- `login.ts` - Lógica del componente (130 líneas)
- `login.html` - Template con componentes PrimeNG (98 líneas)
- `login.scss` - Estilos responsive (160 líneas)

**Componentes PrimeNG utilizados:**
- `p-inputtext` - Campo de usuario
- `p-password` - Campo de contraseña con toggleMask
- `p-button` - Botones de login
- `p-message` - Mensajes de error

**Características:**
- ✅ Formulario reactivo con validaciones
- ✅ Manejo de errores visual
- ✅ Estado de carga (loading)
- ✅ Botón de desarrollo (DEV)
- ✅ Diseño responsive
- ✅ Animaciones suaves
- ✅ returnUrl después de login exitoso

### 5. **PrimengModule** actualizado

Se agregaron módulos faltantes:
- ✅ `PasswordModule` - Campo de contraseña
- ✅ `MessageModule` - Mensajes de error

### 6. **app.config.ts** actualizado

Se registró el interceptor de autenticación:
```typescript
provideHttpClient(
  withFetch(),
  withInterceptors([authInterceptor])
)
```

---

## 🔄 Flujo de Autenticación Implementado

### Flujo de Login

```
1. Usuario ingresa credenciales en Login Component
   ↓
2. Login Component → AuthService.login()
   ↓
3. AuthService → HTTP POST /api/v2/auth/login (rund-api)
   ↓
4. rund-api → AuthController.login() → AuthService.loginWithLDAP()
   ↓
5. rund-api → HTTP POST /ldap/login (rund-auth)
   ↓
6. rund-auth → Valida contra LDAP de ESAP
   ↓
7. rund-auth ← Genera JWT RS256 + sesión Redis
   ↓
8. rund-api ← Recibe {user, internal_jwt}
   ↓
9. rund-api → Guarda JWT en $_SESSION (PHP)
   ↓
10. Login Component ← Recibe {success, user, session_id}
    ↓
11. AuthService → Actualiza signal usuario
    ↓
12. Router → Navega a returnUrl o '/'
```

### Flujo de Peticiones Protegidas

```
1. Usuario navega a ruta protegida
   ↓
2. AuthGuard se ejecuta
   ↓
3. AuthGuard → AuthService.verificarSesion()
   ↓
4. AuthService → HTTP GET /api/v2/auth/session
   ↓
5. rund-api → AuthController.getSession()
   ↓
6. rund-api → Obtiene JWT de $_SESSION
   ↓
7. rund-api → JWTValidator.validate() con JWKS
   ↓
8. Si válido → Retorna user data
9. Si inválido → 401 Unauthorized
   ↓
10. AuthInterceptor captura 401
    ↓
11. AuthInterceptor → Logout + Redirige a login
```

### Flujo de Logout

```
1. Usuario hace click en logout
   ↓
2. AuthService.logout()
   ↓
3. HTTP POST /api/v2/auth/logout
   ↓
4. rund-api → AuthController.logout()
   ↓
5. rund-api → session_destroy()
   ↓
6. rund-api → HTTP POST /logout (rund-auth) [best effort]
   ↓
7. AuthService → Signal usuario = null
   ↓
8. Router → Navega a /login
```

---

## 🧪 Testing

### Endpoints de Testing

**Health Check:**
```bash
curl http://localhost:3000/api/v2/auth/health
```

**Login de Desarrollo:**
```bash
curl -X POST http://localhost:3000/api/v2/auth/dev/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"usuario.administrador@esap.edu.co"}' \
  -c /tmp/cookies.txt
```

**Verificar Sesión:**
```bash
curl http://localhost:3000/api/v2/auth/session \
  -b /tmp/cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:3000/api/v2/auth/logout \
  -b /tmp/cookies.txt
```

### Pruebas en el Frontend

1. **Acceder a rund-mgp:**
   ```
   http://localhost:4000/login
   ```

2. **Login de desarrollo:**
   - Click en "Login de Desarrollo"
   - Confirmar el diálogo
   - Debe redirigir a la página principal

3. **Login con LDAP:**
   - Ingresar usuario LDAP: `usuario.apellido`
   - Ingresar contraseña
   - Click en "Iniciar Sesión"
   - Debe redirigir a la página principal

4. **Protección de rutas:**
   - Intentar acceder a ruta protegida sin login
   - Debe redirigir a `/login?returnUrl=/ruta-protegida`
   - Después del login, debe redirigir a la ruta original

5. **Logout:**
   - Click en botón de logout (si existe en header/menu)
   - Debe redirigir a `/login`
   - Intentar acceder a ruta protegida
   - Debe redirigir a login nuevamente

---

## 📝 Configuración Necesaria

### Variables de Entorno

En `rund-mgp`, la URL de rund-api está hardcodeada en AuthService:
```typescript
private readonly API_BASE_URL = 'http://localhost:3000/api/v2/auth';
```

**Para producción**, cambiar a:
```typescript
private readonly API_BASE_URL = 'https://rund.esap.edu.co/api/v2/auth';
```

O crear una variable de entorno Angular.

### Rutas de Angular

Agregar ruta de login en `app.routes.ts`:
```typescript
{
  path: 'login',
  component: Login
},
{
  path: 'acceso-denegado',
  component: AccesoDenegadoComponent // Crear este componente
}
```

### Rutas Protegidas

Ejemplo de cómo proteger rutas:
```typescript
{
  path: 'admin',
  canActivate: [authGuard],
  children: [
    {
      path: 'dashboard',
      component: DashboardComponent
    },
    {
      path: 'settings',
      component: SettingsComponent,
      canActivate: [adminGuard] // Solo admins
    }
  ]
}
```

---

## 🔐 Seguridad

### Implementado

- ✅ JWT RS256 almacenado en sesión PHP (nunca expuesto al frontend)
- ✅ Cookies httpOnly y sameSite=Lax
- ✅ withCredentials: true en todas las peticiones
- ✅ Timeout de inactividad (8 horas)
- ✅ Validación de JWT con JWKS público
- ✅ Interceptor que captura 401/403 automáticamente
- ✅ Guards de autenticación y autorización

### Pendiente para Producción

- [ ] Cambiar URL de API a HTTPS
- [ ] Configurar `COOKIE_SECURE=true` en rund-auth
- [ ] Configurar `session.cookie_secure=1` en rund-api
- [ ] Deshabilitar botón "Login de Desarrollo"
- [ ] Implementar rate limiting en login
- [ ] Agregar 2FA (opcional)

---

## 📂 Archivos Modificados/Creados

### Creados

1. `compartidos/componentes/login/login.ts` (130 líneas)
2. `compartidos/componentes/login/login.html` (98 líneas)
3. `compartidos/componentes/login/login.scss` (160 líneas)
4. `docs/INTEGRACION_AUTH.md` (este archivo)

### Modificados

1. `compartidos/servicios/auth.ts` - Reemplazado mock con implementación real (282 líneas)
2. `compartidos/guards/auth-guard.ts` - Implementado authGuard y adminGuard (96 líneas)
3. `compartidos/interceptores/auth-interceptor.ts` - Implementado manejo de 401/403 (56 líneas)
4. `compartidos/modulos/primeng/primeng-module.ts` - Agregados PasswordModule y MessageModule
5. `app.config.ts` - Registrado authInterceptor

---

## 🚀 Próximos Pasos

### 1. Testing Completo

- [ ] Probar login con credenciales LDAP reales
- [ ] Probar flujo completo: login → acceso a rutas protegidas → logout
- [ ] Probar timeout de sesión (8 horas)
- [ ] Probar refresh automático de JWT (15 minutos)
- [ ] Probar manejo de errores (credenciales incorrectas, red caída, etc.)

### 2. UI/UX

- [ ] Crear componente de header con botón de logout
- [ ] Crear componente de acceso denegado
- [ ] Agregar indicador de usuario autenticado en header
- [ ] Agregar mensaje de sesión expirada
- [ ] Mejorar mensajes de error (más específicos)

### 3. Integración con Rutas Existentes

- [ ] Revisar rutas en `app.routes.ts`
- [ ] Proteger rutas administrativas con `authGuard`
- [ ] Proteger rutas sensibles con `adminGuard`
- [ ] Agregar redirección a login como ruta por defecto

### 4. Optimizaciones

- [ ] Implementar refresh automático de JWT antes de expiración
- [ ] Agregar persistencia de sesión (localStorage opcional)
- [ ] Implementar sistema de notificaciones (toast)
- [ ] Agregar loading global durante verificación de sesión inicial

---

## 🐛 Troubleshooting

### Error: "p-message is not a known element"

**Solución:** Ya resuelto. Se agregó `MessageModule` a `PrimengModule`.

### Error: "Can't bind to 'feedback' in p-password"

**Solución:** Ya resuelto. Se agregó `PasswordModule` a `PrimengModule`.

### Error: CORS al hacer peticiones a rund-api

**Verificar:**
1. rund-api tiene configurado CORS para `http://localhost:4000`
2. Se está usando `withCredentials: true` en las peticiones

### Error: "Session not found"

**Causas posibles:**
1. Sesión expiró (8 horas de inactividad)
2. Redis fue reiniciado (sesiones perdidas)
3. Cookie no se está enviando (verificar withCredentials)

**Solución:**
- Hacer logout y login nuevamente
- Verificar configuración de cookies en browser

---

## 📚 Documentación Relacionada

- [rund-auth README](../../rund-auth/README.md)
- [Guía de Integración](../../rund-auth/docs/integracion-ecosistema-rund.md)
- [Testing de Autenticación](../../rund-api/docs/TESTING_AUTH.md)
- [Documentación de rund-api](../../rund-api/docs/AUTENTICACION.md)

---

**Última actualización:** 13 de diciembre de 2025
**Estado:** ✅ Integración completa en rund-mgp - Listo para testing end-to-end
