# Quinto avance: gestión comercial, analítica, IA y despliegue

Documento técnico de las funciones nuevas. Explica qué se agregó, dónde
vive cada pieza y cómo comprobarla.

---

## 1. Qué se agregó

| # | Requerimiento | Dónde vive |
|---|---|---|
| 1 | Módulo de ventas | `app/routes/ventas.py`, tablas `ventas` y `venta_detalles` |
| 2 | Detalle de productos vendidos | `venta_detalles`, una fila por renglón |
| 3 | Historial de ventas | `GET /api/ventas` con filtros y paginación |
| 4 | Reporte diario | `GET /api/reportes/ventas` |
| 5 | Exportación a PDF | `GET /api/reportes/ventas/pdf` |
| 6 | Exportación a Excel | `GET /api/reportes/ventas/excel` |
| 7 | Generación de facturas | `POST /api/facturas` |
| 8 | Consulta de facturas | `GET /api/facturas` con búsqueda |
| 9 | Descarga de facturas | `GET /api/facturas/{id}/pdf` |
| 10 | Dashboard administrativo | `GET /api/dashboard/resumen` |
| 11 | Dashboard de ventas | Gráficos de líneas y barras + tarjetas |
| 12 | Dashboards por rol | `require_role` en el backend, `ProtectedRoute` en React |
| 13 | Filtros de los dashboards | Rangos de fecha en reportes y listados |
| 14 | Endpoints nuevos | 18 rutas nuevas en 4 routers |
| 15 | Dashboard servido por FastAPI | React consume la API, no hay datos escritos a mano |
| 16 | Módulo de PQR | `app/routes/pqr.py`, tabla `pqr` |
| 17 | Chatbot en el sitio | `components/Chatbot.jsx` + `app/routes/chatbot.py` |
| 18 | Chatbot con IA | `app/asistente.py` |
| 19 | API Key segura | Variables de entorno, nunca en el código |
| 20 | Despliegue | Sección 7 de este documento |

---

## 2. Base de datos

Se agregaron cuatro tablas y dos columnas.

### Tablas nuevas

**`facturas`** — el documento que se emite a partir de una venta. Copia
los importes y los datos del cliente en el momento de emitirse: si mañana
cambia el precio de un producto o el cliente actualiza su dirección, la
factura ya emitida debe seguir diciendo lo mismo que el día que se
expidió. Por eso esos datos se guardan y no se leen por relación.

Numeración consecutiva por año: `FV-2026-000001`.

**`pqr`** — peticiones, quejas, reclamos y sugerencias. El campo
`radicado` es la clave del módulo: permite que alguien sin cuenta
registre un caso y después consulte cómo va, sin iniciar sesión. Se forma
con el año, un consecutivo y dos dígitos aleatorios, para que nadie pueda
adivinar el radicado del caso siguiente.

**`conversaciones`** y **`mensajes_chat`** — la memoria del asistente. La
conversación se identifica con una `clave` larga y aleatoria que guarda el
navegador; cuando hay sesión iniciada, además queda enlazada al usuario.

### Columnas nuevas

`ventas.descuento` y `ventas.impuestos`, que el enunciado pide como parte
del registro de la venta.

### Cómo aplicar los cambios

```bash
mysql -u root < database/phonestore.sql
```

El script es idempotente: crea lo que falta y deja intacto lo que ya
existe, así que se puede correr sobre una base con datos.

Estado resultante: 18 tablas, 21 claves foráneas, 77 índices.

---

## 3. Reportes en PDF y Excel

`app/documentos.py` concentra todo lo que produce un archivo. Las rutas
se ocupan de permisos y de consultar la base; este módulo recibe datos ya
listos y devuelve los bytes.

Los tres endpoints del reporte (JSON, PDF y Excel) comparten la misma
consulta. **Lo que se ve en pantalla es exactamente lo que se descarga**;
si se separaran, el PDF y la pantalla podrían terminar diciendo cosas
distintas.

Sin fechas, el reporte cubre el día de hoy: ese es el "reporte diario"
del enunciado.

| Formato | Biblioteca | Orientación | Contenido |
|---|---|---|---|
| PDF | ReportLab | Horizontal | Cifras del periodo y una fila por venta |
| Excel | openpyxl | — | Una fila por renglón vendido, con filtros activados |

El Excel se desglosa producto por producto en vez de una fila por venta,
porque así la hoja sirve para filtrar y armar tablas dinámicas, que es
para lo que se pide.

---

## 4. Facturación

```
POST   /api/facturas                emite la factura de una venta
GET    /api/facturas                listado con filtros y paginación
GET    /api/facturas/mis-facturas   las del usuario autenticado
GET    /api/facturas/{id}           detalle
GET    /api/facturas/{id}/pdf       descarga el documento
PATCH  /api/facturas/{id}/estado    emitida → pagada → anulada
```

Reglas que aplica el backend:

- Una venta solo se puede facturar una vez (`id_venta` es único).
- Un pedido cancelado no se puede facturar.
- Los estados siguen una máquina: de `anulada` no se vuelve atrás.
- Un cliente solo ve sus propias facturas; el listado completo exige rol
  de administrador o empleado.

---

## 5. Módulo de PQR

```
POST   /api/pqr                   radica (no exige sesión)
GET    /api/pqr/consultar/{rad}   consulta pública por radicado
GET    /api/pqr/mis-pqr           las del usuario autenticado
GET    /api/pqr                   listado con filtros (gestores)
PATCH  /api/pqr/{id}/estado       pendiente → en proceso → respondida → cerrada
POST   /api/pqr/{id}/responder    responde y avisa por correo
```

La consulta pública devuelve solo lo necesario para seguir el caso: no
expone el correo ni el teléfono de quien lo radicó.

Al responder se envía un correo al cliente con la plantilla de la tienda.

---

## 6. Asistente con Inteligencia Artificial

`app/asistente.py` funciona con dos motores y el mismo contrato:

**Motor de catálogo (por defecto).** Entiende la intención del mensaje y
responde con datos reales leídos de la base: qué productos hay, a qué
precio, cuántas existencias, qué servicios se prestan, cómo son los
envíos y las garantías, y cómo radicar una PQR. No necesita ninguna clave
ni conexión a internet, así que el proyecto funciona siempre.

**Motor de IA.** Si en el archivo de entorno hay una clave, el mensaje se
envía al proveedor junto con una ficha del catálogo, y la respuesta llega
redactada de forma más natural.

```
IA_PROVEEDOR=openai        # openai | gemini | anthropic
IA_API_KEY=...             # la clave, solo en .env
IA_MODELO=                 # opcional, cada proveedor tiene uno por defecto
```

Tres decisiones que vale la pena explicar:

1. **La clave nunca está en el código.** Se lee de una variable de
   entorno y `.env` está excluido del repositorio.
2. **El proveedor solo recibe la ficha del catálogo**, no la base de
   datos completa ni datos de otros clientes.
3. **Si el proveedor falla** (clave vencida, sin saldo, sin internet) no
   se deja al cliente sin respuesta: se cae de vuelta al motor de
   catálogo. El sitio nunca queda mudo.

La detección de intención resuelve un caso que se ve mucho: en "cuánto
cuesta el envío" el tema es el envío, aunque la frase empiece igual que
una pregunta de precio. Por eso los temas se buscan primero y el precio
solo decide cuando la frase no habla de ningún otro tema.

---

## 7. Despliegue

### Lo que hay que subir

Son tres servicios: base de datos, backend y frontend.

### Paso 1: la base de datos

En Railway, **New → Database → MySQL**. Cuando termine, en la pestaña
*Variables* aparece `MYSQL_URL`, que es la cadena de conexión completa.

Para cargar el esquema y los datos iniciales, desde el equipo:

```bash
mysql -h HOST -P PUERTO -u USUARIO -pCLAVE NOMBRE_BD < database/phonestore.sql
```

Los datos de conexión salen de la misma pestaña *Variables*.

### Paso 2: el backend

**New → GitHub Repo**, se elige el repositorio y en *Settings* se pone
`backend-fastapi` como **Root Directory**. Railway detecta Python y usa
el `railway.json` que ya está en la carpeta.

Variables de entorno que hay que crear:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La `MYSQL_URL` del paso 1 |
| `JWT_SECRET` | Una cadena larga y aleatoria, distinta a la local |
| `CORS_ORIGINS` | La URL pública del frontend (paso 3) |
| `FRONTEND_URL` | La misma URL del frontend |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Los del correo |
| `IA_PROVEEDOR`, `IA_API_KEY` | Solo si se activa la IA |

`app/database.py` reconoce `DATABASE_URL` automáticamente, así que no hay
que desarmar la cadena en cinco variables.

### Paso 3: el frontend

Otro servicio desde el mismo repositorio, con `frontend` como **Root
Directory**. Una sola variable:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | La URL pública del backend + `/api` |

Vite incrusta esa variable **al compilar**, no al arrancar: si se cambia
después, hay que volver a desplegar.

### Paso 4: cerrar el círculo

Con la URL del frontend ya asignada, se vuelve al backend y se corrige
`CORS_ORIGINS`. Sin esto el navegador bloquea las peticiones y la tienda
carga pero no muestra datos.

### Comprobación

1. `https://BACKEND/api/health` responde `ok`.
2. `https://BACKEND/docs` muestra Swagger con los 58 endpoints.
3. La tienda carga el catálogo (si no, revisar `CORS_ORIGINS`).
4. El inicio de sesión funciona (si no, revisar `JWT_SECRET`).

---

## 8. Pruebas

```bash
cd backend-fastapi
.\venv\Scripts\activate
python -m tests.prueba_quinto_avance
```

Recorre las siete áreas del avance en el mismo orden en que las usaría
una persona: venta, historial, reporte con sus dos descargas, factura,
dashboard, PQR y conversación con el asistente. Los archivos que descarga
quedan en `tests/descargas_prueba/` como evidencia.

Las suites anteriores siguen vigentes:

| Suite | Comprobaciones |
|---|---|
| `tests.pruebas_api` | 87 |
| `tests.prueba_correos` | 30 |
| `tests.prueba_quinto_avance` | 50 |

Las pruebas dejan cuentas, pedidos, facturas, PQR y una charla del
asistente. Para borrarlos sin tocar los datos reales de la tienda:

```bash
python -m tests.limpiar_datos_prueba
```

El script reconoce lo que crearon las pruebas por sus marcas (correos
`cliente.test…@phonestore.com`, nombres como "Producto Test …", la charla
que abre con "(prueba automatizada)") y borra en el orden que exige la
base: primero la factura y después la venta, porque la base no deja
eliminar una venta que ya se facturó.

---

## 9. Seguridad

Lo del cuarto avance se mantiene y se aplica igual a lo nuevo:

- **JWT** en todas las rutas privadas.
- **Control de roles** en el servidor: `require_role` decide, aunque el
  frontend esconda el botón.
- **Contraseñas con bcrypt**, nunca en texto plano.
- **Variables de entorno** para credenciales, claves y la API Key.
- **Límite de intentos** por endpoint sensible, incluido el chat.

Tres detalles propios de este avance:

1. Un cliente no puede listar todas las facturas ni todas las PQR: cada
   endpoint comprueba la propiedad del recurso, no solo la sesión.
2. La consulta pública de PQR por radicado no expone datos personales.
3. La conversación del asistente se identifica con una clave aleatoria de
   43 caracteres, que funciona como contraseña de esa charla.
