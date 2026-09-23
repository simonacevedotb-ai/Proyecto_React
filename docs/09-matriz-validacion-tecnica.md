# Matriz de validación técnica — evidencia por criterio

Documento de apoyo para la matriz del instructor (24 criterios
verificables). Para cada uno: dónde está en el proyecto y cómo
comprobarlo en vivo durante la sustentación.

**Estado:** los 24 criterios están implementados y verificados.
**Pruebas:** 192 automatizadas, todas superadas (25 con Pytest + 167 de
punta a punta).

---

## 1. Diseño y fundamentos REST

### 1.1 Endpoints definidos con criterio REST

75 operaciones en 58 rutas, agrupadas en 15 módulos. El recurso va en la
ruta y la acción en el verbo:

| Verbo | Ruta | Código |
|---|---|---|
| GET | `/api/productos` | 200 |
| GET | `/api/productos/{id}` | 200 / 404 |
| POST | `/api/productos` | 201 / 422 / 403 |
| PUT | `/api/productos/{id}` | 200 |
| PATCH | `/api/productos/{id}/estado` | 200 |
| DELETE | `/api/productos/{id}` | 200 |

Los códigos siguen el significado estándar: 201 al crear, 401 sin
sesión, 403 sin permiso, 404 si no existe, 409 en conflicto (correo
repetido, stock insuficiente) y 422 si los datos no pasan el esquema.

**Comprobar:** `http://localhost:3000/docs`

### 1.2 Parámetros de ruta y de consulta validados

`app/routes/productos.py`: el listado declara diez parámetros de
consulta con sus límites (`Query(default=1, ge=1)`,
`Query(default=12, ge=1, le=100)`, `max_length=80`), y los parámetros de
ruta usan la forma moderna con `Annotated`:

```python
id_producto: Annotated[int, Path(ge=1, description="Identificador del producto.")]
```

Si alguien escribe `/api/productos/0` o `?limite=9999`, la petición no
llega al código de la ruta: FastAPI responde 422 antes.

### 1.3 CRUD completo sobre los recursos principales

Productos, categorías, servicios y usuarios tienen crear, listar,
consultar, actualizar y eliminar. Además, eliminar un producto que ya se
vendió lo **desactiva** en lugar de borrarlo, para no romper el
histórico de ventas (`app/routes/productos.py`).

---

## 2. Modelado y validación de datos (Pydantic v2)

### 2.1 Esquemas separados de entrada y salida

`app/schemas.py` reúne 48 esquemas: los de entrada (`ProductoCrear`,
`ProductoActualizar`, `UsuarioRegistro`…) y los de salida
(`ProductoRespuesta`, `ProductosRespuesta`, `UsuarioRespuesta`…). Once
endpoints declaran `response_model`, así que FastAPI valida también lo
que sale y lo dibuja en `/docs`.

Que estén separados no es un capricho: `UsuarioRespuesta` no menciona la
contraseña, de modo que aunque alguien la agregara por error al
diccionario, no saldría por la API.

### 2.2 Validaciones propias del dominio

21 `@field_validator` y 3 `@model_validator`, entre ellos:

| Regla | Esquema |
|---|---|
| El correo tiene forma de correo y se guarda en minúsculas | `UsuarioRegistro`, `VentaCrear`, `PQRCrear`, `MensajeCrear` |
| La contraseña combina letras y números | `UsuarioRegistro`, `CambioPassword`, `RestablecerPasswordRequest` |
| El tipo de documento es CC, TI, CE o PA | `UsuarioRegistro` |
| El precio anterior debe superar al actual | `ProductoCrear` (`model_validator`) |
| Un producto no puede venir dos veces en el carrito | `VentaCrear` (`model_validator`) |
| La contraseña nueva debe ser distinta de la actual | `CambioPassword` (`model_validator`) |

El reparto es explícito: el esquema valida la **forma** del dato; lo que
necesita la base de datos (correo repetido, stock disponible, dueño del
recurso) se valida en `app/validations.py` y en las rutas.

---

## 3. Persistencia (SQLAlchemy 2.0)

### 3.1 Entidades relacionadas

17 modelos en `app/models.py` sobre 18 tablas, con 21 llaves foráneas.
Relaciones principales: `Producto` ↔ `Categoria`, `Venta` ↔
`VentaDetalle` ↔ `Producto`, `Usuario` ↔ `Rol`, `Factura` → `Venta`,
`Conversacion` ↔ `MensajeChat`.

### 3.2 CRUD persistente contra base de datos real

MySQL 10.4 (MariaDB, XAMPP) en desarrollo; `app/database.py` reconoce
además `DATABASE_URL` para el despliegue en la nube. Nada se guarda en
memoria: si se apaga el servidor, los datos siguen ahí.

El esquema se crea con `database/phonestore.sql`, que es idempotente.

---

## 4. Autenticación y autorización

### 4.1 Inicio de sesión con JWT

`POST /api/auth/login` devuelve un token firmado (HS256,
`python-jose`) que viaja en `Authorization: Bearer …`. El esquema
`HTTPBearer` está declarado en el OpenAPI, así que **`/docs` tiene botón
"Authorize"** y se puede probar la API protegida desde el navegador.

Las contraseñas se guardan con bcrypt; el token lleva id, correo y rol, y
caduca según `JWT_EXPIRES_IN`.

### 4.2 Endpoints protegidos por rol

40 endpoints exigen rol (`Depends(require_role("administrador", …))`),
14 exigen sesión y 9 la aceptan opcionalmente para enriquecer la
respuesta. La decisión se toma **en el servidor**: aunque el frontend
esconda un botón, la API responde 403.

**Comprobar:** iniciar sesión como cliente y pedir `/api/dashboard/resumen`.

---

## 5. Manejo de errores y middlewares

### 5.1 Errores estandarizados

Todas las respuestas de error tienen la misma forma:

```json
{ "ok": false, "message": "Datos inválidos.", "errors": { "email": "Escribe un correo electrónico válido." } }
```

`app/main.py` concentra los manejadores: `AppError` (reglas de negocio),
`RequestValidationError` → **422**, `IntegrityError` → 409, 404 y 405 de
Starlette, errores de SQLAlchemy y cualquier excepción no prevista →
500 con mensaje genérico (el detalle queda en el servidor, no se filtra
al cliente).

### 5.2 CORS

`CORSMiddleware` con los orígenes que indique `CORS_ORIGINS` en `.env`
(no `*`), métodos y cabeceras acotados. Además, un middleware propio
añade cabeceras de seguridad a cada respuesta (`app/security.py`).

---

## 6. Asincronía y tareas en segundo plano

### 6.1 Endpoint con async/await

`POST /api/chatbot/mensaje` (`app/routes/chatbot.py`) es `async def`
porque puede tener que esperar la respuesta de un proveedor de IA
externo. Las partes que bloquean —las consultas de SQLAlchemy, que no
es asíncrono, y la llamada al motor— se delegan a un hilo con
`run_in_threadpool`, que es lo correcto dentro de una corrutina.

### 6.2 Tareas no bloqueantes (BackgroundTasks)

`mailer.enviar_en_segundo_plano()` encola el correo para después de
responder. Lo usan tres flujos:

| Flujo | Por qué en segundo plano |
|---|---|
| Registro (correo de confirmación) | El usuario ya tiene su sesión; no espera el correo |
| Recuperación de contraseña | Si bloqueara, tardar más delataría que la cuenta existe |
| Respuesta a una PQR | El gestor sigue trabajando mientras sale el correo |

El código de doble factor **no** usa esta vía a propósito: ahí el
usuario está esperando el código en pantalla y conviene saber en el acto
si el envío falló.

---

## 7. Integración de Inteligencia Artificial

### 7.1 Endpoint que integra un servicio de IA

`app/asistente.py` habla con OpenAI, Gemini o Anthropic según la
configuración, y `POST /api/chatbot/mensaje` lo expone. Si no hay clave,
o si el proveedor falla, responde el **motor de catálogo**: lee los
productos, precios, existencias, servicios y políticas reales de la base
de datos. El asistente nunca se queda mudo.

`GET /api/chatbot/estado/motor` dice qué motor está respondiendo.

### 7.2 Llaves gestionadas por variables de entorno

`IA_PROVEEDOR`, `IA_API_KEY` e `IA_MODELO` se leen de `.env`, que está
excluido del repositorio. `.env.example` documenta los nombres sin
valores, y la integración continua falla si encuentra una credencial
escrita en el código.

---

## 8. Documentación y preparación para el despliegue

### 8.1 Documentación automática personalizada

`/docs` y `/redoc` llevan título, descripción con los módulos, datos de
contacto, **15 etiquetas con descripción**, 12 `summary` en los
endpoints principales, respuestas documentadas (401, 403, 404) y
ejemplos en 8 esquemas (`json_schema_extra`).

### 8.2 README, requirements y .env.example

`README.md` explica instalación y ejecución paso a paso;
`backend-fastapi/requirements.txt` fija las versiones;
`backend-fastapi/.env.example` lista todas las variables sin valores
reales. El despliegue está preparado con `railway.json`, `Procfile` y
`runtime.txt` (ver [07-quinto-avance.md](07-quinto-avance.md#7-despliegue)).

---

## 9. Pruebas

`backend-fastapi/tests/test_api.py`: **25 pruebas con Pytest y
TestClient**, sin necesidad de servidor ni MySQL encendido (usan SQLite
temporal y `dependency_overrides`).

| Qué cubren | Ejemplos |
|---|---|
| Autenticación | registro, correo repetido (409), login correcto e incorrecto (401), sesión actual, token falso |
| Autorización | 401 sin token, 403 con rol de cliente |
| CRUD | ciclo completo de categorías y de productos |
| Validación | 422 con el error por campo, reglas del `model_validator` |
| Negocio | la compra descuenta stock; el carrito rechaza líneas repetidas |

```bash
cd backend-fastapi && pytest
```

Se suman las tres suites de punta a punta (167 comprobaciones) y la
integración continua las ejecuta en cada push.

---

## 10. Frontend — React

### 10.1 Cliente HTTP centralizado con la URL por variable de entorno

`frontend/src/services/api.js` es el único punto que habla con la API:

```js
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
```

Adjunta el token, normaliza los errores (`error.status`, `error.errors`)
y cierra la sesión si el servidor responde 401. Cada módulo tiene su
servicio (`productoService`, `facturaService`, `pqrService`…).

### 10.2 CRUD funcional desde la interfaz

El panel administrativo permite listar, crear, editar y eliminar
productos, categorías, servicios y usuarios, con buscador, filtros y
paginación.

### 10.3 Formularios alineados con los esquemas

Los formularios envían exactamente los campos de los esquemas
`Crear`/`Actualizar` y validan en el navegador con el hook `useForm`
(longitudes, formatos, precios). Es un **complemento**: la misma regla
está en el servidor, y si el navegador la salta, la API responde 422.

### 10.4 Estados de carga y de error

Esqueletos de carga en las tablas y el catálogo, mensajes de error con
opción de reintentar, avisos emergentes (toasts) y deshabilitado de
botones mientras se guarda.

---

## 11. Comparativa técnica y sustentación

### 11.1 Comparativa FastAPI / Django REST Framework

[08-comparativa-fastapi-drf.md](08-comparativa-fastapi-drf.md): compara
el código real del proyecto con su equivalente en DRF (endpoints,
validación, ORM, documentación, autenticación y asincronía), y dice qué
se ganó y qué costó con cada elección.

### 11.2 Guion para sustentar

Recorrido sugerido, de quince minutos:

1. **La tienda** (2 min): catálogo, ficha de producto, carrito.
2. **La compra** (2 min): checkout y cómo el stock baja en el panel.
3. **Seguridad** (3 min): iniciar sesión como cliente, intentar entrar a
   `/admin` y mostrar el 403 del servidor en la pestaña de red.
4. **La API** (3 min): `/docs`, botón Authorize, crear un producto desde
   Swagger y enseñar el 422 al mandar un precio negativo.
5. **Lo nuevo** (3 min): factura en PDF, reporte en Excel, PQR con
   radicado y el asistente respondiendo con datos reales del catálogo.
6. **Las pruebas** (2 min): `pytest` en la terminal, 25 en verde.

Tres preguntas que conviene llevar respondidas:

- *¿Por qué FastAPI y no Django?* → [documento 08](08-comparativa-fastapi-drf.md).
- *¿Dónde se valida cada cosa?* → esquema (forma), `validations.py`
  (reglas), base de datos (restricciones), frontend (comodidad).
- *¿Qué pasa si se cae el proveedor de IA?* → responde el motor de
  catálogo; el chat nunca se queda sin respuesta.
