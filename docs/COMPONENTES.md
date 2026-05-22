# Referencia de Componentes RUND MGP

Documentación de los componentes principales con sus inputs, outputs y patrones de uso.

## Componentes de Vista (Vistas)

### Extraccion

**Ubicación:** `src/app/vistas/extraccion/extraccion.ts`

**Descripción:** Panel de estadísticas de extracción de documentos con IA. Muestra en tiempo real:
- Total de documentos procesados
- Estado de cada documento (completado, procesando, pendiente, error)
- Tasa de éxito general
- Cola activa
- Desglose por tipo de documento

**Inputs:** Ninguno

**Outputs:** Ninguno

**Servicios inyectados:**
- `Data` — Acceso a `getExtraccionStats()` y `getQueueStats()`

**Interfaz de datos:**

```typescript
interface CategoriaStats {
  nombre: string;
  total: number;
  completado: number;
  procesando: number;
  error: number;
  pendiente: number;
}

// Propiedades del componente
loading: boolean;              // Estado de carga
totalDocs: number;             // Total de documentos
completados: number;           // Documentos completados
procesando: number;            // Documentos siendo procesados
errores: number;               // Documentos con error
pendientes: number;            // Documentos pendientes de procesar
tasaExito: number;             // Porcentaje de éxito
ultimaActualizacion: string;   // Timestamp formateado (es-CO)
categorias: CategoriaStats[];  // Array de estadísticas por tipo
```

**Métodos:**

```typescript
cargar(): void  // Recarga estadísticas desde API (ejecutado en ngOnInit)
```

**Plantilla:** Tablas y badges con PrimeNG (p-table, p-tag)

---

### Dashboard

**Ubicación:** `src/app/vistas/dashboard/`

**Descripción:** Panel de control con gráficos Chart.js de documentos por categoría.

**Entrada:** Rol mínimo: `directivo`

**Protecciones:** `isPlatformBrowser()` antes de inicializar Chart.js (SSR-safe)

---

## Componentes Compartidos

### FichaDocente

**Ubicación:** `src/app/compartidos/componentes/ficha-docente/ficha-docente.ts`

**Descripción:** Componente de formulario que muestra datos del docente con selectores de categorías. Incluye campo de **fecha de nacimiento** con cálculo automático de rango etario.

**Inputs:**

```typescript
@Input() docente: string[] = [];                      // Datos del docente (array de valores)
@Input() labels: string[] = [];                       // Etiquetas de datos
@Input() claves: string[] = [];                       // Claves/nombres de campos
@Input() infoProfesor: DatoDemografico = {...};       // Datos demográficos precargados
```

**Outputs:**

```typescript
@Output() validado: EventEmitter<string[]>;                        // Emite categorías seleccionadas cuando válido
@Output() fechaNacimientoEmitida: EventEmitter<string | null>;    // Emite fecha seleccionada (ISO 8601)
```

**Propiedades internas:**

```typescript
fechaNacimiento: Date | null;     // Fecha seleccionada en date picker
loading: boolean;                 // Estado de carga de categorías
categoriasProfesor: Ficha.Panel[]; // Array de paneles de categorías
```

**Métodos principales:**

```typescript
ngOnChanges(changes)             // Detecta cambios en inputs y actualiza datos
onFechaNacimientoChange(fecha, numPanel, numSelector): void
// Ejecutado cuando cambia el date picker:
// 1. Emite fechaNacimientoEmitida
// 2. Calcula edad automáticamente
// 3. Busca rango etario coincidente
// 4. Actualiza selector de rango
// 5. Llama setCategorias()

setCategorias(): void            // Valida paneles y emite validado si todo válido
private calcularEdad(fechaNac): number
// Calcula edad exacta desde fecha de nacimiento
```

**Datos de entrada esperados:**

```typescript
// infoProfesor precarga datos demográficos
interface DatoDemografico {
  FECHA_NACIMIENTO: string;  // "YYYY-MM-DD"
  archivosProfesor: any[];
  datosDemograficos: any[];
  [key: string]: any;
}
```

**Proceso de inicialización:**

1. Constructor carga árbol de categorías desde OpenKM
2. `ngOnChanges()` detecta cambios en inputs
3. Si `infoProfesor.FECHA_NACIMIENTO` existe, pre-población de date picker
4. Mapeo de datos del docente a selectores de categorías
5. Marcado automático de opciones coincidentes

**SSR-safe:** Usa `constructor` en lugar de `ngOnInit` (compatible con ambos cliente y servidor)

---

### DownloadPreview

**Ubicación:** `src/app/vistas/gestion/edicion/download-preview/download-preview.ts`

**Descripción:** Componente de visualización de documentos con acordeón de 3 paneles. Muestra datos del documento, datos extraídos por IA, y opciones de reemplazo.

**Inputs:**

```typescript
@Input() profesor: InputSignal<any>;             // Datos del profesor (DOCUMENTO_DE_IDENTIDAD obligatorio)
@Input() archivos: InputSignal<DatoArchivo[]>;   // Array de archivos a mostrar
@Input() modo: InputSignal<Modo> = 'watch';      // 'watch' (visualizar) o 'download' (descargar)
```

**Outputs:**

```typescript
@Output() cerrar: OutputEmitterRef<void>;   // Emite cuando se cierra el componente
```

**Propiedades del componente:**

```typescript
uuid?: string;                                  // UUID del documento en OpenKM
propiedades: { clave: string, valor: string }[]; // Datos del documento (nombre, tipo, formato, tamaño, fechas)
datosExtraidos: { clave: string, valor: string }[]; // Campos del JSON side-car (omite nulos)
pdfUrl: SafeResourceUrl | undefined;            // URL segura para visualización de PDF
textoError: string;                             // Mensaje de error si existe
archivosDescarga: ListaDescarga[];              // Array de archivos para descargar (modo: download)
```

**Modos de operación:**

1. **'watch'** (por defecto): Visualización de un documento
   - Obtiene UUID y propiedades del documento
   - Carga JSON side-car con datos extraídos
   - Renderiza PDF si es aplicable
   - Muestra datos extraídos en panel del acordeón

2. **'download'**: Descarga de uno o varios documentos
   - Descarga automáticamente si es un archivo
   - Compacta en ZIP si son varios
   - Emite `cerrar` cuando completa

**Flujo de datos extraídos:**

1. Obtiene JSON side-car: `GET /api/v2/extraccion/json/{cedula}/{nombre}.json`
2. Extrae `datos.data` o `datos` del JSON
3. Filtra campos nulos, vacíos, "na", "n/a"
4. Mapea etiquetas desde `labels` (fallback: nombre de campo limpio)
5. Renderiza en tabla del acordeón

**Ejemplo de JSON side-car:**

```json
{
  "datos": {
    "data": {
      "numero": "71799891",
      "nombres": "JUAN CARLOS",
      "apellidos": "PEREZ GOMEZ",
      "fecha_nacimiento": "1980-05-15"
    }
  }
}
```

**Métodos:**

```typescript
async descargaPreview(): Promise<void>
// Descarga el documento visualizado

async descargaArchivo(uuid: string): Promise<DescargaResponse>
// Descarga y procesa archivo (PDF u otro formato)

ngOnDestroy()
// Libera URL objects para evitar memory leaks
```

**Acordeón (3 paneles):**

1. **"Datos del documento"** — Tabla con propiedades (nombre, tipo, formato, tamaño, fechas)
2. **"Datos extraídos"** — Tabla con campos del JSON side-car
3. **"Reemplazar documento"** — Componente `Reemplazo` anidado

**Seguridad:**

- Usa `DomSanitizer.bypassSecurityTrustResourceUrl()` para PDF (controlado, no `innerHTML`)
- Valida UUIDs antes de usarlos en URLs
- Maneja errores de carga de JSON gracefully

---

### Menu

**Ubicación:** `src/app/compartidos/componentes/menu/menu.ts`

**Descripción:** Menú lateral de navegación con iconos FontAwesome/PrimeNG.

**Inputs:**

```typescript
@Input() usuario: Usuario | null;  // Usuario autenticado (para mostrar nombre)
```

**Propiedades:**

```typescript
elementosMenu: MenuElemento[];     // Array de items del menú
```

**Interfaz de items:**

```typescript
interface MenuElemento {
  label: string;                          // Texto visible
  route: string;                          // Ruta (ej: '/listados')
  rol: 'usuario' | 'directivo' | 'gestor' | 'admin'; // Rol mínimo requerido
  visible?: boolean;                      // Visible en menú (por defecto: true)
  
  // Uno de estos dos (mutuamente excluyente)
  faIcon?: IconDefinition;                // Icono FontAwesome
  tipo: 'PrimeNG';                        // Tipo de icono
  icon?: string;                          // Icono PrimeNG (ej: 'pi pi-list-check')
}
```

**Características:**

- **routerLinkActive:** En lugar de `[routerLinkActiveOptions]` (incompatible SSR)
- **visible:** Controla aparición en menú (algunos items aún ocultos)
- **Rol-based:** Solo muestra items que el usuario puede acceder
- **Iconos mixtos:** FontAwesome para algunos, PrimeNG para otros

**Items del menú:**

| Label | Ruta | Rol mín. | Visible | Icono |
|-------|------|----------|---------|-------|
| Panel de control | `/dashboard` | directivo | no | gauge (FA) |
| Consultas | `/consultas` | directivo | no | magnifying-glass-chart (FA) |
| Listados | `/listados` | gestor | sí | list-check (PN) |
| Gestión | `/gestion` | gestor | sí | file-arrow-up (FA) |
| Extracción de datos | `/extraccion` | gestor | sí | chart-bar (PN) |
| Certificados | `/certificados` | gestor | no | file-alt (FA) |
| Herramientas | `/herramientas` | gestor | no | wrench (PN) |
| Validación | `/validacion` | usuario | no | check-double (FA) |

**SSR-safe:** Usa `routerLinkActive` en lugar de comparación manual de rutas

---

### CargaDocumento

**Ubicación:** `src/app/compartidos/componentes/carga-documento/`

**Descripción:** Componente de carga de archivos con validaciones y feedback visual.

**Inputs:**

```typescript
@Input() cedula: string;           // Cédula del docente
@Input() categoriaPath: string;    // Ruta de categoría en OpenKM
@Input() aceptedTypes: string[];   // Tipos MIME aceptados
```

**Outputs:**

```typescript
@Output() cargaExitosa: EventEmitter<any>;  // Emite cuando archivo se carga
```

---

### Chart

**Ubicación:** `src/app/compartidos/componentes/chart/`

**Descripción:** Gráfico Chart.js de documentos por categoría.

**Protección SSR:**

```typescript
if (isPlatformBrowser(this.platformId)) {
  // Inicializar Chart.js solo en cliente
}
```

---

### FirmaCertificado

**Ubicación:** `src/app/compartidos/componentes/firma-certificado/`

**Descripción:** Componente de firma digital de certificados.

**Inputs:**

```typescript
@Input() certificadoId: string;  // ID del certificado
@Input() firmaId: string;        // ID de la firma
```

---

### AdminFirmas

**Ubicación:** `src/app/compartidos/componentes/admin-firmas/`

**Descripción:** Administración de firmas digitales (solo admin).

**Subcomponentes:**
- `add-firma/` — Agregar nueva firma
- `edita-firma/` — Editar firma existente
- `procesa-firma/` — Procesar/aplicar firma

---

### ExtraeDatos

**Ubicación:** `src/app/compartidos/componentes/extrae-datos/`

**Descripción:** Disparador de extracción estructurada de datos con IA.

**Inputs:**

```typescript
@Input() cedula: string;        // Cédula del docente
@Input() documentoPath: string; // Ruta del documento en OpenKM
```

**Outputs:**

```typescript
@Output() exito: EventEmitter<any>;  // Emite cuando extracción completa
```

---

### VistaExcel

**Ubicación:** `src/app/compartidos/componentes/vista-excel/`

**Descripción:** Visualizador de archivos Excel cargados.

---

## Patrones de Componentes

### Patrón Input + Output

```typescript
@Component({...})
export class MiComponente {
  @Input() datos: any;
  @Output() cambio = new EventEmitter<any>();
  
  alCambiar(valor: any) {
    this.cambio.emit(valor);
  }
}
```

### Patrón Input Signal (Angular 17+)

```typescript
@Component({...})
export class MiComponente {
  profesor: InputSignal<any> = input<any>();
  archivos: InputSignal<DatoArchivo[]> = input<DatoArchivo[]>([]);
}
```

### Patrón Output Signal (Angular 17+)

```typescript
@Component({...})
export class MiComponente {
  cerrar: OutputEmitterRef<void> = output();
  
  cerrarComponente() {
    this.cerrar.emit();
  }
}
```

### Patrón Effect (Reactividad)

```typescript
constructor() {
  effect(async () => {
    const profesor = this.profesor();
    const archivos = this.archivos();
    
    if (profesor && archivos.length > 0) {
      // Reacciona a cambios automáticamente
      await this.cargar();
    }
  });
}
```

### Patrón Inyección de Servicios

```typescript
export class MiComponente {
  private dataServicio = inject(Data);
  private fileServicio = inject(FileServicio);
  private logger = inject(LoggerService);
}
```

---

## Estilos Compartidos

### Variables SCSS

Disponibles en `src/styles.scss`:

```scss
// Colores del tema
$color-primario: #3b82f6;
$color-secundario: #10b981;
$color-error: #ef4444;

// Espaciados
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;

// Breakpoints
$breakpoint-mobile: 640px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1024px;
```

### Modo Oscuro

PrimeNG Aura tema incluye soporte para modo oscuro vía CSS media query:

```scss
@media (prefers-color-scheme: dark) {
  // Estilos oscuros
  :root {
    --surface-0: #1e1e1e;
    --surface-50: #2d2d2d;
  }
}
```

---

**Última actualización:** Mayo 21, 2026
