# Matriz de validaciones (funcionalidad)

**Proyecto:** PhoneStore — React + Vite + FastAPI + MySQL
**Ficha:** 3406211

Este documento reúne todas las reglas que debe cumplir un dato antes de
llegar a la base de datos, y en qué capa se comprueba cada una.

---

## 1. Las cuatro capas de validación

Un dato inválido tendría que atravesar cuatro barreras para almacenarse.
La regla del proyecto es que **el backend valida siempre**, sin importar
lo que haya hecho el navegador: alguien puede llamar la API con Postman y
saltarse el Frontend por completo.

| Capa | Dónde vive | Qué comprueba | Se puede saltar |
|------|-----------|----------------|-----------------|
| 1. Frontend | `frontend/src/utils/validations.js` + `hooks/useForm.js` | Formato y longitud mientras el usuario escribe | Sí (es solo comodidad) |
| 2. Esquemas Pydantic | `backend-fastapi/app/schemas.py` | Tipos, campos obligatorios, longitudes y rangos | No |
| 3. Reglas de negocio | `backend-fastapi/app/validations.py` y las rutas | Expresiones regulares, duplicados, stock, permisos | No |
| 4. Base de datos | `database/phonestore.sql` | Tipos, `NOT NULL`, `UNIQUE`, `CHECK` y llaves foráneas | No |

**Convenciones de la tabla:** F = Frontend · P = Pydantic · N = reglas de
negocio · BD = base de datos.

---

## 2. Registro e inicio de sesión

| Campo | Regla | F | P | N | BD | Mensaje al usuario |
|-------|-------|---|---|---|----|--------------------|
| nombre | Obligatorio, 2–40 caracteres, solo letras y espacios | Sí | Sí | Sí | `VARCHAR(40) NOT NULL` | «El nombre debe tener entre 2 y 40 caracteres y contener solo letras.» |
| apellido | Obligatorio, 2–40 caracteres, solo letras y espacios | Sí | Sí | Sí | `VARCHAR(40) NOT NULL` | «El apellido debe tener entre 2 y 40 caracteres y contener solo letras.» |
| tipoDocumento | Obligatorio, uno de CC / TI / CE / PA | Sí | Sí | Sí | `ENUM('CC','TI','CE','PA')` | «Selecciona un tipo de documento válido.» |
| numeroDocumento | Obligatorio, 6–12 dígitos, solo números, único | Sí | Sí | Sí | `VARCHAR(12) UNIQUE` | «El número de documento debe tener entre 6 y 12 dígitos numéricos.» |
| direccion | Obligatoria, 10–150 caracteres, caracteres permitidos | Sí | Sí | Sí | `VARCHAR(150) NOT NULL` | «La dirección debe tener entre 10 y 150 caracteres.» |
| telefono | Obligatorio, 7–15 dígitos | Sí | Sí | Sí | `VARCHAR(15) NOT NULL` | «El teléfono debe tener entre 7 y 15 dígitos numéricos.» |
| email | Obligatorio, formato válido, máx. 120, único | Sí | Sí | Sí | `VARCHAR(120) UNIQUE` | «Correo electrónico inválido.» / «Correo ya registrado.» |
| password | 8–20 caracteres, con mayúscula, minúscula y número | Sí | Sí | Sí | Se guarda el hash, nunca el texto | «La contraseña debe tener 8-20 caracteres, mayúscula, minúscula y número.» |
| confirmPassword | Debe coincidir con la contraseña | Sí | — | — | — | «Las contraseñas no coinciden.» |
| rol (en registro público) | **Siempre cliente**, no se acepta del cliente | — | — | Sí | `DEFAULT 3` | Ignorado silenciosamente si se envía |

**Expresiones regulares utilizadas** (idénticas en las dos capas):

| Nombre | Patrón |
|--------|--------|
| email | `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` |
| solo letras | `^[a-zA-ZÀ-ÿ\s]+$` |
| solo números | `^[0-9]+$` |
| teléfono | `^[0-9]{7,15}$` |
| contraseña | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$` |
| caracteres permitidos | `^[a-zA-Z0-9À-ÿ\s.,#\-]*$` |

**Reglas adicionales del inicio de sesión**

| Regla | Capa | Comportamiento |
|-------|------|----------------|
| Correo y contraseña incorrectos dan el mismo mensaje | N | Impide averiguar qué correos existen |
| Una cuenta inactiva no puede entrar | N | 403 con explicación |
| Máximo 8 intentos fallidos por IP cada 5 minutos | N | 429; un acierto reinicia el contador |

## 3. Perfil y contraseñas

| Campo | Regla | F | P | N | Notas |
|-------|-------|---|---|---|-------|
| nombre, apellido, dirección, teléfono | Mismas reglas del registro | Sí | Sí | Sí | El id se toma del token: nadie edita el perfil de otro |
| correo y documento | No se editan desde el perfil | Sí | — | — | Identifican la cuenta y las facturas |
| passwordActual | Obligatoria y debe coincidir | Sí | Sí | Sí | 400 si no coincide |
| passwordNueva | 8–20, mayúscula, minúscula y número | Sí | Sí | Sí | Se guarda hasheada |
| token de recuperación | Existe, no usado y sin caducar (30 min) | — | Sí | Sí | Se guarda solo el hash SHA-256 del token |

## 4. Productos

| Campo | Regla | F | P | N | BD |
|-------|-------|---|---|---|----|
| nombre | Obligatorio, 2–80 caracteres | Sí | Sí | Sí | `VARCHAR(80) NOT NULL` |
| marca | Obligatoria, 2–40 caracteres | Sí | Sí | Sí | `VARCHAR(40) NOT NULL` |
| id_categoria | Opcional; si viene, debe existir | Sí | Sí | Sí | FK a `categorias` |
| descripcion | Opcional, máx. 500 | Sí | Sí | Sí | `VARCHAR(500)` |
| precio | Obligatorio, numérico, ≥ 0, ≤ 999.999.999 | Sí | Sí | Sí | `DECIMAL(12,2)` + `CHECK >= 0` |
| precio_anterior | Opcional, numérico, ≥ 0 | Sí | Sí | Sí | `DECIMAL(12,2)` |
| stock | Entero ≥ 0 | Sí | Sí | Sí | `INT` + `CHECK >= 0` |
| stock_minimo | Entero ≥ 0 | Sí | Sí | Sí | `INT NOT NULL DEFAULT 5` |
| imagen_url | Opcional; debe empezar por `http://`, `https://` o `/` | Sí | Sí | Sí | `VARCHAR(255)` |
| estado | `activo` o `inactivo` | Sí | Sí | Sí | `ENUM` |

**Regla de negocio adicional:** al cambiar el stock desde la edición se
registra automáticamente un movimiento en el kardex, con el stock
anterior, el nuevo y el usuario responsable.

## 5. Categorías y servicios

| Entidad | Campo | Regla | Capas |
|---------|-------|-------|-------|
| Categoría | nombre | Obligatorio, 2–60, único | F · P · N · BD (`UNIQUE`) |
| Categoría | slug | Se genera solo desde el nombre y es único | N · BD (`UNIQUE`) |
| Categoría | descripción | Opcional, máx. 255 | F · P · N |
| Categoría | eliminar | Solo si no tiene productos asociados | N (409) |
| Servicio | nombre | Obligatorio, 2–80 | F · P · N · BD |
| Servicio | precio | Numérico ≥ 0 | F · P · N · BD (`CHECK`) |
| Servicio | duración | Opcional, máx. 40 | F · P |
| Servicio | eliminar | Si tiene solicitudes, se desactiva en vez de borrarse | N |

## 6. Carrito y compra (checkout)

Es la parte más sensible del sistema, porque toca dinero y existencias.

| Regla | Capa | Qué hace exactamente |
|-------|------|----------------------|
| El precio **nunca** llega del navegador | P · N | El esquema `ItemCompra` solo acepta `id_producto` y `cantidad`. Aunque se envíe `precio`, se ignora |
| El precio se lee de la tabla `productos` | N | El backend recalcula subtotales, envío y total |
| Cantidad por línea entre 1 y 50 | P | 400 si se sale del rango |
| Máximo 50 líneas por pedido | P | Evita cargas abusivas |
| No se repite el mismo producto en dos líneas | N | 400 |
| El producto debe existir y estar activo | N | 409 con el nombre del producto |
| La cantidad no puede superar el stock | F · N | 409: «Solo quedan N unidades de "X"» |
| Las filas de producto se bloquean durante la compra | N | `SELECT ... FOR UPDATE`: dos compras simultáneas no venden la misma última unidad |
| Todo ocurre en una transacción | N | Venta, detalles, descuento de stock y kardex, o nada |
| Solo un usuario autenticado puede comprar | N | 401 sin token |
| La cuenta debe estar activa | N | 403 |
| Datos de envío | F · P · N | nombre 3–90, correo válido, teléfono 7–15 dígitos, dirección 10–150, ciudad 3–60, notas ≤ 300 |
| Método de pago | P · N | Solo `contraentrega`, `transferencia` o `efectivo` |
| Envío gratis desde $1.500.000 | N | Se calcula en el servidor, no en el navegador |

**Estados del pedido y transiciones permitidas**

| Estado actual | Puede pasar a |
|---------------|----------------|
| pendiente | pagada · cancelada |
| pagada | enviada · cancelada |
| enviada | entregada · cancelada |
| entregada | (ninguno: cerrado) |
| cancelada | (ninguno: cerrado) |

Cualquier otro salto responde 409. Al cancelar, las unidades vuelven al
inventario y queda el movimiento correspondiente en el kardex.

## 7. Inventario

| Regla | Capa | Detalle |
|-------|------|---------|
| Tipo de movimiento válido | P · N | `entrada`, `salida` o `ajuste` |
| Cantidad entera entre 1 y 100.000 | P | 400 fuera de rango |
| Una salida no puede superar el stock actual | N | 409: «solo hay N en stock» |
| En un ajuste, la cantidad es el total real | N | El sistema calcula la diferencia |
| Se bloquea la fila del producto | N | `SELECT ... FOR UPDATE` |
| Cada movimiento guarda stock anterior, nuevo, motivo y responsable | N · BD | Trazabilidad completa |
| Solo administrador o empleado | N | 403 para clientes |

## 8. Solicitudes de servicio y mensajes de contacto

| Entidad | Campo | Regla | Capas |
|---------|-------|-------|-------|
| Solicitud | id_servicio | Debe existir y estar activo | P · N (404) |
| Solicitud | cliente_nombre | 3–90 caracteres | F · P · N |
| Solicitud | cliente_email | Formato válido | F · P · N |
| Solicitud | cliente_telefono | 7–15 dígitos | F · P · N |
| Solicitud | equipo | Obligatorio en el formulario, máx. 80 | F · P |
| Solicitud | descripcion | 10–500 caracteres | F · P · N |
| Solicitud | estado | pendiente · en_proceso · completada · cancelada | P · N · BD |
| Mensaje | nombre | 2–80 | F · P · N |
| Mensaje | email | Formato válido | F · P · N |
| Mensaje | telefono | Opcional; si viene, 7–15 dígitos | F · P · N |
| Mensaje | asunto | 3–120 | F · P · N |
| Mensaje | mensaje | 10–1000 | F · P · N |
| Mensaje | envíos por IP | Máximo 10 cada 10 minutos | N (429) |

## 9. Saneamiento contra inyección de código (XSS)

Todo texto libre pasa por `limpiar_texto()` antes de guardarse
(`app/validations.py`):

| Paso | Qué hace |
|------|----------|
| 1 | Elimina cualquier etiqueta HTML (`<script>`, `<img>`, `<iframe>`…) |
| 2 | Neutraliza los protocolos peligrosos (`javascript:`, `vbscript:`, `data:`) |
| 3 | Escapa los caracteres especiales restantes |
| 4 | Recorta a la longitud máxima del campo |

**Comprobado:** la prueba P-66 envía `<script>alert(1)</script>` como
nombre y `<img src=x onerror=alert(1)>` como asunto. El registro se acepta
(el usuario no ve un error críptico) pero se guarda limpio: la prueba P-68
verifica que en la base de datos no queda ninguna etiqueta ejecutable.

## 10. Protección de la API por rol

| Endpoint | Público | Cliente | Empleado | Administrador |
|----------|---------|---------|----------|---------------|
| `GET /productos`, `/servicios`, `/categorias` | Solo activos | Solo activos | Todos | Todos |
| `POST /contacto` | Sí | Sí | Sí | Sí |
| `POST /auth/register`, `/auth/login` | Sí | — | — | — |
| `GET /auth/me`, `PUT /auth/perfil`, `PUT /auth/password` | No | Sí | Sí | Sí |
| `POST /ventas`, `GET /ventas/mis-pedidos` | No | Sí | Sí | Sí |
| `POST /solicitudes`, `GET /solicitudes/mis-solicitudes` | No | Sí | Sí | Sí |
| `GET /ventas`, `PATCH /ventas/{id}/estado` | No | **403** | Sí | Sí |
| `GET/POST /inventario/movimientos` | No | **403** | Sí | Sí |
| `POST/PUT productos, servicios, categorias` | No | **403** | Sí | Sí |
| `GET /solicitudes`, `GET /contacto`, `/dashboard/*` | No | **403** | Sí | Sí |
| `GET /usuarios` | No | **403** | Sí | Sí |
| `POST/PUT/PATCH/DELETE /usuarios` | No | **403** | **403** | Sí |
| `DELETE productos, servicios, categorias, contacto` | No | **403** | **403** | Sí |

**Salvaguardas adicionales para el administrador**

| Regla | Respuesta |
|-------|-----------|
| No puede desactivarse a sí mismo | 400 |
| No puede quitarse su propio rol de administrador | 400 |
| No puede eliminar su propia cuenta | 400 |
| El sistema nunca se queda sin administradores activos | 409 |
| Un usuario o producto con histórico se desactiva, no se borra | 200 con aviso |

## 11. Validaciones de la interfaz

| Comportamiento | Dónde |
|----------------|-------|
| Validación mientras el usuario escribe (tras el primer `blur`) | `hooks/useForm.js` |
| Mensaje de error bajo el campo, con icono y `role="alert"` | `components/ui/Input.jsx` |
| `aria-invalid` en los campos con error | Input, Select, Textarea |
| Contador de caracteres en los textos largos | `components/ui/Textarea.jsx` |
| Botón bloqueado y con indicador mientras se envía | `components/ui/Button.jsx` |
| Los errores del backend se pintan sobre el campo correspondiente | Todos los formularios (`setErrors`) |
| Confirmación antes de una acción irreversible | `components/ui/ConfirmDialog.jsx` |
| Aviso de éxito o error tras cada operación | `context/ToastContext.jsx` |

## 12. Resultado de la verificación

Las 87 pruebas automatizadas de `tests/pruebas_api.py` recorren esta
matriz de punta a punta.

| Bloque | Pruebas | Resultado |
|--------|---------|-----------|
| Sistema | 1 | Superadas |
| Registro y validaciones | 6 | Superadas |
| Inicio de sesión y JWT | 6 | Superadas |
| Control de roles | 4 | Superadas |
| Categorías (CRUD) | 4 | Superadas |
| Productos (CRUD y filtros) | 9 | Superadas |
| Inventario | 4 | Superadas |
| Ventas, stock y precios | 14 | Superadas |
| Servicios y solicitudes | 8 | Superadas |
| Formulario de contacto y XSS | 6 | Superadas |
| Dashboard y reportes | 3 | Superadas |
| Gestión de usuarios | 9 | Superadas |
| Perfil y contraseñas | 8 | Superadas |
| Borrados y protección del histórico | 5 | Superadas |
| **Total** | **87** | **87 superadas, 0 fallos** |

Detalle completo con las respuestas JSON:
[`backend-fastapi/tests/evidencia_pruebas_api.md`](../backend-fastapi/tests/evidencia_pruebas_api.md)
