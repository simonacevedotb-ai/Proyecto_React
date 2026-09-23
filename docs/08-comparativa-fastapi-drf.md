# FastAPI frente a Django REST Framework en este proyecto

Las dos herramientas sirven para lo mismo: publicar una API REST en
Python que consuma un frontend. Este documento no repite la comparación
genérica que hay en internet; compara **lo que hace PhoneStore** y cómo
habría quedado ese mismo código con Django REST Framework (DRF).

---

## 1. El punto de partida

El frontend es una aplicación React + Vite que ya existe y que se
despliega aparte. El backend, por tanto, solo tiene que hacer una cosa:
entregar y recibir JSON. No hay plantillas HTML que renderizar en el
servidor, ni formularios de Django, ni sesiones con cookies: hay un
token JWT y peticiones `fetch`.

Esa frase decide casi toda la comparación. Django trae un marco
completo (ORM, panel de administración, plantillas, autenticación por
sesión, comandos de gestión) y DRF se apoya en él. FastAPI trae lo
justo para publicar una API y deja que uno elija el resto.

---

## 2. La misma tarea en las dos herramientas

### Definir un endpoint con validación

En el proyecto, crear un producto es esto (`app/routes/productos.py`):

```python
@router.post("", status_code=201, response_model=ProductoUnicoRespuesta)
def crear(
    body: ProductoCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador", "empleado")),
):
    ...
```

La firma de la función ya dice todo: qué entra (`ProductoCrear`), qué
sale (`ProductoUnicoRespuesta`), de dónde sale la sesión de base de
datos y qué rol hace falta. FastAPI lo lee de las anotaciones de tipo y
con eso valida, documenta y responde.

En DRF el mismo endpoint se reparte en tres archivos: un
`ProductoSerializer` (validación y salida), un `ModelViewSet` o
`APIView` (la lógica), una clase de permisos (`IsAdminUser` o una
propia) y una entrada en el `router` de `urls.py`. Es más ceremonia,
pero también más convención: cualquiera que conozca DRF sabe dónde
buscar cada pieza.

### Validar los datos

| | PhoneStore (FastAPI) | Equivalente en DRF |
|---|---|---|
| Tipos y longitudes | `Field(min_length=2, max_length=80)` en `schemas.py` | `serializers.CharField(min_length=2, max_length=80)` |
| Reglas propias | `@field_validator` / `@model_validator` | `validate_<campo>()` / `validate()` |
| Entrada y salida separadas | Esquemas distintos (`ProductoCrear` / `ProductoRespuesta`) | Un serializer con `read_only_fields`, o dos serializers |
| Error devuelto | 422 con `{ campo: mensaje }` | 400 con `{ campo: [mensajes] }` |

Son equivalentes. La diferencia práctica es que en DRF el serializer
hace de validador **y** de traductor del modelo, mientras que aquí esas
dos tareas están separadas: Pydantic valida y `serializers.py` arma el
diccionario de salida. Cuesta un archivo más, pero deja claro que la
salida nunca se genera sola a partir del modelo: `usuario_safe()` decide
campo por campo qué sale, y por eso `password_hash` no puede escaparse
por descuido.

### Base de datos

Las dos usan un ORM, y en los dos casos el CRUD acaba siendo parecido.
DRF trae el ORM de Django con **migraciones automáticas**
(`makemigrations` / `migrate`), que es una ventaja real y que aquí se
sustituye con `database/phonestore.sql`, un script idempotente escrito a
mano. Para un proyecto con más manos y más cambios de esquema, las
migraciones de Django ahorran trabajo y disgustos.

### Documentación

FastAPI genera `/docs` y `/redoc` a partir del mismo código que valida:
los `summary`, las etiquetas y los ejemplos del proyecto salen de
`main.py` y de `schemas.py`. En DRF hay que instalar
`drf-spectacular` o `drf-yasg` y anotar las vistas para conseguir algo
parecido. Con el instructor probando la API desde el navegador, esto
pesó en la decisión.

### Autenticación

| | PhoneStore (FastAPI) | DRF |
|---|---|---|
| Mecanismo | JWT propio con `python-jose` | `djangorestframework-simplejwt` |
| Dónde se decide el acceso | Dependencias: `auth_required`, `require_role(...)` | Clases `permission_classes` |
| Usuario en la vista | `current_user: dict = Depends(...)` | `request.user` |

DRF tiene ventaja aquí: el sistema de usuarios, grupos y permisos viene
hecho, y el panel de administración de Django permite gestionar cuentas
sin escribir una línea. En este proyecto ese panel se construyó a mano
en React, que era parte del enunciado.

### Asincronía

FastAPI es ASGI de nacimiento: `async def` funciona sin preparativos.
El asistente (`POST /api/chatbot/mensaje`) lo aprovecha porque puede
tener que esperar la respuesta de un proveedor de IA externo. Django
admite vistas asíncronas desde la versión 3.1, pero las vistas de DRF son
síncronas, así que ese caso concreto habría quedado ocupando un hilo del
servidor mientras se espera la respuesta del proveedor.

---

## 3. Lo que se ganó y lo que se dejó

**A favor de FastAPI, en este proyecto:**

1. La documentación interactiva sale gratis y actualizada.
2. Un endpoint se lee entero en su firma, sin saltar entre archivos.
3. Pydantic v2 valida y convierte tipos en el mismo paso.
4. `async` disponible donde hace falta (la llamada al proveedor de IA).
5. El backend arranca con `uvicorn` y poco más: menos piezas que
   configurar para un despliegue pequeño.

**A favor de DRF, y que aquí costó trabajo:**

1. **Migraciones automáticas.** Aquí hubo que escribir y mantener el
   `.sql` a mano.
2. **Panel de administración.** Django lo da hecho; en este proyecto el
   panel es React y son unas 6.300 líneas entre `pages/admin/` y su
   layout.
3. **Convenciones.** En DRF todo el mundo pone las cosas en el mismo
   sitio; en FastAPI la estructura (`routes/`, `schemas.py`,
   `serializers.py`, `validations.py`) hubo que decidirla y sostenerla.
4. **Ecosistema.** Paginación, filtros y throttling vienen incluidos en
   DRF; aquí la paginación, los filtros y el limitador de intentos
   (`app/security.py`) están escritos en el proyecto.

---

## 4. Conclusión

Para PhoneStore, FastAPI fue la elección correcta: el servidor solo
publica una API para un frontend que ya está hecho en React, la
documentación automática es parte de la entrega y el asistente necesita
una llamada externa que conviene no bloquear.

DRF habría sido mejor opción si el proyecto hubiera necesitado el panel
de administración de Django, si el esquema de la base de datos cambiara
a menudo —por las migraciones— o si el mismo servidor tuviera que
renderizar páginas además de responder JSON.

Dicho de otro modo: no es que una herramienta sea mejor; es que este
proyecto usa exactamente la mitad de lo que ofrece Django, y esa mitad
es la que FastAPI cubre sin traer la otra.
