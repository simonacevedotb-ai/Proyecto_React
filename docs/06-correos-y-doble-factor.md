# Correos del sistema y verificación en dos pasos

Documento de apoyo del cuarto entregable. Explica los tres correos que
envía PhoneStore, cómo comprobar que salen y qué hay que configurar para
que lleguen a un buzón real.

---

## 1. Qué correos existen

| Correo | Cuándo sale | Qué lleva | Caducidad |
|---|---|---|---|
| Verificación de la cuenta | Al registrarse | Enlace a `/verificar-correo?token=…` | 24 horas |
| Código del segundo paso | Al iniciar sesión, si la cuenta tiene la verificación en dos pasos activa | Código de 6 dígitos | 10 minutos |
| Restablecer contraseña | Al pedir "¿Olvidaste tu contraseña?" | Código de 6 dígitos **y** enlace a `/recuperar-contrasena?token=…` | 30 minutos |

Los tres se arman en `backend-fastapi/app/mailer.py` y se envían con la
misma función, `enviar_correo()`. Van maquetados en HTML con los colores
de la tienda y siempre llevan también una versión en texto plano, que es
la que ven los clientes de correo que no muestran HTML.

### Los dos caminos de la recuperación

El correo de recuperación ofrece dos formas de llegar al mismo sitio, y
las dos terminan en la pantalla `/recuperar-contrasena`:

1. **Código de 6 dígitos.** Se escribe en la página junto con el correo y
   la contraseña nueva. Lo resuelve `POST /api/auth/restablecer-con-codigo`.
2. **Enlace directo.** Abre la misma pantalla con `?token=…` y salta el
   paso del código. Lo resuelve `POST /api/auth/restablecer-password`.

Los dos salen del mismo registro en `password_resets`, así que usar uno
invalida el otro: la solicitud queda marcada como usada.

Para que seis dígitos no basten por sí solos, el código pide además el
correo de la cuenta, caduca a los 30 minutos, admite 5 intentos y tiene
su propio limitador de peticiones, separado del que controla cuántas
veces se puede pedir un correo nuevo.

**Ninguno de los tres viaja en la respuesta HTTP.** Si el enlace o el
código salieran en el JSON, cualquiera podría pedirlos para la cuenta de
otra persona desde el navegador y entrar. Solo salen por correo.

---

## 2. Los dos modos de envío

`app/mailer.py` decide según lo que haya en `.env`:

**Modo desarrollo (por defecto).** Sin `SMTP_HOST`, el mensaje se imprime
en la consola del backend y se guarda en
`backend-fastapi/correos_enviados.log`. No hace falta ninguna credencial
para trabajar ni para probar los flujos completos.

**Modo envío real.** Con `SMTP_HOST` configurado, el mensaje sale por SMTP
hacia el proveedor y llega al buzón del usuario.

---

## 3. Comprobar que los correos salen, sin credenciales

El proyecto trae un servidor SMTP de pruebas que corre en la propia
máquina y guarda cada correo recibido como archivo `.eml`.

1. En `backend-fastapi/.env`:

   ```
   SMTP_HOST=127.0.0.1
   SMTP_PORT=1025
   SMTP_TLS=0
   SMTP_FROM=no-reply@phonestore.com
   ```

2. En una terminal:

   ```bash
   python -m tests.servidor_correo_local
   ```

3. Reinicia el backend para que lea el `.env` nuevo.

Los correos aparecen en `backend-fastapi/tests/correos_recibidos/` y
también impresos en la terminal del servidor de pruebas.

Para comprobar el recorrido completo de forma automática:

```bash
python -m tests.prueba_correos
```

Recorre registro, correo de confirmación, activación del segundo paso,
código de 6 dígitos, rechazo del código incorrecto y entrega del JWT.
Son 22 comprobaciones.

---

## 4. Enviar a buzones reales

### La forma corta: el asistente

```bash
cd backend-fastapi
.\venv\Scripts\activate
python configurar_correo.py
```

Pregunta el proveedor, la dirección y la contraseña de aplicación, manda
un correo de prueba y solo si llega guarda los datos en `.env`. La
contraseña se escribe oculta y no queda en el historial de la terminal.
Después hay que reiniciar el backend.

Si el envío de prueba falla, no cambia nada: el error explica si la
contraseña no es de aplicación, si la dirección está mal escrita o si no
hay conexión.

### La forma larga: editar `.env` a mano

Basta con cambiar las variables. El código del backend no se toca.

**Gmail.** Requiere verificación en dos pasos activa en la cuenta de
Google y una *contraseña de aplicación* (no la contraseña normal):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=1
SMTP_USER=tucorreo@gmail.com
SMTP_PASSWORD=la-contraseña-de-aplicación
SMTP_FROM=tucorreo@gmail.com
```

**Outlook / Hotmail:** `smtp-mail.outlook.com`, puerto 587.
**Brevo, Mailgun, SendGrid:** usan el host y la clave que dé el panel del
proveedor.

Después de cambiarlo hay que reiniciar el backend. Si el envío falla, el
error queda en la consola y el correo se guarda igual en
`correos_enviados.log`, así que nunca se pierde el enlace.

### Las pruebas no mandan correo real

Las pruebas automatizadas crean cuentas en dominios inventados. Con un
proveedor configurado, cada ejecución intentaría entregarles correo de
verdad y devolvería un rebote por cada una. Para evitarlo, estos dominios
solo llegan al registro:

```
SMTP_DOMINIOS_SIN_ENVIO=phonestore.com,example.com
```

Las direcciones reales siguen saliendo con normalidad. Se comprueba
mirando `correos_enviados.log`: los mensajes salidos dicen
`ENVIADO POR SMTP` y el resto, `NO ENVIADO`.

> `.env` nunca se sube al repositorio. Estas claves van solo en la
> máquina donde corre el servidor.

---

## 5. Verificación en dos pasos

### Cómo funciona

1. El usuario escribe correo y contraseña en `/login`.
2. Si la cuenta tiene `doble_factor` activo, `POST /api/auth/login`
   **no devuelve el JWT**. Devuelve un *desafío* y manda un código de 6
   dígitos al correo.
3. La pantalla pide el código y lo envía a
   `POST /api/auth/verificar-doble-factor` junto con el desafío.
4. Si el código es correcto, ahí sí se emite el JWT y empieza la sesión.

### Cómo se activa

Cada usuario lo activa desde **Mi perfil → Seguridad de la cuenta**. Es
obligatorio tener el correo verificado antes, porque el código se envía a
esa dirección; el backend lo exige aunque se llame la API directamente.

### Qué lo protege

| Medida | Para qué |
|---|---|
| El código se guarda hasheado con SHA-256 | Leer la tabla no sirve para entrar |
| Caduca a los 10 minutos | Un código viejo no vale |
| Máximo 5 intentos | Seis dígitos no se pueden adivinar probando |
| Se invalida al usarlo | No se puede reutilizar |
| El desafío es aleatorio, no el id del usuario | No revela de quién es la sesión pendiente |
| El correo aparece enmascarado (`c****a@…`) | Confirma la cuenta sin publicarla |
| Al pedir un código nuevo se anula el anterior | Solo hay uno vivo a la vez |

### Tablas y columnas nuevas

```sql
usuarios.email_verificado  TINYINT(1) NOT NULL DEFAULT 0
usuarios.doble_factor      TINYINT(1) NOT NULL DEFAULT 0

codigos_verificacion (
  id_codigo, id_usuario, tipo ENUM('correo','doble_factor'),
  codigo_hash CHAR(64), desafio CHAR(43), expira_en, usado, intentos
)
```

El script `database/phonestore.sql` las crea y las migra sin borrar datos
existentes.

---

## 6. Endpoints relacionados

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/register` | Crea la cuenta y envía el correo de verificación |
| POST | `/api/auth/verificar-correo` | Consume el enlace y marca el correo como válido |
| POST | `/api/auth/reenviar-verificacion` | Vuelve a enviar el enlace |
| POST | `/api/auth/login` | Credenciales; pide el segundo paso si está activo |
| POST | `/api/auth/verificar-doble-factor` | Cambia el código por el JWT |
| PUT | `/api/auth/doble-factor` | Activa o desactiva el segundo paso |
| POST | `/api/auth/recuperar-password` | Envía el enlace de recuperación |
| POST | `/api/auth/restablecer-password` | Consume el enlace y cambia la contraseña |

Todos aparecen en Swagger UI: <http://127.0.0.1:3000/docs>
