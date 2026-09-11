# Manual técnico — PhoneStore

**Tienda virtual Full Stack** · React + Vite + FastAPI + MySQL
**Ficha:** 3406211 · Trimestre 03 · Ambiente 702
**Instructor:** Jhan Hader Muñoz

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Requisitos previos](#3-requisitos-previos)
4. [Instalación paso a paso](#4-instalación-paso-a-paso)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Referencia de la API](#7-referencia-de-la-api)
8. [Seguridad](#8-seguridad)
9. [Frontend: cómo está organizado](#9-frontend-cómo-está-organizado)
10. [Flujos principales](#10-flujos-principales)
11. [Pruebas](#11-pruebas)
12. [Solución de problemas](#12-solución-de-problemas)
13. [Mantenimiento](#13-mantenimiento)

---

## 1. Descripción general

PhoneStore es una tienda de tecnología móvil con dos caras:

- **La tienda pública**, donde cualquiera consulta el catálogo, y un
  cliente registrado compra productos y agenda servicios técnicos.
- **El panel administrativo**, un entorno separado donde el equipo
  gestiona catálogo, inventario, pedidos, usuarios y atención al cliente.

Todo lo que se ve sale de la base de datos y todo lo que se hace queda
registrado en ella. No hay botones decorativos.

### Cifras del proyecto

| Componente | Tamaño |
|-----------|--------|
| Backend | 28 archivos Python, ~5.600 líneas |
| Frontend | 83 archivos JS/JSX, ~16.100 líneas |
| Base de datos | 13 tablas, 13 llaves foráneas, 48 índices |
| API | 51 endpoints en 10 módulos |
| Pruebas | 87 automatizadas, todas superadas |

### Roles

| Rol | Puede |
|-----|-------|
| **Cliente** | Comprar, agendar servicios, ver sus pedidos y editar su perfil |
| **Empleado** | Todo lo del cliente, más gestionar catálogo, inventario, pedidos, solicitudes y mensajes. No elimina registros ni administra usuarios |
| **Administrador** | Todo, incluida la gestión de usuarios y los borrados |

---

## 2. Arquitectura

```
┌──────────────────────┐     HTTP + JSON      ┌──────────────────────┐    SQLAlchemy    ┌──────────────┐
│   React + Vite       │  ───────────────►    │   FastAPI (Python)   │  ─────────────►  │    MySQL     │
│   Tailwind CSS 4     │  ◄───────────────    │   Pydantic + JWT     │  ◄─────────────  │  phonestore  │
│   localhost:5173     │  Authorization:      │   localhost:3000     │                  │  puerto 3306 │
└──────────────────────┘  Bearer <token>      └──────────────────────┘                  └──────────────┘
```

### Cómo viaja una petición

1. El componente React llama a un servicio de `src/services/`.
2. `api.js` añade la cabecera `Authorization: Bearer <token>` si la ruta
   lo necesita.
3. FastAPI valida el cuerpo con el esquema Pydantic correspondiente.
4. La dependencia `require_role(...)` comprueba el rol antes de ejecutar
   la ruta.
5. Las reglas de negocio de `validations.py` revisan formatos y
   duplicados.
6. SQLAlchemy ejecuta la consulta con parámetros (nunca concatenando
   texto).
7. El serializador convierte el modelo a JSON, dejando fuera todo dato
   sensible.
8. Si algo falla, el manejador de errores devuelve siempre la misma forma:
   `{ ok: false, message, errors? }`.

### Decisiones de diseño

| Decisión | Motivo |
|----------|--------|
| El precio nunca llega del navegador | Impide manipular el total desde las herramientas de desarrollo |
| La compra ocurre en una sola transacción | Evita ventas a medias o stock descuadrado |
| `SELECT ... FOR UPDATE` sobre los productos | Dos compras simultáneas no venden la misma última unidad |
| Datos del cliente copiados en la venta | El histórico no cambia si el usuario edita su perfil |
| Precio congelado en `venta_detalles` | Una factura de hace un mes muestra el precio de entonces |
| Borrado lógico cuando hay histórico | Nunca se pierde información contable |
| Panel administrativo con carga diferida | El cliente que solo compra no descarga el código del panel |
| Iconos SVG en línea | Sin peticiones de red ni dependencias externas |
| Gráficas en SVG puro | Sin librería de charts: menos peso y control total del color |

---

## 3. Requisitos previos

| Herramienta | Versión mínima | Comprobar con |
|------------|----------------|----------------|
| Python | 3.10 | `python --version` |
| Node.js | 18 | `node --version` |
| npm | 9 | `npm --version` |
| MySQL o MariaDB | MySQL 8 / MariaDB 10.4 | Desde XAMPP, WAMP o el servicio del sistema |

Opcional: Postman o similar para probar los endpoints a mano.

---

## 4. Instalación paso a paso

### 4.1 Base de datos

Con MySQL corriendo (en XAMPP, iniciar MySQL desde el panel de control):

```bash
mysql -u root -p < database/phonestore.sql
```

El script hace todo en una pasada:

- Crea la base `phonestore` si no existe.
- Crea las 13 tablas con sus llaves, índices y restricciones.
- **Si la base ya existía de un avance anterior**, agrega las columnas,
  índices y restricciones nuevas sin tocar los datos guardados.
- Inserta roles, permisos, categorías y datos de ejemplo.

Se puede ejecutar las veces que haga falta: no duplica nada.

### 4.2 Backend

```bash
cd backend-fastapi
python -m venv venv
```

Activar el entorno virtual:

```bash
venv\Scripts\activate
```

En Linux o macOS sería `source venv/bin/activate`.

```bash
pip install -r requirements.txt
```

Copiar `.env.example` como `.env` y ajustar los valores:

| Variable | Para qué sirve |
|----------|----------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL |
| `JWT_SECRET` | Firma de los tokens. Debe ser larga y aleatoria |
| `JWT_EXPIRES_IN` | Duración de la sesión (`1d`, `12h`, `30m`) |
| `CORS_ORIGINS` | Orígenes autorizados, separados por coma |
| `FRONTEND_URL` | Base del enlace de recuperación de contraseña |
| `RESET_TOKEN_TTL_MIN` | Minutos de validez de ese enlace |
| `SMTP_*` | Correo saliente. Si se deja vacío, los correos se registran en un archivo |
| `ADMIN_*` | Datos del administrador inicial |

Para generar una clave JWT segura:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Crear el administrador y preparar el catálogo:

```bash
python -m app.scripts.seed_admin
```

```bash
python -m app.scripts.seed_demo
```

Levantar la API:

```bash
python -m uvicorn app.main:app --reload --port 3000
```

| Dirección | Qué es |
|-----------|--------|
| `http://localhost:3000` | Raíz de la API |
| `http://localhost:3000/docs` | Documentación interactiva (Swagger UI) |
| `http://localhost:3000/redoc` | Documentación alternativa |
| `http://localhost:3000/api/health` | Comprobación rápida de estado |

> Se usa el puerto 3000 para que el Frontend apunte a
> `http://localhost:3000/api` sin cambios. Si prefieres el 8000 que
> sugiere la guía, cámbialo aquí y en `frontend/.env`.

### 4.3 Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

Si el backend corre en otro puerto o host, ajusta `frontend/.env`:

```
VITE_API_URL=http://localhost:3000/api
```

### 4.4 Comprobar que todo quedó bien

```bash
cd backend-fastapi && python -m tests.pruebas_api
```

Debe terminar con `87/87 pruebas superadas`.

---

## 5. Estructura del proyecto

```
proyecto-react/
├── .github/workflows/ci.yml      Integración continua
├── database/
│   └── phonestore.sql            Script único: creación + migración + datos
├── docs/                         Documentación de la entrega
├── backend-fastapi/              BACKEND VIGENTE
│   ├── app/
│   │   ├── main.py               App, CORS, manejo de errores, routers
│   │   ├── database.py           Conexión SQLAlchemy
│   │   ├── models.py             Las 13 tablas como clases
│   │   ├── schemas.py            Validación de entrada (Pydantic)
│   │   ├── validations.py        Reglas de negocio y saneamiento anti-XSS
│   │   ├── serializers.py        Modelo → JSON seguro
│   │   ├── auth.py               JWT, bcrypt, control de roles
│   │   ├── security.py           Cabeceras de seguridad y límite de intentos
│   │   ├── mailer.py             Correo saliente (SMTP opcional)
│   │   ├── errors.py             Excepción con forma de respuesta
│   │   ├── routes/               10 módulos de endpoints
│   │   └── scripts/              seed_admin.py, seed_demo.py
│   ├── tests/
│   │   ├── pruebas_api.py        87 pruebas automatizadas
│   │   ├── evidencia_pruebas_api.md    Informe generado
│   │   └── limpiar_datos_prueba.py     Borra lo que dejan las pruebas
│   └── requirements.txt
├── backend/                      Backend Node del tercer avance (histórico)
└── frontend/
    ├── public/img/               Imágenes del catálogo
    └── src/
        ├── components/
        │   ├── ui/               11 componentes base reutilizables
        │   ├── home/             Secciones de la portada
        │   ├── tienda/           Tarjeta de producto, agendamiento
        │   └── admin/            Gráficas y piezas del panel
        ├── context/              AuthContext, CartContext, ToastContext
        ├── hooks/                useForm, useDebounce, useReveal
        ├── layouts/              AdminLayout, ClienteLayout
        ├── pages/                Páginas públicas, de cliente y de admin
        ├── router/               Rutas y protección por rol
        ├── services/             11 clientes de la API
        └── utils/                Formateadores, validadores, iconos
```

> La carpeta `backend/` es el backend en Node/Express del tercer avance.
> Se conserva como histórico. **El backend que se ejecuta es
> `backend-fastapi/`.**

---

## 6. Modelo de datos

### 6.1 Las 13 tablas

| Tabla | Para qué | Registros relacionados |
|-------|----------|------------------------|
| `roles` | administrador, empleado, cliente | ← usuarios, rol_permisos |
| `permisos` | 16 permisos del sistema | ← rol_permisos |
| `rol_permisos` | Relación N:M entre roles y permisos | → roles, permisos |
| `usuarios` | Cuentas con contraseña hasheada | → roles · ← ventas, solicitudes |
| `password_resets` | Tokens de recuperación (hasheados) | → usuarios |
| `categorias` | Clasificación del catálogo | ← productos |
| `productos` | Catálogo con stock y precios | → categorias · ← venta_detalles |
| `servicios` | Servicios técnicos | ← solicitudes_servicio |
| `ventas` | Cabecera del pedido | → usuarios · ← venta_detalles |
| `venta_detalles` | Línea del pedido con precio congelado | → ventas, productos |
| `movimientos_inventario` | Kardex de entradas, salidas y ajustes | → productos, ventas, usuarios |
| `solicitudes_servicio` | Agendamientos de servicio técnico | → servicios, usuarios |
| `mensajes_contacto` | Bandeja del formulario público | — |

### 6.2 Relaciones y reglas de borrado

| Relación | Regla | Por qué |
|----------|-------|---------|
| `usuarios.id_rol` → `roles` | `RESTRICT` | No se borra un rol que esté en uso |
| `ventas.id_usuario` → `usuarios` | `SET NULL` | La venta sobrevive aunque se borre la cuenta |
| `venta_detalles.id_venta` → `ventas` | `CASCADE` | Las líneas no existen sin su pedido |
| `venta_detalles.id_producto` → `productos` | `SET NULL` | El nombre y el precio ya están copiados en la línea |
| `productos.id_categoria` → `categorias` | `SET NULL` | El producto sigue existiendo sin categoría |
| `movimientos_inventario.id_producto` → `productos` | `CASCADE` | El kardex de un producto borrado no tiene sentido |
| `password_resets.id_usuario` → `usuarios` | `CASCADE` | Los tokens mueren con la cuenta |

### 6.3 Por qué la venta duplica datos

`ventas` guarda nombre, correo, teléfono y dirección del cliente además
de su `id_usuario`. Parece redundante, pero es deliberado:

- Si el cliente cambia de dirección, el pedido antiguo conserva a dónde
  se envió realmente.
- Si la cuenta se elimina, la venta sigue siendo un registro contable
  válido.

Lo mismo aplica a `venta_detalles`, que copia el nombre, la marca y el
precio del producto: **una factura no cambia cuando cambia el catálogo.**

### 6.4 Integridad

| Tipo | Cantidad | Ejemplos |
|------|----------|----------|
| Llaves primarias | 13 | Una por tabla |
| Llaves foráneas | 13 | Con su regla `ON DELETE` explícita |
| Restricciones `UNIQUE` | 8 | Correo, documento, código de venta, slug de categoría |
| Restricciones `CHECK` | 5 | `precio >= 0`, `stock >= 0`, `cantidad > 0` |
| Índices | 48 | Sobre estado, fechas, categoría, marca y llaves foráneas |

---

## 7. Referencia de la API

Base: `http://localhost:3000/api`

Las rutas protegidas necesitan la cabecera:

```
Authorization: Bearer <token que devuelve /auth/login>
```

### Autenticación (`/auth`)

| Método | Ruta | Acceso | Qué hace |
|--------|------|--------|----------|
| POST | `/auth/register` | Público | Registra un cliente y devuelve el token |
| POST | `/auth/login` | Público | Verifica credenciales y devuelve el token |
| GET | `/auth/me` | Autenticado | Datos del usuario de la sesión |
| PUT | `/auth/perfil` | Autenticado | Edita el propio perfil |
| PUT | `/auth/password` | Autenticado | Cambia la propia contraseña |
| POST | `/auth/recuperar-password` | Público | Envía el enlace de recuperación |
| POST | `/auth/restablecer-password` | Público | Aplica la contraseña nueva con el token |

### Usuarios (`/usuarios`)

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/usuarios` | Admin · Empleado |
| GET | `/usuarios/{id}` | Admin · Empleado |
| POST | `/usuarios` | Admin |
| PUT | `/usuarios/{id}` | Admin |
| PATCH | `/usuarios/{id}/estado` | Admin |
| PATCH | `/usuarios/{id}/rol` | Admin |
| DELETE | `/usuarios/{id}` | Admin |

Parámetros de `GET /usuarios`: `buscar`, `rol`, `estado`, `pagina`, `limite`.

### Catálogo

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/categorias` | Público |
| POST · PUT · PATCH `/estado` | `/categorias` | Admin · Empleado |
| DELETE | `/categorias/{id}` | Admin |
| GET | `/productos` | Público (solo activos) |
| GET | `/productos/marcas` | Público |
| GET | `/productos/{id}` | Público |
| POST · PUT · PATCH `/estado` | `/productos` | Admin · Empleado |
| DELETE | `/productos/{id}` | Admin |
| GET | `/servicios`, `/servicios/{id}` | Público |
| POST · PUT · PATCH `/estado` | `/servicios` | Admin · Empleado |
| DELETE | `/servicios/{id}` | Admin |

Parámetros de `GET /productos`: `buscar`, `categoria`, `marca`, `estado`,
`stock`, `destacado`, `oferta`, `orden`, `pagina`, `limite`.

### Ventas (`/ventas`)

| Método | Ruta | Acceso | Qué hace |
|--------|------|--------|----------|
| POST | `/ventas` | Autenticado | Registra la compra y descuenta stock |
| GET | `/ventas/mis-pedidos` | Autenticado | Pedidos del usuario de la sesión |
| GET | `/ventas` | Admin · Empleado | Listado con filtros y paginación |
| GET | `/ventas/{id}` | Dueño o gestor | Detalle completo |
| PATCH | `/ventas/{id}/estado` | Admin · Empleado | Avanza o cancela el pedido |

Cuerpo de `POST /ventas` (nótese que **no lleva precios**):

```json
{
  "items": [{ "id_producto": 1, "cantidad": 2 }],
  "cliente_nombre": "Camila Restrepo",
  "cliente_email": "camila@correo.com",
  "cliente_telefono": "3105557788",
  "cliente_documento": "1023456789",
  "direccion_envio": "Carrera 70 # 30-20, Laureles",
  "ciudad": "Medellin",
  "notas": "Llamar antes de subir",
  "metodo_pago": "contraentrega"
}
```

### Inventario, atención y reportes

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/inventario/movimientos` | Admin · Empleado |
| GET | `/inventario/alertas` | Admin · Empleado |
| POST | `/inventario/movimientos` | Admin · Empleado |
| POST | `/solicitudes` | Autenticado |
| GET | `/solicitudes/mis-solicitudes` | Autenticado |
| GET | `/solicitudes` | Admin · Empleado |
| PATCH | `/solicitudes/{id}` | Admin · Empleado |
| POST | `/contacto` | Público |
| GET | `/contacto` | Admin · Empleado |
| PATCH | `/contacto/{id}/estado` | Admin · Empleado |
| DELETE | `/contacto/{id}` | Admin |
| GET | `/dashboard/resumen` | Admin · Empleado |
| GET | `/dashboard/reporte` | Admin · Empleado |

### Forma de las respuestas

Éxito:

```json
{ "ok": true, "message": "Producto creado.", "producto": { } }
```

Error:

```json
{
  "ok": false,
  "message": "Datos inválidos.",
  "errors": { "precio": "El precio debe ser un número mayor o igual a 0." }
}
```

| Código | Significado |
|--------|-------------|
| 200 · 201 | Todo bien |
| 400 | Datos inválidos (el detalle viene en `errors`) |
| 401 | Falta el token o está vencido |
| 403 | El rol no tiene permiso, o la cuenta está inactiva |
| 404 | El recurso no existe |
| 409 | Conflicto: duplicado, sin stock o transición de estado inválida |
| 429 | Demasiados intentos desde la misma IP |
| 500 | Error interno (el detalle queda en el registro del servidor) |

---

## 8. Seguridad

| Amenaza | Cómo se aborda | Dónde |
|---------|----------------|-------|
| **Inyección SQL** | Todas las consultas pasan por SQLAlchemy con parámetros. No se concatena texto de usuario en ninguna consulta | Todas las rutas |
| **XSS almacenado** | `limpiar_texto()` quita etiquetas HTML, neutraliza `javascript:` y escapa el resto antes de guardar | `validations.py` |
| **XSS reflejado** | React escapa por defecto todo lo que renderiza. No se usa `dangerouslySetInnerHTML` en ningún punto | Frontend completo |
| **CSRF** | La sesión viaja en un token del encabezado `Authorization`, no en una cookie. Una página externa no puede añadirlo | `api.js` + `auth.py` |
| **Contraseñas** | bcrypt con 10 rondas. Nunca se guardan ni se devuelven en texto plano | `auth.py` |
| **Fuerza bruta en el login** | Máximo 8 fallos por IP cada 5 minutos. Un acierto reinicia el contador | `security.py` |
| **Enumeración de usuarios** | El login responde igual si el correo no existe o si la contraseña falla. La recuperación responde igual exista o no la cuenta | `auth_routes.py` |
| **Manipulación de precios** | El esquema de compra no acepta precios. El servidor los lee de la base de datos | `schemas.py` + `ventas.py` |
| **Manipulación de stock** | El stock solo cambia en el backend, dentro de una transacción y con la fila bloqueada | `ventas.py`, `inventario.py` |
| **Manipulación de IDs** | Un cliente que pida `/ventas/{id}` de otro recibe 403. El perfil se identifica por el token | `ventas.py`, `auth_routes.py` |
| **Escalada de privilegios** | El registro público siempre asigna el rol cliente. Solo un administrador cambia roles | `auth_routes.py`, `usuarios.py` |
| **Acceso a rutas administrativas** | `require_role` se ejecuta antes que la ruta. Escribir la URL a mano no sirve de nada | `auth.py` |
| **Token robado o vencido** | Firma HS256 verificada en cada petición, con caducidad. Un 401 cierra la sesión en toda la aplicación | `auth.py`, `AuthContext.jsx` |
| **CORS abierto** | Solo se aceptan los orígenes de `CORS_ORIGINS` | `security.py` |
| **Cabeceras de seguridad** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y `Content-Security-Policy` en cada respuesta | `security.py` |
| **Fugas de información** | Los errores de base de datos se registran en el servidor y al cliente le llega un mensaje genérico | `main.py` |
| **Credenciales en el repositorio** | Todo vive en `.env`, excluido por `.gitignore`, y el CI falla si alguien lo sube | `.gitignore`, `ci.yml` |
| **Spam de formularios** | Límite por IP en registro, contacto, recuperación y compra | `security.py` |

### Salvaguardas de negocio

| Regla | Efecto |
|-------|--------|
| Un administrador no puede desactivarse, cambiarse el rol ni eliminarse | Evita quedarse fuera del sistema |
| Siempre queda al menos un administrador activo | El sistema nunca se bloquea |
| Un usuario con pedidos se desactiva, no se borra | Protege el histórico contable |
| Un producto vendido se desactiva, no se borra | Las facturas antiguas siguen completas |
| Una categoría con productos no se puede borrar | Evita huérfanos accidentales |
| Los estados del pedido siguen un orden fijo | No se puede «entregar» algo sin pagar |

---

## 9. Frontend: cómo está organizado

### Proveedores de contexto

```
ToastProvider        Avisos de toda la aplicación
  └── AuthProvider   Sesión, rol y validación del token
        └── CartProvider   Carrito con validación de stock
              └── AppRouter
```

### Componentes base (`components/ui/`)

Button, Input, Select, Textarea, Modal, Badge, Alert, Skeleton,
Pagination, EmptyState, ConfirmDialog e Icon. Todos comparten la misma
paleta y los mismos estados (normal, foco, error, cargando, deshabilitado).

### Hooks propios

| Hook | Para qué |
|------|----------|
| `useForm` | Estado del formulario, validación en vivo y errores por campo |
| `useDebounce` | Espera a que el usuario deje de escribir antes de llamar a la API |
| `useReveal` | Aparición progresiva al hacer scroll, con IntersectionObserver |

### Rendimiento

| Medida | Resultado |
|--------|-----------|
| Panel administrativo con carga diferida | 12 archivos separados; la tienda arranca con 110 kB comprimidos |
| Imágenes optimizadas | De 8,8 MB a 0,4 MB en total |
| Ilustraciones de producto en SVG | 6 fichas a ~5 KB cada una, nítidas a cualquier tamaño |
| Logo en SVG | Legible desde 24 px, se inserta en el bundle sin pedir un archivo aparte |
| Iconos SVG en línea | Cero peticiones de red |
| Animaciones solo con `opacity` y `transform` | El navegador las resuelve sin recalcular el diseño |
| `prefers-reduced-motion` respetado | Quien prefiera menos movimiento no ve ninguna animación |

### Accesibilidad

Etiquetas asociadas a cada campo, `aria-invalid` y `role="alert"` en los
errores, foco visible en todos los elementos interactivos, modales que
atrapan y devuelven el foco, y contraste verificado en textos y gráficas.

---

## 10. Flujos principales

### 10.1 Compra

1. El cliente agrega productos. El carrito valida el stock que conoce.
2. Al entrar al checkout, el carrito se **vuelve a consultar** contra la
   API: si algo se agotó o cambió de precio, se ajusta y se avisa.
3. Al confirmar, el navegador envía **solo** `id_producto` y `cantidad`.
4. El backend abre una transacción y bloquea las filas de esos productos.
5. Verifica existencia, estado y stock de cada línea.
6. Calcula precios, subtotal, envío y total con los datos de la tabla.
7. Escribe la venta, sus detalles, el nuevo stock y los movimientos de
   inventario.
8. Confirma la transacción y devuelve el pedido con su código.
9. Si algo falla en cualquier punto, revierte todo: no queda venta a
   medias.

### 10.2 Cambio de estado de un pedido

El administrador solo ve las transiciones válidas. Al cancelar, el
backend recorre las líneas, devuelve cada cantidad al stock y registra un
movimiento de entrada por cada una.

### 10.3 Recuperación de contraseña

1. El usuario pide el enlace con su correo.
2. El backend invalida los tokens anteriores y genera uno nuevo.
3. Guarda **solo el hash SHA-256** del token, con caducidad de 30 minutos.
4. Envía el enlace por correo. Sin SMTP configurado, lo escribe en
   `backend-fastapi/correos_enviados.log` y en la consola del servidor.
5. La respuesta HTTP es siempre la misma y **nunca** incluye el token.
6. Al usarlo, se verifica que exista, no esté usado y no haya caducado.
7. Se guarda la contraseña nueva hasheada y el token queda marcado como
   usado.

---

## 11. Pruebas

### Automatizadas

```bash
cd backend-fastapi && python -m tests.pruebas_api
```

87 pruebas sin dependencias externas (solo la biblioteca estándar de
Python). Al terminar generan
[`tests/evidencia_pruebas_api.md`](../backend-fastapi/tests/evidencia_pruebas_api.md)
con el resultado y las respuestas JSON de cada llamada.

Para borrar lo que dejan:

```bash
cd backend-fastapi && python -m tests.limpiar_datos_prueba
```

### Manuales, con Swagger

1. Abre `http://localhost:3000/docs`.
2. Ejecuta `POST /api/auth/login` y copia el `token`.
3. Pulsa **Authorize** y pega `Bearer <token>`.
4. Prueba cualquier endpoint protegido desde la misma página.

### Del Frontend

```bash
cd frontend && npm run lint
```

```bash
cd frontend && npm run build
```

---

## 12. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| «No se pudo conectar con el servidor» | El backend no está corriendo | Levanta uvicorn en el puerto 3000 |
| El backend arranca pero avisa que no conecta a MySQL | MySQL apagado o credenciales incorrectas | Inicia MySQL y revisa `DB_*` en `.env` |
| Error de CORS en la consola del navegador | El origen del Frontend no está autorizado | Agrega la URL a `CORS_ORIGINS` y reinicia el backend |
| 401 en todas las rutas protegidas | Token vencido o `JWT_SECRET` cambiado | Vuelve a iniciar sesión |
| «Table 'phonestore.ventas' doesn't exist» | Falta ejecutar el script SQL | `mysql -u root -p < database/phonestore.sql` |
| Los acentos se ven como `??` | La base se creó con otra codificación | El script usa `utf8mb4`; `seed_demo` limpia los registros corruptos |
| El registro falla con «Data too long for column 'direccion'» | Base antigua sin migrar | Vuelve a ejecutar `phonestore.sql`: la migración amplía la columna |
| 429 «Demasiados intentos» | Límite anti-fuerza-bruta | Espera los segundos indicados, o pon `RATE_LIMIT_ENABLED=false` para pruebas |
| El enlace de recuperación no llega | SMTP sin configurar | Revisa `backend-fastapi/correos_enviados.log` |
| `UnicodeEncodeError` en la consola de Windows | Codificación cp1252 | Ya resuelto: `app/__init__.py` fuerza UTF-8 en la salida |
| El panel tarda en abrir la primera vez | Descarga del código diferido | Es intencional: acelera la tienda para el cliente |

---

## 13. Mantenimiento

### Añadir un producto al catálogo

Panel → Productos → «Nuevo producto». Las imágenes pueden ser una URL
externa o un archivo puesto en `frontend/public/img/`, referenciado como
`/img/nombre.jpg`.

Las fichas de Galaxy S24, AirPods Pro 2, cargador GaN, iPad, Galaxy Watch
y Redmi Note usan **ilustraciones SVG propias** en lugar de fotografías.
Se dibujaron a mano porque no había fotos reales de esos productos y las
que había eran de otros equipos, lo que confundía al cliente. Al ser
vectores pesan unos 5 KB, se ven nítidos en cualquier pantalla y muestran
sin ambigüedad de qué producto se trata. Si más adelante consigues fotos
reales, basta con subirlas y cambiar la URL desde el panel.

### Añadir un campo a una entidad

1. `database/phonestore.sql`: agrégalo al `CREATE TABLE` y, en el bloque
   de migración, una línea `CALL ps_add_column(...)`.
2. `app/models.py`: la columna en el modelo.
3. `app/schemas.py`: el campo con sus reglas.
4. `app/validations.py`: la regla de negocio, si la necesita.
5. `app/serializers.py`: incluirlo en la respuesta.
6. Frontend: el campo en el formulario y en la tabla.

### Crear un administrador

Con otro administrador: Panel → Usuarios → «Nuevo usuario» → rol
Administrador. Sin ninguno disponible: ajusta `ADMIN_*` en `.env` y
ejecuta `python -m app.scripts.seed_admin`.

### Copia de seguridad

```bash
mysqldump -u root -p phonestore > respaldo_phonestore.sql
```

### Publicar en producción

1. `npm run build` y sube la carpeta `dist/` a un hosting estático.
2. Ejecuta el backend con varios procesos:
   `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`.
3. En el `.env` de producción: `JWT_SECRET` nuevo y largo, `CORS_ORIGINS`
   con el dominio real y `DB_PASSWORD` fuerte.
4. Sirve todo por HTTPS.

---

## Anexo: documentos de la entrega

| Documento | Contenido |
|-----------|-----------|
| [Lista de chequeo preliminar](01-lista-chequeo-preliminar.md) | 90 requisitos verificados uno a uno |
| [Matriz de validaciones](02-matriz-validaciones.md) | Todas las reglas por campo y por capa |
| [Pasarela de pagos](03-pasarela-de-pagos.md) | Justificación de la respuesta «N» |
| [CI/CD](04-ci-cd.md) | Integración continua con GitHub Actions |
| [Evidencia de pruebas](../backend-fastapi/tests/evidencia_pruebas_api.md) | Las 87 pruebas con sus respuestas |
