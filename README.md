# PhoneStore — Tienda virtual Full Stack

**React + Vite + Tailwind CSS · FastAPI (Python) · MySQL**
Cuarto avance · Ficha 3406211 · Trimestre 03 · Ambiente 702
Instructor: Jhan Hader Muñoz

---

Tienda de tecnología móvil con catálogo, carrito, compras que se
registran en la base de datos, control de inventario, agendamiento de
servicios técnicos y un panel administrativo con dashboard y reportes.

Autenticación con JWT, contraseñas hasheadas con bcrypt, validación en
cuatro capas y control de acceso por rol verificado en el servidor.

| | |
|---|---|
| Endpoints | 75 operaciones en 58 rutas, repartidas en 15 módulos |
| Tablas | 18, con 21 llaves foráneas y 77 índices |
| Pruebas automatizadas | 192, todas superadas (25 con Pytest + 167 de punta a punta) |
| Roles | administrador · empleado · cliente |
| Errores de ESLint | 0 |

> El backend vigente es **`backend-fastapi/`**. La carpeta `backend/`
> contiene el backend en Node/Express del tercer avance y se conserva
> solo como histórico.

---

## Arranque rápido

Tres terminales, en este orden.

**1. Base de datos** (con MySQL corriendo):

```bash
mysql -u root -p < database/phonestore.sql
```

**2. Backend:**

```bash
cd backend-fastapi && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
```

Copia `.env.example` como `.env`, ajusta tus credenciales de MySQL y una
clave `JWT_SECRET` propia. Después:

```bash
cd backend-fastapi && python -m app.scripts.seed_admin && python -m app.scripts.seed_demo
```

```bash
cd backend-fastapi && python -m uvicorn app.main:app --reload --port 3000
```

**3. Frontend:**

```bash
cd frontend && npm install && npm run dev
```

| Dirección | Qué es |
|-----------|--------|
| `http://localhost:5173` | La tienda |
| `http://localhost:3000/docs` | Documentación interactiva de la API (Swagger) |
| `http://localhost:3000/api/health` | Comprobación de estado |

Instrucciones detalladas y solución de problemas en el
[manual técnico](docs/05-manual-tecnico.md).

---

## Qué hace la aplicación

### Tienda pública

Portada con promociones, categorías, destacados, ofertas, novedades,
servicios, información de envíos y medios de pago. Catálogo con búsqueda,
filtros por categoría y marca, ordenamiento y paginación. Ficha de
producto con relacionados. Carrito que valida el stock y persiste al
navegar. Formulario de contacto y agendamiento de servicios, ambos
conectados a la base de datos. Botón flotante de WhatsApp.

### Compra

El navegador envía únicamente `id_producto` y `cantidad`. El servidor lee
el precio real, calcula el total, verifica el stock con las filas
bloqueadas y escribe la venta, sus líneas, el nuevo inventario y el
kardex **en una sola transacción**. Si algo falla, no queda nada a medias.

Cada venta guarda quién compró, cuándo, qué productos, cuántas unidades y
a qué precio en ese momento.

### Área del cliente

Resumen de su actividad, historial de pedidos con línea de tiempo del
estado, opción de volver a comprar, seguimiento de sus solicitudes de
servicio, edición del perfil y cambio de contraseña.

### Panel administrativo

Entorno propio con barra lateral oscura, distinto de la tienda. Incluye
dashboard con indicadores y gráficas construidas con datos reales,
reportes por rango de fechas con exportación a CSV, y gestión completa de
productos, categorías, servicios, inventario, pedidos, solicitudes,
mensajes y usuarios. Todas las tablas con búsqueda, filtros y paginación.

El empleado ve el mismo entorno con menos secciones, y el backend rechaza
con 403 cualquier operación que no le corresponda.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [Índice de la entrega](docs/README.md) | Los seis entregables de la matriz |
| [Lista de chequeo preliminar](docs/01-lista-chequeo-preliminar.md) | 90 requisitos verificados |
| [Matriz de validaciones](docs/02-matriz-validaciones.md) | Reglas por campo en las cuatro capas |
| [Pasarela de pagos](docs/03-pasarela-de-pagos.md) | Respuesta: **N**, con justificación |
| [CI/CD](docs/04-ci-cd.md) | Integración continua con GitHub Actions |
| [Evidencia de pruebas](backend-fastapi/tests/evidencia_pruebas_api.md) | Las 87 pruebas con sus respuestas |
| [Manual técnico](docs/05-manual-tecnico.md) | Instalación, arquitectura, API, seguridad y mantenimiento |
| [Correos y doble factor](docs/06-correos-y-doble-factor.md) | Correos del sistema y segundo paso del login |
| [Quinto avance](docs/07-quinto-avance.md) | Facturación, reportes, PQR, asistente y despliegue |
| [FastAPI frente a Django REST](docs/08-comparativa-fastapi-drf.md) | Comparativa técnica aplicada al proyecto |

---

## Pruebas

**Pruebas unitarias y de integración (Pytest).** No necesitan servidor
ni base de datos encendida: levantan la aplicación en memoria con
`TestClient` y una base SQLite temporal.

```bash
cd backend-fastapi && pytest
```

Son 25 comprobaciones sobre la autenticación (registro, inicio de
sesión, sesión actual, token inválido, 401 y 403) y el CRUD completo de
categorías y productos.

**Pruebas de punta a punta.** Con el backend corriendo:

```bash
cd backend-fastapi && python -m tests.pruebas_api
```

Recorre los endpoints con GET, POST, PUT, PATCH y DELETE, y comprueba
la autenticación JWT, el control de roles, las validaciones del servidor,
el descuento de stock, la protección de precios y el saneamiento contra
inyección de código. Genera el informe en `tests/evidencia_pruebas_api.md`.

Para borrar los datos que dejan las pruebas:

```bash
cd backend-fastapi && python -m tests.limpiar_datos_prueba
```

Del lado del Frontend:

```bash
cd frontend && npm run lint && npm run build
```

---

## Estructura

```
proyecto-react/
├── .github/workflows/ci.yml   Integración continua
├── database/phonestore.sql    Creación + migración + datos iniciales
├── docs/                      Documentación de la entrega
├── backend-fastapi/           Backend vigente (Python + FastAPI)
│   ├── app/                   Modelos, esquemas, rutas, seguridad
│   ├── tests/                 Pruebas automatizadas y evidencia
│   └── requirements.txt
├── backend/                   Backend Node del tercer avance (histórico)
└── frontend/                  React + Vite + Tailwind
    ├── public/img/            Imágenes del catálogo
    └── src/                   Componentes, páginas, contextos y servicios
```

---

## Seguridad

Contraseñas con bcrypt, consultas parametrizadas contra inyección SQL,
saneamiento de todo texto libre contra XSS, sesión por token en el
encabezado (no en cookie, lo que anula el CSRF), límite de intentos
contra la fuerza bruta, CORS restringido, cabeceras de seguridad en cada
respuesta y credenciales solo en `.env`.

El precio y el stock se calculan siempre en el servidor: no se puede
alterar el total desde el navegador.

Detalle completo en el [manual técnico](docs/05-manual-tecnico.md#8-seguridad).
