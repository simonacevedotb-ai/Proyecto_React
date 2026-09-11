# ¿Requiere pasarela de pagos?

**Respuesta: NO (N)**

---

## 1. Decisión

PhoneStore **no integra una pasarela de pagos en línea**. El cobro se hace
por fuera de la plataforma, con tres métodos que sí quedan registrados en
el sistema:

| Método | Cómo funciona | Dónde queda registrado |
|--------|---------------|------------------------|
| Pago contra entrega | El cliente paga en efectivo al mensajero | `ventas.metodo_pago = 'contraentrega'` |
| Transferencia bancaria | Se le envían los datos de la cuenta al confirmar | `ventas.metodo_pago = 'transferencia'` |
| Efectivo en tienda | Reserva en línea, pago al recoger | `ventas.metodo_pago = 'efectivo'` |

## 2. Por qué

**Razón técnica.** Una pasarela real (Wompi, PayU, Mercado Pago, Stripe)
exige credenciales de comercio emitidas a un negocio constituido, un
dominio con HTTPS y una URL pública que reciba los *webhooks* de
confirmación. Nada de eso existe en un proyecto que corre en `localhost`.

**Razón académica.** La guía del cuarto avance no la pide. Sus
entregables son la integración React + FastAPI + SQL, la autenticación
JWT, el hashing de contraseñas, las validaciones, el control de roles y
las operaciones CRUD. La tienda cubre todo eso.

**Razón de honestidad.** Un botón «Pagar con tarjeta» que no cobra nada
sería exactamente el tipo de función falsa que este proyecto evita.
Peor aún: un formulario que pida número de tarjeta sin una pasarela real
detrás enseñaría al usuario un hábito peligroso. Por eso no existe.

## 3. Qué sí hace el sistema

Aunque no cobre en línea, el ciclo de venta está completo y es real:

| Etapa | Implementado |
|-------|--------------|
| Carrito con validación de stock | Sí |
| Cálculo de subtotal, envío y total **en el servidor** | Sí |
| Registro de la venta en la base de datos | Sí: cabecera + detalle |
| Precio congelado al momento de la compra | Sí (`venta_detalles.precio_unitario`) |
| Descuento automático de existencias | Sí, dentro de una transacción |
| Código de pedido para seguimiento | Sí (`PS-AAAAMMDD-1234`) |
| Estados del pedido | pendiente → pagada → enviada → entregada |
| Confirmación del pago por el administrador | Sí: marcar el pedido como «pagada» |
| Devolución de stock al cancelar | Sí, automática |
| Historial visible para el cliente | Sí, en «Mis pedidos» |
| Reportes de ingresos por método de pago | Sí, en el panel de reportes |

En otras palabras: **el registro contable de la venta es real**. Lo único
que ocurre fuera del sistema es el movimiento del dinero, igual que en
cualquier tienda que trabaja con pago contra entrega.

## 4. Cómo se integraría más adelante

La arquitectura ya está preparada. Añadir una pasarela requeriría:

1. **Base de datos.** Agregar a `ventas` las columnas
   `referencia_pago VARCHAR(80)` y `estado_pago ENUM(...)`, y ampliar el
   `ENUM` de `metodo_pago` con la opción `tarjeta`.
2. **Backend.** Un módulo `app/routes/pagos.py` con dos endpoints: uno
   que cree la intención de pago tras registrar la venta, y otro que
   reciba el *webhook* de confirmación y cambie el estado a «pagada».
3. **Seguridad.** Verificar la firma del webhook y guardar las llaves en
   el `.env`, nunca en el código. El backend jamás vería el número de
   tarjeta: eso lo maneja el proveedor en su propio formulario.
4. **Frontend.** Añadir la opción «Tarjeta» en el checkout y redirigir al
   formulario del proveedor.

El paso 1 es el único que toca lo ya construido, y es aditivo: no rompe
nada de lo que hoy funciona.

## 5. Resumen para la matriz de entrega

| Campo | Valor |
|-------|-------|
| ¿Requiere pasarela de pagos? | **N** |
| Métodos de pago implementados | Contra entrega, transferencia, efectivo en tienda |
| ¿Se registran las ventas? | Sí, con detalle por producto y precio del momento |
| ¿Se descuenta el inventario? | Sí, de forma transaccional |
| ¿Hay botones de pago que no funcionan? | No |
