# Backend — PhoneStore (FastAPI)

API REST en **Python + FastAPI + SQLAlchemy**, conectada a MySQL.
Es el backend vigente del proyecto: reemplaza al de Node/Express del
tercer avance, que se conserva en `../backend/` solo como histórico.

| | |
|---|---|
| Endpoints | 51 en 10 módulos |
| Autenticación | JWT (HS256) con control de roles |
| Contraseñas | bcrypt, 10 rondas |
| Pruebas | 87 automatizadas, todas superadas |

---

## Puesta en marcha

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

En Linux o macOS: `source venv/bin/activate`.

```bash
pip install -r requirements.txt
```

Copia `.env.example` como `.env` y ajusta las credenciales. Después crea
el administrador y el catálogo de ejemplo:

```bash
python -m app.scripts.seed_admin
```

```bash
python -m app.scripts.seed_demo
```

Levanta el servidor:

```bash
python -m uvicorn app.main:app --reload --port 3000
```

| Dirección | Qué es |
|-----------|--------|
| `http://localhost:3000/docs` | Swagger UI: documentación interactiva |
| `http://localhost:3000/redoc` | Documentación alternativa |
| `http://localhost:3000/api/health` | Comprobación de estado |

> La base de datos se crea con `../database/phonestore.sql`. Ese script es
> idempotente: crea el esquema desde cero y, si la base ya existía de un
> avance anterior, agrega las columnas y tablas nuevas sin perder datos.

## Estructura

```
app/
├── main.py           App FastAPI, CORS, manejo unificado de errores, routers
├── database.py       Conexión SQLAlchemy y dependencia de sesión
├── models.py         Las 13 tablas como clases
├── schemas.py        Validación de entrada (Pydantic)
├── validations.py    Reglas de negocio y saneamiento anti-XSS
├── serializers.py    Modelo → JSON, sin exponer datos sensibles
├── auth.py           JWT, bcrypt, require_role, tokens de recuperación
├── security.py       Cabeceras de seguridad, CORS y límite de intentos
├── mailer.py         Correo saliente (SMTP opcional)
├── errors.py         AppError: forma única de respuesta de error
├── routes/           auth · usuarios · categorias · productos · servicios
│                     ventas · inventario · solicitudes · contacto · dashboard
└── scripts/          seed_admin.py · seed_demo.py

tests/
├── pruebas_api.py            87 pruebas (solo biblioteca estándar)
├── evidencia_pruebas_api.md  Informe que generan las pruebas
└── limpiar_datos_prueba.py   Borra lo que dejan las pruebas
```

## Las capas de validación

Un dato pasa por cuatro filtros antes de llegar a la base:

1. **Pydantic** (`schemas.py`): tipos, campos obligatorios, longitudes y rangos.
2. **Reglas de negocio** (`validations.py`): expresiones regulares, duplicados, stock.
3. **Rol** (`auth.py`): `require_role` se ejecuta antes que la ruta.
4. **Base de datos**: `NOT NULL`, `UNIQUE`, `CHECK` y llaves foráneas.

El Frontend también valida, pero eso es solo comodidad para el usuario:
**el backend valida siempre**, sin importar de dónde venga la petición.

## Puntos de cuidado

| Tema | Cómo está resuelto |
|------|--------------------|
| Precios | El esquema de compra no acepta precios. El servidor los lee de la tabla `productos` |
| Stock | Se descuenta dentro de una transacción, con `SELECT ... FOR UPDATE` sobre las filas implicadas |
| Ventas | Cabecera y detalle se escriben juntos, o no se escribe nada |
| Histórico | Un usuario o producto con ventas se desactiva; nunca se borra |
| Contraseñas | Se guardan hasheadas y jamás se devuelven en ninguna respuesta |
| Recuperación | Token de un solo uso, guardado hasheado, con caducidad de 30 minutos, enviado por correo (nunca en el JSON) |
| Fuerza bruta | Solo los intentos fallidos suman al contador; un acierto lo reinicia |

## Pruebas

Con el servidor corriendo:

```bash
python -m tests.pruebas_api
```

Recorre los 51 endpoints con GET, POST, PUT, PATCH y DELETE, y comprueba
la autenticación, el control de roles, las validaciones, el stock, la
protección de precios y el saneamiento anti-XSS. Genera
`tests/evidencia_pruebas_api.md`.

Para borrar los datos que dejan:

```bash
python -m tests.limpiar_datos_prueba
```

Si necesitas correr las pruebas seguidas sin toparte con el límite
anti-fuerza-bruta, pon `RATE_LIMIT_ENABLED=false` en el `.env`.

---

Documentación completa del proyecto en [`../docs/`](../docs/README.md).
