# Evidencia de pruebas de la API - PhoneStore

**Fecha de ejecución:** 2026-09-11 13:46:05  
**URL base:** `http://127.0.0.1:3001/api`  
**Resultado:** 87 de 87 pruebas superadas

Estas pruebas se ejecutan con `python -m tests.pruebas_api` y recorren todos los endpoints de la API usando los métodos GET, POST, PUT, PATCH y DELETE, comprobando autenticación JWT, control de roles, validaciones del backend, control de stock e integridad de las ventas.

| # | Método | Endpoint | Prueba | Esperado | Obtenido | Resultado |
|---|--------|----------|--------|----------|----------|-----------|
| 1 | GET | `/api/health` | La API responde | 200 | 200 | OK |
| 2 | POST | `/api/auth/register` | Rechaza un registro con todos los campos inválidos | 400 | 400 | OK |
| 3 | POST | `/api/auth/register` | Registra un cliente nuevo | 201 | 201 | OK |
| 4 | POST | `/api/auth/register` | El registro público siempre asigna rol cliente | 201 | 201 | OK |
| 5 | POST | `/api/auth/register` | La respuesta nunca incluye la contraseña ni su hash | 201 | 201 | OK |
| 6 | POST | `/api/auth/register` | Impide correo y documento duplicados | 409 | 409 | OK |
| 7 | POST | `/api/auth/login` | Rechaza contraseña incorrecta | 401 | 401 | OK |
| 8 | POST | `/api/auth/login` | Login correcto devuelve JWT | 200 | 200 | OK |
| 9 | GET | `/api/auth/me` | Consulta la sesión actual con el token | 200 | 200 | OK |
| 10 | GET | `/api/auth/me` | Sin token responde 401 | 401 | 401 | OK |
| 11 | GET | `/api/auth/me` | Con token inválido responde 401 | 401 | 401 | OK |
| 12 | POST | `/api/auth/login` | Login del administrador | 200 | 200 | OK |
| 13 | GET | `/api/usuarios` | Un cliente NO puede listar usuarios | 403 | 403 | OK |
| 14 | GET | `/api/dashboard/resumen` | Un cliente NO puede ver el dashboard | 403 | 403 | OK |
| 15 | POST | `/api/productos` | Un cliente NO puede crear productos | 403 | 403 | OK |
| 16 | GET | `/api/usuarios` | El administrador sí puede listar usuarios | 200 | 200 | OK |
| 17 | GET | `/api/categorias` | Lista pública de categorías | 200 | 200 | OK |
| 18 | POST | `/api/categorias` | Crea una categoría | 201 | 201 | OK |
| 19 | PUT | `/api/categorias/38` | Edita la categoría | 200 | 200 | OK |
| 20 | PATCH | `/api/categorias/38/estado` | Cambia el estado de la categoría | 200 | 200 | OK |
| 21 | GET | `/api/productos` | Catálogo público paginado | 200 | 200 | OK |
| 22 | GET | `/api/productos?buscar=...` | Búsqueda y ordenamiento del catálogo | 200 | 200 | OK |
| 23 | POST | `/api/productos` | Rechaza un producto con datos inválidos | 400 | 400 | OK |
| 24 | POST | `/api/productos` | Crea un producto | 201 | 201 | OK |
| 25 | GET | `/api/productos/32` | Consulta un producto por id | 200 | 200 | OK |
| 26 | PUT | `/api/productos/32` | Edita el producto | 200 | 200 | OK |
| 27 | PATCH | `/api/productos/32/estado` | Desactiva el producto | 200 | 200 | OK |
| 28 | PATCH | `/api/productos/32/estado` | Reactiva el producto | 200 | 200 | OK |
| 29 | GET | `/api/productos/marcas` | Lista las marcas del catálogo | 200 | 200 | OK |
| 30 | POST | `/api/inventario/movimientos` | Registra una entrada de inventario | 201 | 201 | OK |
| 31 | POST | `/api/inventario/movimientos` | Impide retirar más stock del disponible | 409 | 409 | OK |
| 32 | GET | `/api/inventario/movimientos` | Consulta el historial de movimientos | 200 | 200 | OK |
| 33 | GET | `/api/inventario/alertas` | Consulta alertas de stock bajo y agotados | 200 | 200 | OK |
| 34 | POST | `/api/ventas` | No se puede comprar sin iniciar sesión | 401 | 401 | OK |
| 35 | POST | `/api/ventas` | Rechaza cantidades fuera de rango en el carrito | 400 | 400 | OK |
| 36 | POST | `/api/ventas` | Impide comprar más unidades de las disponibles | 409 | 409 | OK |
| 37 | POST | `/api/ventas` | Registra la venta ignorando los precios enviados por el cliente | 201 | 201 | OK |
| 38 | POST | `/api/ventas` | El precio guardado es el real (450.000), no el manipulado (1) | 201 | 201 | OK |
| 39 | GET | `/api/productos/32` | El stock se descontó automáticamente tras la venta | 200 | 200 | OK |
| 40 | GET | `/api/ventas/mis-pedidos` | El cliente consulta sus propios pedidos | 200 | 200 | OK |
| 41 | GET | `/api/ventas` | Un cliente NO puede listar todas las ventas | 403 | 403 | OK |
| 42 | GET | `/api/ventas` | El administrador lista las ventas con paginación | 200 | 200 | OK |
| 43 | GET | `/api/ventas/21` | Consulta el detalle de una venta | 200 | 200 | OK |
| 44 | PATCH | `/api/ventas/21/estado` | Impide saltos de estado inválidos (pendiente -> entregada) | 409 | 409 | OK |
| 45 | PATCH | `/api/ventas/21/estado` | Marca el pedido como pagado | 200 | 200 | OK |
| 46 | PATCH | `/api/ventas/21/estado` | Cancela el pedido | 200 | 200 | OK |
| 47 | GET | `/api/productos/32` | Al cancelar, las unidades vuelven al inventario | 200 | 200 | OK |
| 48 | GET | `/api/servicios` | Lista pública de servicios | 200 | 200 | OK |
| 49 | POST | `/api/servicios` | Crea un servicio | 201 | 201 | OK |
| 50 | PUT | `/api/servicios/25` | Edita el servicio | 200 | 200 | OK |
| 51 | POST | `/api/solicitudes` | El cliente agenda un servicio técnico | 201 | 201 | OK |
| 52 | POST | `/api/solicitudes` | Valida los datos de la solicitud | 400 | 400 | OK |
| 53 | GET | `/api/solicitudes/mis-solicitudes` | El cliente ve sus solicitudes | 200 | 200 | OK |
| 54 | GET | `/api/solicitudes` | El administrador lista las solicitudes | 200 | 200 | OK |
| 55 | PATCH | `/api/solicitudes/18` | Atiende la solicitud desde el panel | 200 | 200 | OK |
| 56 | POST | `/api/contacto` | Envía un mensaje de contacto | 201 | 201 | OK |
| 57 | POST | `/api/contacto` | Acepta el envío pero limpia el HTML (anti-XSS) | 201 | 201 | OK |
| 58 | GET | `/api/contacto` | El administrador ve la bandeja de mensajes | 200 | 200 | OK |
| 59 | GET | `/api/contacto` | Ningún mensaje guardado contiene etiquetas HTML ejecutables | 200 | 200 | OK |
| 60 | PATCH | `/api/contacto/35/estado` | Marca un mensaje como leído | 200 | 200 | OK |
| 61 | GET | `/api/contacto` | Un cliente NO puede leer la bandeja de contacto | 403 | 403 | OK |
| 62 | GET | `/api/dashboard/resumen` | Resumen del dashboard | 200 | 200 | OK |
| 63 | GET | `/api/dashboard/reporte` | Reporte de ventas del mes | 200 | 200 | OK |
| 64 | GET | `/api/dashboard/reporte` | Valida el rango de fechas del reporte | 400 | 400 | OK |
| 65 | GET | `/api/usuarios?buscar=...` | Busca usuarios por correo | 200 | 200 | OK |
| 66 | GET | `/api/usuarios/38` | Consulta un usuario por id | 200 | 200 | OK |
| 67 | PUT | `/api/usuarios/38` | Edita un usuario | 200 | 200 | OK |
| 68 | PATCH | `/api/usuarios/38/rol` | Cambia el rol a empleado | 200 | 200 | OK |
| 69 | PATCH | `/api/usuarios/38/rol` | Rechaza un rol inexistente | 400 | 400 | OK |
| 70 | PATCH | `/api/usuarios/38/estado` | Desactiva un usuario | 200 | 200 | OK |
| 71 | POST | `/api/auth/login` | Un usuario inactivo no puede iniciar sesión | 403 | 403 | OK |
| 72 | PATCH | `/api/usuarios/38/estado` | Reactiva el usuario | 200 | 200 | OK |
| 73 | PATCH | `/api/usuarios/1/estado` | El administrador no puede desactivarse a sí mismo | 400 | 400 | OK |
| 74 | PUT | `/api/auth/perfil` | El usuario actualiza su propio perfil | 200 | 200 | OK |
| 75 | PUT | `/api/auth/password` | Rechaza el cambio si la contraseña actual es incorrecta | 400 | 400 | OK |
| 76 | PUT | `/api/auth/password` | Cambia la contraseña correctamente | 200 | 200 | OK |
| 77 | POST | `/api/auth/login` | Inicia sesión con la contraseña nueva | 200 | 200 | OK |
| 78 | POST | `/api/auth/recuperar-password` | Solicita recuperación de contraseña | 200 | 200 | OK |
| 79 | POST | `/api/auth/recuperar-password` | La respuesta NO expone el token de recuperación | 200 | 200 | OK |
| 80 | POST | `/api/auth/recuperar-password` | No revela si un correo existe o no | 200 | 200 | OK |
| 81 | POST | `/api/auth/restablecer-password` | Rechaza un token de recuperación inválido | 400 | 400 | OK |
| 82 | DELETE | `/api/servicios/25` | Un cliente NO puede eliminar servicios | 403 | 403 | OK |
| 83 | DELETE | `/api/servicios/25` | El administrador elimina el servicio de prueba | 200 | 200 | OK |
| 84 | DELETE | `/api/productos/32` | El producto con ventas se desactiva en vez de borrarse | 200 | 200 | OK |
| 85 | DELETE | `/api/categorias/38` | No se puede borrar una categoría con productos | 409 | 409 | OK |
| 86 | DELETE | `/api/usuarios/38` | El usuario con pedidos se desactiva en vez de borrarse | 200 | 200 | OK |
| 87 | GET | `/api/productos/999999` | Un id inexistente devuelve 404 | 404 | 404 | OK |

## Detalle de las respuestas

### 1. La API responde

`GET /api/health` → **200** (OK)

```json
{
  "ok": true,
  "message": "API PhoneStore activa (FastAPI).",
  "version": "2.0.0"
}
```

### 2. Rechaza un registro con todos los campos inválidos

`POST /api/auth/register` → **400** (OK)

> El backend valida aunque el Frontend no lo haga

```json
{
  "ok": false,
  "message": "Datos inválidos.",
  "errors": {
    "nombre": "Este campo debe tener al menos 2 caracteres.",
    "numeroDocumento": "Este campo debe tener al menos 6 caracteres.",
    "direccion": "Este campo debe tener al menos 10 caracteres.",
    "telefono": "Este campo debe tener al menos 7 caracteres.",
    "password": "Este campo debe tener al menos 8 caracteres."
  }
}
```

### 3. Registra un cliente nuevo

`POST /api/auth/register` → **201** (OK)

```json
{
  "ok": true,
  "message": "Registro exitoso. Te enviamos un correo para confirmar tu cuenta.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjozOCwiZW1haWwiOiJjbGllbnRlLnRlc3Q4OTE1MjM2M0BwaG9uZXN0b3JlLmNvbSIsInJvbCI6ImNsaWVudGUiLCJpZF9yb2wiOjMsImV4cCI6MTc4OTIzODc2MywiaWF0IjoxNzg5MTUyMzYzfQ.yYJrjzrDu81qUCPaI_mEAyoDoOekHqU6FdjApsqHMPw",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Pruebas",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 45 # 12-34 Medellin",
    "telefono": "3001234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 3,
    "rol": "cliente",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:03"
  },
  "verificacion_enviada": false
}
```

### 4. El registro público siempre asigna rol cliente

`POST /api/auth/register` → **201** (OK)

> No se puede autoasignar rol administrador

```json
{
  "rol": "cliente"
}
```

### 5. La respuesta nunca incluye la contraseña ni su hash

`POST /api/auth/register` → **201** (OK)

```json
{
  "campos": [
    "id_usuario",
    "nombre",
    "apellido",
    "tipo_documento",
    "numero_documento",
    "direccion",
    "telefono",
    "email",
    "email_verificado",
    "doble_factor",
    "estado",
    "id_rol",
    "rol",
    "creado_en",
    "actualizado_en"
  ]
}
```

### 6. Impide correo y documento duplicados

`POST /api/auth/register` → **409** (OK)

```json
{
  "ok": false,
  "message": "Ya existe una cuenta registrada con ese correo electrónico.",
  "errors": {
    "email": "Correo ya registrado."
  }
}
```

### 7. Rechaza contraseña incorrecta

`POST /api/auth/login` → **401** (OK)

```json
{
  "ok": false,
  "message": "Correo o contraseña incorrectos."
}
```

### 8. Login correcto devuelve JWT

`POST /api/auth/login` → **200** (OK)

```json
{
  "ok": true,
  "message": "Inicio de sesión exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjozOCwiZW1haWwiOiJjbGllbnRlLnRlc3Q4OTE1MjM2M0BwaG9uZXN0b3JlLmNvbSIsInJvbCI6ImNsaWVudGUiLCJpZF9yb2wiOjMsImV4cCI6MTc4OTIzODc2MywiaWF0IjoxNzg5MTUyMzYzfQ.yYJrjzrDu81qUCPaI_mEAyoDoOekHqU6FdjApsqHMPw",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Pruebas",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 45 # 12-34 Medellin",
    "telefono": "3001234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 3,
    "rol": "cliente",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:03"
  }
}
```

### 9. Consulta la sesión actual con el token

`GET /api/auth/me` → **200** (OK)

```json
{
  "ok": true,
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Pruebas",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 45 # 12-34 Medellin",
    "telefono": "3001234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 3,
    "rol": "cliente",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:03"
  }
}
```

### 10. Sin token responde 401

`GET /api/auth/me` → **401** (OK)

```json
{
  "ok": false,
  "message": "No autorizado. Debes iniciar sesión."
}
```

### 11. Con token inválido responde 401

`GET /api/auth/me` → **401** (OK)

```json
{
  "ok": false,
  "message": "Token inválido o expirado. Inicia sesión nuevamente."
}
```

### 12. Login del administrador

`POST /api/auth/login` → **200** (OK)

```json
{
  "ok": true,
  "message": "Inicio de sesión exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjoxLCJlbWFpbCI6InNpbW9uYWNldmVkb3RiQGdtYWlsLmNvbSIsInJvbCI6ImFkbWluaXN0cmFkb3IiLCJpZF9yb2wiOjEsImV4cCI6MTc4OTIzODc2NCwiaWF0IjoxNzg5MTUyMzY0fQ.j2zX--wamxXhrXIu-XHhXtG7F3KuLdFN0OkMTmaXcuk",
  "usuario": {
    "id_usuario": 1,
    "nombre": "Simon",
    "apellido": "Acevedo",
    "tipo_documento": "CC",
    "numero_documento": "1022004330",
    "direccion": "Oficina principal",
    "telefono": "3147728502",
    "email": "simonacevedotb@gmail.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 1,
    "rol": "administrador",
    "creado_en": "2026-08-25 19:18:19",
    "actualizado_en": "2026-09-08 15:33:19"
  }
}
```

### 13. Un cliente NO puede listar usuarios

`GET /api/usuarios` → **403** (OK)

> Aunque escriba la URL a mano, el backend responde 403

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 14. Un cliente NO puede ver el dashboard

`GET /api/dashboard/resumen` → **403** (OK)

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 15. Un cliente NO puede crear productos

`POST /api/productos` → **403** (OK)

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 16. El administrador sí puede listar usuarios

`GET /api/usuarios` → **200** (OK)

```json
{
  "ok": true,
  "usuarios": [
    {
      "id_usuario": 38,
      "nombre": "Cliente",
      "apellido": "Pruebas",
      "tipo_documento": "CC",
      "numero_documento": "189152363",
      "direccion": "Calle 45 # 12-34 Medellin",
      "telefono": "3001234567",
      "email": "cliente.test89152363@phonestore.com",
      "email_verificado": false,
      "doble_factor": false,
      "estado": "activo",
      "id_rol": 3,
      "rol": "cliente",
      "creado_en": "2026-09-11 13:46:03",
      "actualizado_en": "2026-09-11 13:46:03"
    },
    {
      "id_usuario": 37,
      "nombre": "Cliente",
      "apellido": "Perfil",
      "tipo_documento": "CC",
      "numero_documento": "189152302",
      "direccion": "Calle 10 # 20-30 Medellin",
      "telefono": "3021234567",
      "email": "cliente.test89152302@phonestore.com",
      "email_verificado": false,
      "doble_factor": false,
      "estado": "inactivo",
      "id_rol": 2,
      "rol": "empleado",
      "creado_en": "2026-09-11 13:45:02",
      "actualizado_en": "2026-09-11 13:45:04"
    },
    {
      "id_usuario": 31,
      "nombre": "Diag",
      "apellido": "Prueba",
      "tipo_documento": "CC",
      "numero_documento"
  ... (recortado)
```

### 17. Lista pública de categorías

`GET /api/categorias` → **200** (OK)

```json
{
  "ok": true,
  "categorias": [
    {
      "id_categoria": 2,
      "nombre": "Accesorios",
      "slug": "accesorios",
      "descripcion": "Fundas, cargadores, cables y protectores",
      "icono": "plug",
      "estado": "activo",
      "creado_en": "2026-09-08 18:59:28",
      "total_productos": 1
    },
    {
      "id_categoria": 3,
      "nombre": "Audio",
      "slug": "audio",
      "descripcion": "Aud├¡fonos, manos libres y parlantes port├ítiles",
      "icono": "headphones",
      "estado": "activo",
      "creado_en": "2026-09-08 18:59:28",
      "total_productos": 1
    },
    {
      "id_categoria": 1,
      "nombre": "Smartphones",
      "slug": "smartphones",
      "descripcion": "Tel├®fonos inteligentes de las mejores marcas",
      "icono": "phone",
      "estado": "activo",
      "creado_en": "2026-09-08 18:59:28",
      "total_productos": 5
    },
    {
      "id_categoria": 4,
      "nombre": "Smartwatch",
      "slug": "smartwatch",
      "descripcion": "Relojes inteligentes y bandas deportivas",
      "icono": "watch",
      "estado": "activo",
      "creado_en": "2026-09-08 18:59:28",
      "total_productos": 1
    },
    {
      "id_categoria": 5,
      
  ... (recortado)
```

### 18. Crea una categoría

`POST /api/categorias` → **201** (OK)

```json
{
  "ok": true,
  "message": "Categoría creada.",
  "categoria": {
    "id_categoria": 38,
    "nombre": "Categoria Test 89152363",
    "slug": "categoria-test-89152363",
    "descripcion": "Categoría creada por las pruebas automatizadas",
    "icono": "phone",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "total_productos": 0
  }
}
```

### 19. Edita la categoría

`PUT /api/categorias/38` → **200** (OK)

```json
{
  "ok": true,
  "message": "Categoría actualizada.",
  "categoria": {
    "id_categoria": 38,
    "nombre": "Categoria Test 89152363 editada",
    "slug": "categoria-test-89152363-editada",
    "descripcion": "Descripción actualizada",
    "icono": "phone",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "total_productos": 0
  }
}
```

### 20. Cambia el estado de la categoría

`PATCH /api/categorias/38/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Categoría marcada como inactivo.",
  "categoria": {
    "id_categoria": 38,
    "nombre": "Categoria Test 89152363 editada",
    "slug": "categoria-test-89152363-editada",
    "descripcion": "Descripción actualizada",
    "icono": "phone",
    "estado": "inactivo",
    "creado_en": "2026-09-11 13:46:04",
    "total_productos": 0
  }
}
```

### 21. Catálogo público paginado

`GET /api/productos` → **200** (OK)

```json
{
  "ok": true,
  "productos": [
    {
      "id_producto": 12,
      "nombre": "iPad 10ma generación",
      "marca": "Apple",
      "id_categoria": 5,
      "categoria": "Tablets",
      "descripcion": "Pantalla Liquid Retina de 10.9\", chip A14 Bionic y 64 GB.",
      "precio": 2100000.0,
      "precio_anterior": null,
      "stock": 6,
      "stock_minimo": 5,
      "estado_stock": "disponible",
      "destacado": false,
      "imagen_url": "/img/ipad-10.jpg",
      "estado": "activo",
      "creado_en": "2026-09-08 19:10:30",
      "actualizado_en": "2026-09-10 12:57:53"
    },
    {
      "id_producto": 11,
      "nombre": "Cargador rápido 65W GaN",
      "marca": "Ugreen",
      "id_categoria": 2,
      "categoria": "Accesorios",
      "descripcion": "Tres puertos, tecnología GaN y protección contra sobrecarga.",
      "precio": 180000.0,
      "precio_anterior": 220000.0,
      "stock": 39,
      "stock_minimo": 5,
      "estado_stock": "disponible",
      "destacado": false,
      "imagen_url": "/img/cargador-gan.jpg",
      "estado": "activo",
      "creado_en": "2026-09-08 19:10:30",
      "actualizado_en": "2026-09-10 12:57:53"
    },
    {
      "id_producto": 10,
    
  ... (recortado)
```

### 22. Búsqueda y ordenamiento del catálogo

`GET /api/productos?buscar=...` → **200** (OK)

```json
{
  "ok": true,
  "productos": [
    {
      "id_producto": 4,
      "nombre": "iphone 12 pro",
      "marca": "apple",
      "id_categoria": 1,
      "categoria": "Smartphones",
      "descripcion": "dorado",
      "precio": 1000000.0,
      "precio_anterior": null,
      "stock": 10,
      "stock_minimo": 5,
      "estado_stock": "disponible",
      "destacado": false,
      "imagen_url": "/img/iphone-clasico.png",
      "estado": "activo",
      "creado_en": "2026-08-25 19:33:15",
      "actualizado_en": "2026-09-10 12:48:52"
    },
    {
      "id_producto": 2,
      "nombre": "iPhone 15 Pro",
      "marca": "Apple",
      "id_categoria": 1,
      "categoria": "Smartphones",
      "descripcion": "Chip A17 Pro, cámara triple",
      "precio": 3800000.0,
      "precio_anterior": null,
      "stock": 10,
      "stock_minimo": 5,
      "estado_stock": "disponible",
      "destacado": true,
      "imagen_url": "/img/iphone-15-pro.jpg",
      "estado": "activo",
      "creado_en": "2026-08-25 18:58:22",
      "actualizado_en": "2026-09-08 19:10:30"
    },
    {
      "id_producto": 1,
      "nombre": "iPhone 17",
      "marca": "Apple",
      "id_categoria": 1,
      "categoria": "Sm
  ... (recortado)
```

### 23. Rechaza un producto con datos inválidos

`POST /api/productos` → **400** (OK)

> Precio negativo y nombre muy corto

```json
{
  "ok": false,
  "message": "Datos inválidos.",
  "errors": {
    "nombre": "Este campo debe tener al menos 2 caracteres.",
    "marca": "Este campo debe tener al menos 2 caracteres.",
    "precio": "El valor debe ser mayor que 0.0.",
    "stock": "El valor debe ser mayor que 0."
  }
}
```

### 24. Crea un producto

`POST /api/productos` → **201** (OK)

```json
{
  "ok": true,
  "message": "Producto creado.",
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Producto creado por las pruebas automatizadas",
    "precio": 500000.0,
    "precio_anterior": null,
    "stock": 10,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": false,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 25. Consulta un producto por id

`GET /api/productos/32` → **200** (OK)

```json
{
  "ok": true,
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Producto creado por las pruebas automatizadas",
    "precio": 500000.0,
    "precio_anterior": null,
    "stock": 10,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": false,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  },
  "relacionados": []
}
```

### 26. Edita el producto

`PUT /api/productos/32` → **200** (OK)

```json
{
  "ok": true,
  "message": "Producto actualizado.",
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363 editado",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Descripción actualizada por las pruebas",
    "precio": 450000.0,
    "precio_anterior": null,
    "stock": 10,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": true,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 27. Desactiva el producto

`PATCH /api/productos/32/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Producto marcado como inactivo.",
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363 editado",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Descripción actualizada por las pruebas",
    "precio": 450000.0,
    "precio_anterior": null,
    "stock": 10,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": true,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "inactivo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 28. Reactiva el producto

`PATCH /api/productos/32/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Producto marcado como activo.",
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363 editado",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Descripción actualizada por las pruebas",
    "precio": 450000.0,
    "precio_anterior": null,
    "stock": 10,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": true,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 29. Lista las marcas del catálogo

`GET /api/productos/marcas` → **200** (OK)

```json
{
  "ok": true,
  "marcas": [
    {
      "marca": "Apple",
      "total": 5
    },
    {
      "marca": "MarcaTest",
      "total": 1
    },
    {
      "marca": "Samsung",
      "total": 2
    },
    {
      "marca": "Ugreen",
      "total": 1
    },
    {
      "marca": "Xiaomi",
      "total": 1
    }
  ]
}
```

### 30. Registra una entrada de inventario

`POST /api/inventario/movimientos` → **201** (OK)

> Stock 10 -> 15

```json
{
  "ok": true,
  "message": "Inventario actualizado: 10 → 15 unidades.",
  "movimiento": {
    "id_movimiento": 81,
    "id_producto": 32,
    "producto": "Producto Test 89152363 editado",
    "tipo": "entrada",
    "cantidad": 5,
    "stock_anterior": 10,
    "stock_nuevo": 15,
    "motivo": "Ingreso de mercancía (prueba)",
    "id_venta": null,
    "id_usuario": 1,
    "usuario": "Simon Acevedo",
    "creado_en": "2026-09-11 13:46:04"
  },
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363 editado",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Descripción actualizada por las pruebas",
    "precio": 450000.0,
    "precio_anterior": null,
    "stock": 15,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": true,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 31. Impide retirar más stock del disponible

`POST /api/inventario/movimientos` → **409** (OK)

```json
{
  "ok": false,
  "message": "No puedes retirar 9999 unidades: solo hay 15 en stock.",
  "errors": {
    "cantidad": "Máximo disponible: 15."
  }
}
```

### 32. Consulta el historial de movimientos

`GET /api/inventario/movimientos` → **200** (OK)

```json
{
  "ok": true,
  "movimientos": [
    {
      "id_movimiento": 81,
      "id_producto": 32,
      "producto": "Producto Test 89152363 editado",
      "tipo": "entrada",
      "cantidad": 5,
      "stock_anterior": 10,
      "stock_nuevo": 15,
      "motivo": "Ingreso de mercancía (prueba)",
      "id_venta": null,
      "id_usuario": 1,
      "usuario": "Simon Acevedo",
      "creado_en": "2026-09-11 13:46:04"
    },
    {
      "id_movimiento": 80,
      "id_producto": 32,
      "producto": "Producto Test 89152363 editado",
      "tipo": "entrada",
      "cantidad": 10,
      "stock_anterior": 0,
      "stock_nuevo": 10,
      "motivo": "Stock inicial del producto",
      "id_venta": null,
      "id_usuario": 1,
      "usuario": "Simon Acevedo",
      "creado_en": "2026-09-11 13:46:04"
    }
  ],
  "paginacion": {
    "pagina": 1,
    "limite": 15,
    "total": 2,
    "total_paginas": 1
  }
}
```

### 33. Consulta alertas de stock bajo y agotados

`GET /api/inventario/alertas` → **200** (OK)

```json
{
  "ok": true,
  "agotados": [],
  "stock_bajo": [],
  "totales": {
    "agotados": 0,
    "stock_bajo": 0
  }
}
```

### 34. No se puede comprar sin iniciar sesión

`POST /api/ventas` → **401** (OK)

```json
{
  "ok": false,
  "message": "No autorizado. Debes iniciar sesión."
}
```

### 35. Rechaza cantidades fuera de rango en el carrito

`POST /api/ventas` → **400** (OK)

> El esquema limita la cantidad por línea

```json
{
  "ok": false,
  "message": "Datos inválidos.",
  "errors": {
    "cantidad": "El valor debe ser menor que 50."
  }
}
```

### 36. Impide comprar más unidades de las disponibles

`POST /api/ventas` → **409** (OK)

> Hay 15 unidades y se intentan comprar 16

```json
{
  "ok": false,
  "message": "Algunos productos ya no están disponibles en la cantidad solicitada.",
  "errors": {
    "32": "Solo quedan 15 unidad(es) de \"Producto Test 89152363 editado\"."
  }
}
```

### 37. Registra la venta ignorando los precios enviados por el cliente

`POST /api/ventas` → **201** (OK)

> El backend recalcula todo con el precio real de la base de datos

```json
{
  "ok": true,
  "message": "¡Pedido PS-20260911-3687 registrado correctamente!",
  "venta": {
    "id_venta": 21,
    "codigo": "PS-20260911-3687",
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "cliente_documento": "189152363",
    "direccion_envio": "Calle 45 # 12-34 Medellin",
    "ciudad": "Medellin",
    "notas": "Pedido generado por las pruebas automatizadas",
    "metodo_pago": "contraentrega",
    "subtotal": 900000.0,
    "costo_envio": 15000.0,
    "total": 915000.0,
    "total_articulos": 2,
    "estado": "pendiente",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04",
    "detalles": [
      {
        "id_detalle": 22,
        "id_producto": 32,
        "nombre_producto": "Producto Test 89152363 editado",
        "marca_producto": "MarcaTest",
        "precio_unitario": 450000.0,
        "cantidad": 2,
        "subtotal": 900000.0
      }
    ]
  }
}
```

### 38. El precio guardado es el real (450.000), no el manipulado (1)

`POST /api/ventas` → **201** (OK)

```json
{
  "precio_unitario": 450000.0,
  "total": 915000.0
}
```

### 39. El stock se descontó automáticamente tras la venta

`GET /api/productos/32` → **200** (OK)

```json
{
  "stock_antes": 15,
  "stock_despues": 13
}
```

### 40. El cliente consulta sus propios pedidos

`GET /api/ventas/mis-pedidos` → **200** (OK)

```json
{
  "ok": true,
  "ventas": [
    {
      "id_venta": 21,
      "codigo": "PS-20260911-3687",
      "id_usuario": 38,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152363@phonestore.com",
      "cliente_telefono": "3001234567",
      "cliente_documento": "189152363",
      "direccion_envio": "Calle 45 # 12-34 Medellin",
      "ciudad": "Medellin",
      "notas": "Pedido generado por las pruebas automatizadas",
      "metodo_pago": "contraentrega",
      "subtotal": 900000.0,
      "costo_envio": 15000.0,
      "total": 915000.0,
      "total_articulos": 2,
      "estado": "pendiente",
      "creado_en": "2026-09-11 13:46:04",
      "actualizado_en": "2026-09-11 13:46:04",
      "detalles": [
        {
          "id_detalle": 22,
          "id_producto": 32,
          "nombre_producto": "Producto Test 89152363 editado",
          "marca_producto": "MarcaTest",
          "precio_unitario": 450000.0,
          "cantidad": 2,
          "subtotal": 900000.0
        }
      ]
    }
  ]
}
```

### 41. Un cliente NO puede listar todas las ventas

`GET /api/ventas` → **403** (OK)

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 42. El administrador lista las ventas con paginación

`GET /api/ventas` → **200** (OK)

```json
{
  "ok": true,
  "ventas": [
    {
      "id_venta": 21,
      "codigo": "PS-20260911-3687",
      "id_usuario": 38,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152363@phonestore.com",
      "cliente_telefono": "3001234567",
      "cliente_documento": "189152363",
      "direccion_envio": "Calle 45 # 12-34 Medellin",
      "ciudad": "Medellin",
      "notas": "Pedido generado por las pruebas automatizadas",
      "metodo_pago": "contraentrega",
      "subtotal": 900000.0,
      "costo_envio": 15000.0,
      "total": 915000.0,
      "total_articulos": 2,
      "estado": "pendiente",
      "creado_en": "2026-09-11 13:46:04",
      "actualizado_en": "2026-09-11 13:46:04",
      "detalles": [
        {
          "id_detalle": 22,
          "id_producto": 32,
          "nombre_producto": "Producto Test 89152363 editado",
          "marca_producto": "MarcaTest",
          "precio_unitario": 450000.0,
          "cantidad": 2,
          "subtotal": 900000.0
        }
      ]
    },
    {
      "id_venta": 20,
      "codigo": "PS-20260911-8617",
      "id_usuario": 37,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test891523
  ... (recortado)
```

### 43. Consulta el detalle de una venta

`GET /api/ventas/21` → **200** (OK)

> Incluye productos, cantidades y precios de la compra

```json
{
  "ok": true,
  "venta": {
    "id_venta": 21,
    "codigo": "PS-20260911-3687",
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "cliente_documento": "189152363",
    "direccion_envio": "Calle 45 # 12-34 Medellin",
    "ciudad": "Medellin",
    "notas": "Pedido generado por las pruebas automatizadas",
    "metodo_pago": "contraentrega",
    "subtotal": 900000.0,
    "costo_envio": 15000.0,
    "total": 915000.0,
    "total_articulos": 2,
    "estado": "pendiente",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04",
    "detalles": [
      {
        "id_detalle": 22,
        "id_producto": 32,
        "nombre_producto": "Producto Test 89152363 editado",
        "marca_producto": "MarcaTest",
        "precio_unitario": 450000.0,
        "cantidad": 2,
        "subtotal": 900000.0
      }
    ]
  }
}
```

### 44. Impide saltos de estado inválidos (pendiente -> entregada)

`PATCH /api/ventas/21/estado` → **409** (OK)

```json
{
  "ok": false,
  "message": "No se puede pasar un pedido de 'pendiente' a 'entregada'."
}
```

### 45. Marca el pedido como pagado

`PATCH /api/ventas/21/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Pedido marcado como pagada.",
  "venta": {
    "id_venta": 21,
    "codigo": "PS-20260911-3687",
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "cliente_documento": "189152363",
    "direccion_envio": "Calle 45 # 12-34 Medellin",
    "ciudad": "Medellin",
    "notas": "Pedido generado por las pruebas automatizadas",
    "metodo_pago": "contraentrega",
    "subtotal": 900000.0,
    "costo_envio": 15000.0,
    "total": 915000.0,
    "total_articulos": 2,
    "estado": "pagada",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04",
    "detalles": [
      {
        "id_detalle": 22,
        "id_producto": 32,
        "nombre_producto": "Producto Test 89152363 editado",
        "marca_producto": "MarcaTest",
        "precio_unitario": 450000.0,
        "cantidad": 2,
        "subtotal": 900000.0
      }
    ]
  }
}
```

### 46. Cancela el pedido

`PATCH /api/ventas/21/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Pedido marcado como cancelada.",
  "venta": {
    "id_venta": 21,
    "codigo": "PS-20260911-3687",
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "cliente_documento": "189152363",
    "direccion_envio": "Calle 45 # 12-34 Medellin",
    "ciudad": "Medellin",
    "notas": "Pedido generado por las pruebas automatizadas",
    "metodo_pago": "contraentrega",
    "subtotal": 900000.0,
    "costo_envio": 15000.0,
    "total": 915000.0,
    "total_articulos": 2,
    "estado": "cancelada",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04",
    "detalles": [
      {
        "id_detalle": 22,
        "id_producto": 32,
        "nombre_producto": "Producto Test 89152363 editado",
        "marca_producto": "MarcaTest",
        "precio_unitario": 450000.0,
        "cantidad": 2,
        "subtotal": 900000.0
      }
    ]
  }
}
```

### 47. Al cancelar, las unidades vuelven al inventario

`GET /api/productos/32` → **200** (OK)

```json
{
  "stock_tras_cancelar": 15,
  "esperado": 15
}
```

### 48. Lista pública de servicios

`GET /api/servicios` → **200** (OK)

```json
{
  "ok": true,
  "servicios": [
    {
      "id_servicio": 1,
      "nombre": "Cambio de pantalla",
      "descripcion": "Reparación e instalación de pantalla nueva",
      "precio": 250000.0,
      "duracion": "2 a 4 horas",
      "icono": "screen",
      "imagen_url": null,
      "estado": "activo",
      "creado_en": "2026-08-25 18:58:22",
      "actualizado_en": "2026-09-08 19:10:30"
    },
    {
      "id_servicio": 2,
      "nombre": "Garantía extendida",
      "descripcion": "12 meses adicionales de garantía",
      "precio": 150000.0,
      "duracion": "Inmediato",
      "icono": "shield",
      "imagen_url": null,
      "estado": "activo",
      "creado_en": "2026-08-25 18:58:22",
      "actualizado_en": "2026-09-08 19:10:30"
    },
    {
      "id_servicio": 5,
      "nombre": "Cambio de batería",
      "descripcion": "Reemplazo de batería certificada y calibración del sistema de carga.",
      "precio": 180000.0,
      "duracion": "1 a 2 horas",
      "icono": "battery",
      "imagen_url": null,
      "estado": "activo",
      "creado_en": "2026-09-08 19:10:30",
      "actualizado_en": "2026-09-08 19:10:30"
    },
    {
      "id_servicio": 6,
      "nombre": "Diagnóst
  ... (recortado)
```

### 49. Crea un servicio

`POST /api/servicios` → **201** (OK)

```json
{
  "ok": true,
  "message": "Servicio creado.",
  "servicio": {
    "id_servicio": 25,
    "nombre": "Servicio Test 89152363",
    "descripcion": "Servicio creado por las pruebas automatizadas",
    "precio": 90000.0,
    "duracion": "1 hora",
    "icono": "search",
    "imagen_url": null,
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 50. Edita el servicio

`PUT /api/servicios/25` → **200** (OK)

```json
{
  "ok": true,
  "message": "Servicio actualizado.",
  "servicio": {
    "id_servicio": 25,
    "nombre": "Servicio Test 89152363 editado",
    "descripcion": "Descripción actualizada",
    "precio": 95000.0,
    "duracion": "2 horas",
    "icono": "search",
    "imagen_url": null,
    "estado": "activo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 51. El cliente agenda un servicio técnico

`POST /api/solicitudes` → **201** (OK)

```json
{
  "ok": true,
  "message": "Solicitud SV-20260911-1050 registrada. Nuestro equipo técnico te contactará muy pronto.",
  "solicitud": {
    "id_solicitud": 18,
    "codigo": "SV-20260911-1050",
    "id_servicio": 1,
    "nombre_servicio": "Cambio de pantalla",
    "precio_servicio": 250000.0,
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "equipo": "iPhone 13 Pro",
    "descripcion": "La pantalla no responde al tacto en la zona inferior.",
    "respuesta": null,
    "estado": "pendiente",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 52. Valida los datos de la solicitud

`POST /api/solicitudes` → **400** (OK)

```json
{
  "ok": false,
  "message": "Datos inválidos.",
  "errors": {
    "cliente_nombre": "Este campo debe tener al menos 3 caracteres.",
    "cliente_telefono": "Este campo debe tener al menos 7 caracteres.",
    "descripcion": "Este campo debe tener al menos 10 caracteres."
  }
}
```

### 53. El cliente ve sus solicitudes

`GET /api/solicitudes/mis-solicitudes` → **200** (OK)

```json
{
  "ok": true,
  "solicitudes": [
    {
      "id_solicitud": 18,
      "codigo": "SV-20260911-1050",
      "id_servicio": 1,
      "nombre_servicio": "Cambio de pantalla",
      "precio_servicio": 250000.0,
      "id_usuario": 38,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152363@phonestore.com",
      "cliente_telefono": "3001234567",
      "equipo": "iPhone 13 Pro",
      "descripcion": "La pantalla no responde al tacto en la zona inferior.",
      "respuesta": null,
      "estado": "pendiente",
      "creado_en": "2026-09-11 13:46:04",
      "actualizado_en": "2026-09-11 13:46:04"
    }
  ]
}
```

### 54. El administrador lista las solicitudes

`GET /api/solicitudes` → **200** (OK)

```json
{
  "ok": true,
  "solicitudes": [
    {
      "id_solicitud": 18,
      "codigo": "SV-20260911-1050",
      "id_servicio": 1,
      "nombre_servicio": "Cambio de pantalla",
      "precio_servicio": 250000.0,
      "id_usuario": 38,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152363@phonestore.com",
      "cliente_telefono": "3001234567",
      "equipo": "iPhone 13 Pro",
      "descripcion": "La pantalla no responde al tacto en la zona inferior.",
      "respuesta": null,
      "estado": "pendiente",
      "creado_en": "2026-09-11 13:46:04",
      "actualizado_en": "2026-09-11 13:46:04"
    },
    {
      "id_solicitud": 17,
      "codigo": "SV-20260911-2923",
      "id_servicio": 1,
      "nombre_servicio": "Cambio de pantalla",
      "precio_servicio": 250000.0,
      "id_usuario": 37,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152302@phonestore.com",
      "cliente_telefono": "3001234567",
      "equipo": "iPhone 13 Pro",
      "descripcion": "La pantalla no responde al tacto en la zona inferior.",
      "respuesta": "Recibimos tu equipo, el diagnóstico estará listo mañana.",
      "estado": "en_proceso",
  ... (recortado)
```

### 55. Atiende la solicitud desde el panel

`PATCH /api/solicitudes/18` → **200** (OK)

```json
{
  "ok": true,
  "message": "Solicitud actualizada.",
  "solicitud": {
    "id_solicitud": 18,
    "codigo": "SV-20260911-1050",
    "id_servicio": 1,
    "nombre_servicio": "Cambio de pantalla",
    "precio_servicio": 250000.0,
    "id_usuario": 38,
    "cliente_nombre": "Cliente Pruebas",
    "cliente_email": "cliente.test89152363@phonestore.com",
    "cliente_telefono": "3001234567",
    "equipo": "iPhone 13 Pro",
    "descripcion": "La pantalla no responde al tacto en la zona inferior.",
    "respuesta": "Recibimos tu equipo, el diagnóstico estará listo mañana.",
    "estado": "en_proceso",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:04"
  }
}
```

### 56. Envía un mensaje de contacto

`POST /api/contacto` → **201** (OK)

```json
{
  "ok": true,
  "message": "¡Mensaje enviado! Te responderemos al correo que registraste.",
  "mensaje_id": 34
}
```

### 57. Acepta el envío pero limpia el HTML (anti-XSS)

`POST /api/contacto` → **201** (OK)

> Las etiquetas se eliminan antes de guardar

```json
{
  "ok": true,
  "message": "¡Mensaje enviado! Te responderemos al correo que registraste.",
  "mensaje_id": 35
}
```

### 58. El administrador ve la bandeja de mensajes

`GET /api/contacto` → **200** (OK)

```json
{
  "ok": true,
  "mensajes": [
    {
      "id_mensaje": 35,
      "nombre": "alert(1)",
      "email": "xss@example.com",
      "telefono": null,
      "asunto": "",
      "mensaje": "document.cookie intento de inyección de código.",
      "estado": "nuevo",
      "creado_en": "2026-09-11 13:46:04"
    },
    {
      "id_mensaje": 34,
      "nombre": "Visitante de prueba",
      "email": "visitante@example.com",
      "telefono": "3009998877",
      "asunto": "Consulta sobre garantías",
      "mensaje": "Quisiera saber si los equipos tienen garantía extendida disponible.",
      "estado": "nuevo",
      "creado_en": "2026-09-11 13:46:04"
    },
    {
      "id_mensaje": 33,
      "nombre": "alert(1)",
      "email": "xss@example.com",
      "telefono": null,
      "asunto": "",
      "mensaje": "document.cookie intento de inyección de código.",
      "estado": "leido",
      "creado_en": "2026-09-11 13:45:03"
    },
    {
      "id_mensaje": 32,
      "nombre": "Visitante de prueba",
      "email": "visitante@example.com",
      "telefono": "3009998877",
      "asunto": "Consulta sobre garantías",
      "mensaje": "Quisiera saber si los equipos tienen garantía extendida disponibl
  ... (recortado)
```

### 59. Ningún mensaje guardado contiene etiquetas HTML ejecutables

`GET /api/contacto` → **200** (OK)

```json
{
  "nombre_guardado": "alert(1)"
}
```

### 60. Marca un mensaje como leído

`PATCH /api/contacto/35/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Mensaje actualizado.",
  "mensaje": {
    "id_mensaje": 35,
    "nombre": "alert(1)",
    "email": "xss@example.com",
    "telefono": null,
    "asunto": "",
    "mensaje": "document.cookie intento de inyección de código.",
    "estado": "leido",
    "creado_en": "2026-09-11 13:46:04"
  }
}
```

### 61. Un cliente NO puede leer la bandeja de contacto

`GET /api/contacto` → **403** (OK)

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 62. Resumen del dashboard

`GET /api/dashboard/resumen` → **200** (OK)

```json
{
  "ok": true,
  "ventas": {
    "ingresos_totales": 5495000.0,
    "pedidos_totales": 3,
    "ingresos_hoy": 0.0,
    "pedidos_hoy": 0,
    "ingresos_mes": 5495000.0,
    "pedidos_mes": 3,
    "ticket_promedio": 1831666.67,
    "variacion_dia": -100.0,
    "variacion_mes": 100.0,
    "pendientes": 2,
    "por_estado": {
      "pendiente": 2,
      "pagada": 1,
      "enviada": 0,
      "entregada": 0,
      "cancelada": 2
    }
  },
  "inventario": {
    "total_productos": 11,
    "productos_activos": 10,
    "agotados": 0,
    "stock_bajo": 0,
    "valor_inventario": 268420000.0
  },
  "usuarios": {
    "total": 9,
    "activos": 8,
    "clientes": 5,
    "nuevos_mes": 6
  },
  "atencion": {
    "solicitudes_pendientes": 0,
    "mensajes_nuevos": 2
  },
  "series": {
    "dias": [
      {
        "fecha": "2026-08-29",
        "etiqueta": "29/08",
        "total": 0.0,
        "pedidos": 0
      },
      {
        "fecha": "2026-08-30",
        "etiqueta": "30/08",
        "total": 0.0,
        "pedidos": 0
      },
      {
        "fecha": "2026-08-31",
        "etiqueta": "31/08",
        "total": 0.0,
        "pedidos": 0
      },
      {
        "fecha": "2026-09-01",
      
  ... (recortado)
```

### 63. Reporte de ventas del mes

`GET /api/dashboard/reporte` → **200** (OK)

```json
{
  "ok": true,
  "rango": {
    "desde": "2026-09-01",
    "hasta": "2026-09-11"
  },
  "totales": {
    "pedidos": 5,
    "ingresos": 5495000.0,
    "articulos": 4
  },
  "por_metodo_pago": [
    {
      "metodo": "contraentrega",
      "pedidos": 2,
      "total": 4380000.0
    },
    {
      "metodo": "transferencia",
      "pedidos": 1,
      "total": 1115000.0
    }
  ],
  "productos": [
    {
      "nombre": "iPad 10ma generación",
      "marca": "Apple",
      "unidades": 2,
      "ingresos": 4200000.0
    },
    {
      "nombre": "Galaxy Watch 6",
      "marca": "Samsung",
      "unidades": 1,
      "ingresos": 1100000.0
    },
    {
      "nombre": "Cargador rápido 65W GaN",
      "marca": "Ugreen",
      "unidades": 1,
      "ingresos": 180000.0
    }
  ],
  "ventas": [
    {
      "id_venta": 21,
      "codigo": "PS-20260911-3687",
      "id_usuario": 38,
      "cliente_nombre": "Cliente Pruebas",
      "cliente_email": "cliente.test89152363@phonestore.com",
      "cliente_telefono": "3001234567",
      "cliente_documento": "189152363",
      "direccion_envio": "Calle 45 # 12-34 Medellin",
      "ciudad": "Medellin",
      "notas": "Pedido generado por las pruebas autom
  ... (recortado)
```

### 64. Valida el rango de fechas del reporte

`GET /api/dashboard/reporte` → **400** (OK)

```json
{
  "ok": false,
  "message": "La fecha inicial debe ser anterior a la fecha final."
}
```

### 65. Busca usuarios por correo

`GET /api/usuarios?buscar=...` → **200** (OK)

```json
{
  "ok": true,
  "usuarios": [
    {
      "id_usuario": 38,
      "nombre": "Cliente",
      "apellido": "Pruebas",
      "tipo_documento": "CC",
      "numero_documento": "189152363",
      "direccion": "Calle 45 # 12-34 Medellin",
      "telefono": "3001234567",
      "email": "cliente.test89152363@phonestore.com",
      "email_verificado": false,
      "doble_factor": false,
      "estado": "activo",
      "id_rol": 3,
      "rol": "cliente",
      "creado_en": "2026-09-11 13:46:03",
      "actualizado_en": "2026-09-11 13:46:03"
    }
  ],
  "paginacion": {
    "pagina": 1,
    "limite": 10,
    "total": 1,
    "total_paginas": 1
  }
}
```

### 66. Consulta un usuario por id

`GET /api/usuarios/38` → **200** (OK)

```json
{
  "ok": true,
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Pruebas",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 45 # 12-34 Medellin",
    "telefono": "3001234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 3,
    "rol": "cliente",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:03",
    "total_pedidos": 1
  }
}
```

### 67. Edita un usuario

`PUT /api/usuarios/38` → **200** (OK)

```json
{
  "ok": true,
  "message": "Usuario actualizado.",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Editado",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Carrera 70 # 30-20 Medellin",
    "telefono": "3011234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 3,
    "rol": "cliente",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 68. Cambia el rol a empleado

`PATCH /api/usuarios/38/rol` → **200** (OK)

```json
{
  "ok": true,
  "message": "Rol actualizado.",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Editado",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Carrera 70 # 30-20 Medellin",
    "telefono": "3011234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 69. Rechaza un rol inexistente

`PATCH /api/usuarios/38/rol` → **400** (OK)

```json
{
  "ok": false,
  "message": "Rol inválido.",
  "errors": {
    "id_rol": "Debe ser 1 (admin), 2 (empleado) o 3 (cliente)."
  }
}
```

### 70. Desactiva un usuario

`PATCH /api/usuarios/38/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Usuario marcado como inactivo.",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Editado",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Carrera 70 # 30-20 Medellin",
    "telefono": "3011234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "inactivo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 71. Un usuario inactivo no puede iniciar sesión

`POST /api/auth/login` → **403** (OK)

```json
{
  "ok": false,
  "message": "Tu cuenta se encuentra inactiva. Contacta al administrador."
}
```

### 72. Reactiva el usuario

`PATCH /api/usuarios/38/estado` → **200** (OK)

```json
{
  "ok": true,
  "message": "Usuario marcado como activo.",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Editado",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Carrera 70 # 30-20 Medellin",
    "telefono": "3011234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 73. El administrador no puede desactivarse a sí mismo

`PATCH /api/usuarios/1/estado` → **400** (OK)

```json
{
  "ok": false,
  "message": "No puedes desactivar tu propia cuenta mientras la estás usando."
}
```

### 74. El usuario actualiza su propio perfil

`PUT /api/auth/perfil` → **200** (OK)

```json
{
  "ok": true,
  "message": "Perfil actualizado.",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Perfil",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 10 # 20-30 Medellin",
    "telefono": "3021234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 75. Rechaza el cambio si la contraseña actual es incorrecta

`PUT /api/auth/password` → **400** (OK)

```json
{
  "ok": false,
  "message": "La contraseña actual no es correcta.",
  "errors": {
    "passwordActual": "Contraseña incorrecta."
  }
}
```

### 76. Cambia la contraseña correctamente

`PUT /api/auth/password` → **200** (OK)

```json
{
  "ok": true,
  "message": "Contraseña actualizada correctamente."
}
```

### 77. Inicia sesión con la contraseña nueva

`POST /api/auth/login` → **200** (OK)

```json
{
  "ok": true,
  "message": "Inicio de sesión exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjozOCwiZW1haWwiOiJjbGllbnRlLnRlc3Q4OTE1MjM2M0BwaG9uZXN0b3JlLmNvbSIsInJvbCI6ImVtcGxlYWRvIiwiaWRfcm9sIjoyLCJleHAiOjE3ODkyMzg3NjUsImlhdCI6MTc4OTE1MjM2NX0.LeWk6Hm3j9VAdxQjWqAzEFhOOtu9D8OADQJLznZgap4",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Perfil",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 10 # 20-30 Medellin",
    "telefono": "3021234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "activo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  }
}
```

### 78. Solicita recuperación de contraseña

`POST /api/auth/recuperar-password` → **200** (OK)

```json
{
  "ok": true,
  "message": "Si el correo está registrado, enviamos las instrucciones para restablecer la contraseña."
}
```

### 79. La respuesta NO expone el token de recuperación

`POST /api/auth/recuperar-password` → **200** (OK)

> El enlace se envía por correo, nunca en el JSON

```json
{
  "ok": true,
  "message": "Si el correo está registrado, enviamos las instrucciones para restablecer la contraseña."
}
```

### 80. No revela si un correo existe o no

`POST /api/auth/recuperar-password` → **200** (OK)

```json
{
  "ok": true,
  "message": "Si el correo está registrado, enviamos las instrucciones para restablecer la contraseña."
}
```

### 81. Rechaza un token de recuperación inválido

`POST /api/auth/restablecer-password` → **400** (OK)

```json
{
  "ok": false,
  "message": "El enlace de recuperación no es válido o ya caducó. Solicita uno nuevo."
}
```

### 82. Un cliente NO puede eliminar servicios

`DELETE /api/servicios/25` → **403** (OK)

```json
{
  "ok": false,
  "message": "No tienes permisos para acceder a este recurso."
}
```

### 83. El administrador elimina el servicio de prueba

`DELETE /api/servicios/25` → **200** (OK)

```json
{
  "ok": true,
  "message": "Servicio eliminado.",
  "desactivado": false
}
```

### 84. El producto con ventas se desactiva en vez de borrarse

`DELETE /api/productos/32` → **200** (OK)

> Protege el histórico de ventas

```json
{
  "ok": true,
  "message": "El producto tiene ventas registradas, por eso se desactivó en lugar de eliminarse (así no se pierde el histórico).",
  "producto": {
    "id_producto": 32,
    "nombre": "Producto Test 89152363 editado",
    "marca": "MarcaTest",
    "id_categoria": 38,
    "categoria": "Categoria Test 89152363 editada",
    "descripcion": "Descripción actualizada por las pruebas",
    "precio": 450000.0,
    "precio_anterior": null,
    "stock": 15,
    "stock_minimo": 3,
    "estado_stock": "disponible",
    "destacado": true,
    "imagen_url": "/img/iphone-17.webp",
    "estado": "inactivo",
    "creado_en": "2026-09-11 13:46:04",
    "actualizado_en": "2026-09-11 13:46:05"
  },
  "desactivado": true
}
```

### 85. No se puede borrar una categoría con productos

`DELETE /api/categorias/38` → **409** (OK)

```json
{
  "ok": false,
  "message": "No se puede eliminar: hay 1 producto(s) en esta categoría. Muévelos a otra categoría o desactívala."
}
```

### 86. El usuario con pedidos se desactiva en vez de borrarse

`DELETE /api/usuarios/38` → **200** (OK)

```json
{
  "ok": true,
  "message": "El usuario tiene pedidos registrados, por eso se desactivó en lugar de eliminarse (así no se pierde el histórico de ventas).",
  "usuario": {
    "id_usuario": 38,
    "nombre": "Cliente",
    "apellido": "Perfil",
    "tipo_documento": "CC",
    "numero_documento": "189152363",
    "direccion": "Calle 10 # 20-30 Medellin",
    "telefono": "3021234567",
    "email": "cliente.test89152363@phonestore.com",
    "email_verificado": false,
    "doble_factor": false,
    "estado": "inactivo",
    "id_rol": 2,
    "rol": "empleado",
    "creado_en": "2026-09-11 13:46:03",
    "actualizado_en": "2026-09-11 13:46:05"
  },
  "desactivado": true
}
```

### 87. Un id inexistente devuelve 404

`GET /api/productos/999999` → **404** (OK)

```json
{
  "ok": false,
  "message": "Producto no encontrado."
}
```
