# Normalización de la base de datos

**Proyecto:** PhoneStore — React + Vite + FastAPI + MySQL
**Esquema:** `database/phonestore.sql` — 18 tablas, 21 llaves foráneas, 77 índices

Este documento explica en qué forma normal está cada grupo de tablas y,
en los dos únicos lugares donde el esquema se aparta de la tercera forma
normal a propósito, por qué esa decisión es correcta y no un error de
diseño.

---

## 1. Primera forma normal (1FN)

Una tabla está en 1FN si cada columna guarda un solo valor atómico y no
hay grupos que se repitan dentro de una misma fila.

**Cómo se cumple:** la alternativa incorrecta a `venta_detalles` sería
guardar los productos de un pedido en la propia tabla `ventas`, con
columnas como `producto_1`, `cantidad_1`, `producto_2`, `cantidad_2`...
Esa tabla dejaría de estar en 1FN (un grupo de columnas que se repite) y
además limitaría el pedido a un número fijo de productos.

En su lugar, cada línea vendida es **una fila** en `venta_detalles`:

```sql
CREATE TABLE venta_detalles (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NULL,
  nombre_producto VARCHAR(80) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  cantidad INT NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  ...
);
```

Un pedido con 1 producto o con 50 usa la misma estructura: 1 o 50 filas.
El mismo patrón se aplica en `rol_permisos` (un rol con N permisos son N
filas, no una columna con una lista separada por comas) y en
`mensajes_chat` (una conversación con N mensajes son N filas).

---

## 2. Segunda forma normal (2FN)

Una tabla está en 2FN si está en 1FN y, además, todo atributo que no es
llave depende de la **llave completa**, no de una parte de ella.

**Cómo se cumple:** el esquema evita llaves compuestas y usa un
identificador propio (`id_detalle`, `id_movimiento`, `id_mensaje`...) en
cada tabla de detalle. Como la llave primaria es un único campo, no
existe la posibilidad de una dependencia parcial: no hay ningún atributo
que pueda depender de "la mitad" de la llave, porque la llave no tiene
mitades.

Ejemplo concreto: en `venta_detalles`, `precio_unitario` y `subtotal`
dependen del detalle completo (esa línea de ese pedido), no solo de
`id_producto` — de hecho, **no pueden** depender solo del producto,
porque el precio de un mismo producto cambia entre una venta y otra (ver
sección 4).

---

## 3. Tercera forma normal (3FN)

Una tabla está en 3FN si está en 2FN y ningún atributo que no es llave
depende de otro atributo que tampoco es llave (dependencia transitiva).

**Cómo se cumple, con ejemplos del esquema real:**

| Tabla | Dependencia transitiva evitada |
|---|---|
| `productos` | La categoría no repite su nombre ni descripción en cada producto: solo guarda `id_categoria`, que apunta a `categorias`. Si el nombre de una categoría cambia, se edita en un solo lugar. |
| `usuarios` | El rol no repite su nombre ni sus permisos en cada usuario: `id_rol` apunta a `roles`, y `roles` se relaciona con `permisos` a través de `rol_permisos` (una tabla puente N:M, la forma correcta de modelar "cada rol tiene varios permisos y cada permiso pertenece a varios roles"). |
| `solicitudes_servicio` | El precio y la duración del servicio no se repiten en cada solicitud: se leen de `servicios` mediante `id_servicio`. |
| `movimientos_inventario` | El nombre del producto no se repite en cada movimiento del kardex: se lee de `productos` mediante `id_producto`. |

Gracias a esto, cambiar el nombre de una categoría, los permisos de un
rol o la descripción de un servicio es una sola actualización, y todas
las tablas que dependen de ese dato lo ven reflejado de inmediato.

---

## 4. Las dos excepciones — denormalización consciente

Dos tablas guardan información que, en teoría, ya está en otra parte del
esquema y "debería" leerse por relación. Esto no es un error: es una
decisión de diseño documentada, típica de cualquier sistema que emite
documentos comerciales.

### 4.1 `venta_detalles.precio_unitario` y `nombre_producto`

Ese precio también existe en `productos.precio`. Si `venta_detalles` no
copiara el precio y en su lugar leyera siempre `productos.precio` por la
relación, entonces **subir el precio de un producto cambiaría el valor
de todos los pedidos antiguos que lo incluyen** — una factura de hace un
mes empezaría a decir un total distinto al que el cliente pagó. Por eso
el precio (y el nombre, por si el producto se renombra o se elimina) se
copian en el momento de la venta.

### 4.2 `ventas.cliente_nombre/email/telefono` y `facturas.cliente_nombre/documento`

Ese mismo dato ya existe en `usuarios`. Copiarlo responde a la misma
lógica: si el cliente edita su perfil el mes siguiente, sus pedidos y
facturas ya emitidos deben seguir mostrando los datos con los que se
hizo esa compra, no los datos actuales. Un documento contable no puede
cambiar retroactivamente porque alguien actualizó su dirección.

**Regla general que resume las dos excepciones:** todo lo que forma
parte de un **documento histórico** (una venta o una factura ya emitida)
se copia en el momento en que ese documento nace. Todo lo demás
(categorías, roles, permisos, servicios, productos mientras no se han
vendido) se consulta por relación, como exige la 3FN.

---

## 5. Resumen

| Forma normal | Estado | Evidencia |
|---|---|---|
| 1FN | Cumple | Sin columnas repetidas ni listas dentro de un campo; el detalle de cada venta, permiso y mensaje es una fila propia |
| 2FN | Cumple | Todas las tablas usan llave primaria simple (`id_*` autoincremental); no hay dependencias parciales posibles |
| 3FN | Cumple, con 2 excepciones documentadas | Catálogo, roles/permisos y servicios se consultan por relación; solo los documentos históricos (venta, factura) copian datos, y se explica por qué |

El esquema completo, con las 18 tablas, sus llaves y restricciones, está
en [`database/phonestore.sql`](../database/phonestore.sql).
