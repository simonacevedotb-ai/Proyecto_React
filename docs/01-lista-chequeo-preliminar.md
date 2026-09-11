# Lista de chequeo preliminar

**Proyecto:** PhoneStore — Tienda virtual React + Vite + FastAPI + MySQL
**Ficha:** 3406211 · Trimestre 03 · Ambiente 702
**Avance:** Cuarto — Integración Full Stack
**Instructor:** Jhan Hader Muñoz

Cada fila indica dónde está implementado el requisito y cómo se comprueba.
Los números de prueba (`P-01`, `P-02`…) corresponden a
[`backend-fastapi/tests/evidencia_pruebas_api.md`](../backend-fastapi/tests/evidencia_pruebas_api.md).

---

## 1. Estructura y tecnologías

| # | Requisito de la guía | Estado | Dónde está | Cómo se verifica |
|---|---------------------|--------|------------|------------------|
| 1.1 | Frontend en React + Vite | Cumple | `frontend/` | `npm run dev` levanta Vite 8 en el puerto 5173 |
| 1.2 | Tailwind CSS | Cumple | `frontend/src/index.css` | Tailwind 4 con tema propio en el bloque `@theme` |
| 1.3 | Componentes reutilizables | Cumple | `frontend/src/components/ui/` | 11 componentes base: Button, Input, Select, Textarea, Modal, Badge, Alert, Skeleton, Pagination, EmptyState, ConfirmDialog |
| 1.4 | Backend en Python + FastAPI | Cumple | `backend-fastapi/app/` | `uvicorn app.main:app` |
| 1.5 | Entorno virtual de Python | Cumple | `backend-fastapi/venv/` | `python -m venv venv` documentado en el manual técnico |
| 1.6 | `requirements.txt` | Cumple | `backend-fastapi/requirements.txt` | 9 dependencias con versión fijada |
| 1.7 | Base de datos relacional SQL | Cumple | MySQL 8 / MariaDB 10.4 | Base `phonestore` con 13 tablas |
| 1.8 | Script SQL de creación | Cumple | `database/phonestore.sql` | Idempotente: crea desde cero y migra bases ya existentes |
| 1.9 | Separación clara Frontend / Backend | Cumple | Carpetas independientes | Cada una con su `.env` y sus dependencias |
| 1.10 | Comunicación por HTTP + JSON | Cumple | `frontend/src/services/api.js` | `fetch` con `Content-Type: application/json` |

## 2. Base de datos

| # | Requisito | Estado | Detalle |
|---|-----------|--------|---------|
| 2.1 | Tabla `usuarios` con todos los campos del formulario | Cumple | nombre, apellido, tipo y número de documento, dirección, teléfono, correo, contraseña, rol y estado |
| 2.2 | Tabla `roles` | Cumple | administrador, empleado, cliente |
| 2.3 | Tabla `permisos` y relación N:M `rol_permisos` | Cumple | 16 permisos repartidos entre los tres roles |
| 2.4 | Tabla `productos` | Cumple | Con categoría, stock, stock mínimo, precio anterior y destacado |
| 2.5 | Tabla `servicios` | Cumple | Con duración, icono e imagen |
| 2.6 | Tablas adicionales según la necesidad del proyecto | Cumple | `categorias`, `ventas`, `venta_detalles`, `movimientos_inventario`, `solicitudes_servicio`, `mensajes_contacto`, `password_resets` |
| 2.7 | Contraseñas hasheadas, nunca en texto plano | Cumple | bcrypt vía passlib (`app/auth.py`) — P-05 confirma que la API nunca devuelve la contraseña |
| 2.8 | Claves primarias y foráneas | Cumple | 13 llaves primarias y 13 llaves foráneas, cada una con su regla `ON DELETE` |
| 2.9 | Índices | Cumple | 48 índices en total, sobre estado, fechas, categoría, marca y llaves foráneas |
| 2.10 | Restricciones de integridad | Cumple | 5 restricciones `CHECK` (precios, stock y cantidades) y 8 `UNIQUE` (correo, documento, código de venta, slug de categoría…) |
| 2.11 | Transacciones en operaciones que tocan varias tablas | Cumple | La compra escribe venta, detalles, stock y kardex en una sola transacción (`app/routes/ventas.py`) |

## 3. Autenticación y seguridad

| # | Requisito | Estado | Prueba |
|---|-----------|--------|--------|
| 3.1 | Registro de clientes conectado a la base de datos | Cumple | P-04 |
| 3.2 | Validación en el Frontend | Cumple | `frontend/src/utils/validations.js` + `hooks/useForm.js` |
| 3.3 | Validación obligatoria en el Backend | Cumple | P-03: un registro con todos los campos inválidos se rechaza con 400 |
| 3.4 | Verificación de correo y documento duplicados | Cumple | P-08 (409) |
| 3.5 | Contraseña convertida en hash seguro | Cumple | bcrypt, 10 rondas |
| 3.6 | Inicio de sesión conectado con FastAPI | Cumple | P-10 |
| 3.7 | Generación de JWT | Cumple | P-10 devuelve `token` |
| 3.8 | Token enviado como `Authorization: Bearer` | Cumple | `frontend/src/services/api.js` |
| 3.9 | FastAPI verifica existencia, validez, firma y expiración | Cumple | P-12 (sin token → 401), P-13 (token inválido → 401) |
| 3.10 | Rol dentro del token | Cumple | El payload incluye `rol` e `id_rol` |
| 3.11 | Protección de endpoints por rol | Cumple | P-15 a P-17: un cliente recibe 403 en usuarios, dashboard y creación de productos |
| 3.12 | Un usuario no accede a rutas restringidas cambiando la URL | Cumple | Comprobado en el navegador y en la API (403 del backend) |
| 3.13 | Recuperación de contraseña real | Cumple | Token de un solo uso, hasheado, con caducidad de 30 minutos (P-77 a P-81) |

## 4. Endpoints y métodos HTTP

| Método | Cubierto | Ejemplos |
|--------|----------|----------|
| GET | Sí | `/api/productos`, `/api/usuarios`, `/api/ventas`, `/api/dashboard/resumen` |
| POST | Sí | `/api/auth/register`, `/api/auth/login`, `/api/productos`, `/api/ventas` |
| PUT | Sí | `/api/productos/{id}`, `/api/usuarios/{id}`, `/api/auth/perfil` |
| PATCH | Sí | `/api/usuarios/{id}/estado`, `/api/usuarios/{id}/rol`, `/api/ventas/{id}/estado` |
| DELETE | Sí | `/api/productos/{id}`, `/api/usuarios/{id}`, `/api/servicios/{id}` |

**Total de endpoints:** 51, repartidos en 10 módulos (20 GET, 12 POST, 8 PATCH, 6 PUT, 5 DELETE).
Listado completo en el [manual técnico](05-manual-tecnico.md#7-referencia-de-la-api).

## 5. Operaciones CRUD

| Entidad | Consultar | Crear | Editar | Cambiar estado | Eliminar |
|---------|-----------|-------|--------|----------------|----------|
| Usuarios | Sí | Sí | Sí | Sí (activo/inactivo) | Sí (con protección del histórico) |
| Productos | Sí | Sí | Sí | Sí | Sí (con protección del histórico) |
| Categorías | Sí | Sí | Sí | Sí | Sí (solo si está vacía) |
| Servicios | Sí | Sí | Sí | Sí | Sí (con protección del histórico) |
| Ventas | Sí | Sí (checkout) | — | Sí (5 estados) | No se borran: se cancelan |
| Inventario | Sí | Sí (movimientos) | — | — | No se borra: es un histórico |
| Solicitudes | Sí | Sí | Sí (respuesta) | Sí (4 estados) | No |
| Mensajes | Sí | Sí | — | Sí (3 estados) | Sí |

## 6. Paneles por rol

| # | Requisito | Estado | Detalle |
|---|-----------|--------|---------|
| 6.1 | Panel de administrador | Cumple | 11 secciones con barra lateral propia (`/admin`) |
| 6.2 | Panel de empleado | Cumple | Mismo entorno con menú recortado: sin Usuarios ni Configuración |
| 6.3 | El empleado no hereda los privilegios del administrador | Cumple | No puede eliminar productos, servicios ni gestionar usuarios (403 del backend) |
| 6.4 | Panel de cliente | Cumple | Resumen, Mis pedidos, Mis solicitudes y Mi perfil (`/cliente`) |
| 6.5 | El sistema identifica al usuario por el JWT | Cumple | El id sale del token, nunca del cuerpo de la petición |
| 6.6 | Acceso al panel protegido por autenticación y autorización | Cumple | `ProtectedRoute` en el Frontend + `require_role` en el Backend |

## 7. Interfaz y componentes conservados del avance anterior

| # | Elemento | Estado |
|---|----------|--------|
| 7.1 | Formulario de registro | Conservado y mejorado (modal con validación en vivo) |
| 7.2 | Formulario de inicio de sesión | Conservado y rediseñado |
| 7.3 | Módulo de recuperación de contraseña | Conservado y ahora conectado al backend |
| 7.4 | Validaciones del segundo avance | Conservadas y ampliadas |
| 7.5 | Navbar | Rediseñado: fijo, en una sola línea, con menú móvil |
| 7.6 | Footer | Ampliado: 5 columnas, políticas, medios de pago y redes |
| 7.7 | Carrusel | Reemplazado por un carrusel de promociones con reproducción automática |
| 7.10 | Identidad visual | Logo rediseñado en SVG (legible desde 24 px) e ilustraciones propias de producto |
| 7.8 | Botón flotante de WhatsApp | Conservado (`components/WhatsAppButton.jsx`) |
| 7.9 | Nombre del usuario autenticado en el Navbar | Cumple: avatar, nombre, rol y menú desplegable |

## 8. Tienda virtual (alcance ampliado)

| # | Funcionalidad | Estado |
|---|---------------|--------|
| 8.1 | Carrito: agregar, eliminar, aumentar y disminuir | Cumple |
| 8.2 | Carrito: subtotal, envío y total | Cumple |
| 8.3 | Carrito: validación de stock disponible | Cumple, en Frontend y Backend (P-49) |
| 8.4 | Carrito: persiste al navegar y al recargar | Cumple (localStorage + sincronización con la API) |
| 8.5 | Carrito: estado vacío y mensajes de confirmación | Cumple |
| 8.6 | Registro de ventas en la base de datos | Cumple: cabecera + detalle con precio del momento |
| 8.7 | Descuento automático de stock al vender | Cumple (P-52) |
| 8.8 | Devolución de stock al cancelar un pedido | Cumple (P-59) |
| 8.9 | Kardex de movimientos de inventario | Cumple |
| 8.10 | Alertas de agotados y stock bajo | Cumple |
| 8.11 | Servicios técnicos con agendamiento real | Cumple: solicitud con código de seguimiento |
| 8.12 | Formulario de contacto conectado a la base de datos | Cumple |
| 8.13 | Dashboard con estadísticas y gráficas | Cumple: 8 indicadores y 4 gráficas construidas con datos reales |
| 8.14 | Reportes con exportación | Cumple: rango de fechas, CSV e impresión |
| 8.15 | Búsqueda, filtros, ordenamiento y paginación | Cumple en catálogo y en las 6 tablas administrativas |

## 9. Calidad, pruebas y despliegue

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 9.1 | Documentación automática (Swagger) | Cumple | `http://localhost:3000/docs` |
| 9.2 | Pruebas de los endpoints | Cumple | 87 pruebas automatizadas, 87 superadas |
| 9.3 | Evidencia de GET, POST, PUT, PATCH y DELETE | Cumple | [Evidencia de pruebas](../backend-fastapi/tests/evidencia_pruebas_api.md) |
| 9.4 | Evidencia de autenticación JWT | Cumple | P-10 a P-13 |
| 9.5 | Evidencia de control de roles | Cumple | P-15 a P-18 |
| 9.6 | Evidencia de conexión con la base de datos | Cumple | Todas las pruebas leen y escriben en MySQL real |
| 9.7 | Linter sin errores | Cumple | `npm run lint` → 0 errores, 0 advertencias |
| 9.8 | Compilación de producción | Cumple | `npm run build` sin errores |
| 9.9 | Integración continua (CI/CD) | Cumple | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — ver [documento de CI/CD](04-ci-cd.md) |
| 9.10 | Archivo `.env` fuera del repositorio | Cumple | `.gitignore` lo excluye; el CI falla si alguien lo sube |
| 9.11 | Diseño responsive | Cumple | Verificado a 375, 768 y 1280 px sin desbordes |
| 9.12 | Manual técnico | Cumple | [Manual técnico](05-manual-tecnico.md) |
| 9.13 | Pasarela de pagos | **No aplica (N)** | Justificado en [este documento](03-pasarela-de-pagos.md) |

---

## Resumen

| Bloque | Requisitos | Cumplidos |
|--------|-----------|-----------|
| Estructura y tecnologías | 10 | 10 |
| Base de datos | 11 | 11 |
| Autenticación y seguridad | 13 | 13 |
| Endpoints y métodos HTTP | 5 | 5 |
| Operaciones CRUD | 8 | 8 |
| Paneles por rol | 6 | 6 |
| Interfaz conservada | 9 | 9 |
| Tienda virtual | 15 | 15 |
| Calidad y despliegue | 13 | 12 + 1 no aplica |

**Total: 90 requisitos verificados. 89 cumplidos, 1 no aplica (pasarela de pagos).**
