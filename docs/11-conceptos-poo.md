# Conceptos y principios de programación orientada a objetos

Preparación para la sustentación: qué es cada concepto y **dónde vive
exactamente en PhoneStore**, con código real del proyecto. No son
definiciones de manual: son las que se pueden mostrar en pantalla.

---

## 1. Clase

Una clase es el molde: describe qué atributos y comportamiento va a
tener cada elemento de un mismo tipo, sin ser todavía ninguno en
particular. En el proyecto hay dos familias de clases:

**Modelos SQLAlchemy** (`app/models.py`) — describen una tabla:

```python
class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(80), nullable=False)
    precio = Column(DECIMAL(12, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    id_categoria = Column(Integer, ForeignKey("categorias.id_categoria"))

    categoria = relationship("Categoria", back_populates="productos")
```

**Esquemas Pydantic** (`app/schemas.py`) — describen la forma de un dato
que entra o sale por la API, por ejemplo `ProductoCrear` o
`UsuarioRespuesta`. 17 clases del primer tipo y 48 del segundo componen
el proyecto.

## 2. Objeto

Un objeto es una instancia concreta de una clase: ya tiene valores
propios en cada atributo. `Producto` es la clase; "iPhone 17, $4.500.000,
15 unidades" es un objeto de esa clase — una fila real de la tabla, viva
en memoria mientras el programa la usa.

Se ve claro en `app/routes/ventas.py`, al registrar una venta:

```python
venta = Venta(
    codigo=codigo,
    id_usuario=usuario_id,
    cliente_nombre=datos.cliente_nombre,
    subtotal=subtotal,
    total=total,
    estado="pendiente",
)
db.add(venta)
db.commit()
```

`Venta` es la clase. La variable `venta` es el objeto: en el momento en
que se ejecuta `Venta(...)`, Python reserva memoria y llena esos campos
con los valores concretos de *esa* compra. Dos clientes comprando al
mismo tiempo generan dos objetos `Venta` distintos, cada uno con su
propia identidad, aunque provengan del mismo molde.

## 3. Cómo se convierten las clases en objetos (instanciación)

Es el proceso que ocurre en la línea `Venta(...)` de arriba, y siempre
sigue el mismo orden en este proyecto:

1. **Llega una petición HTTP.** FastAPI recibe el JSON del carrito.
2. **Pydantic instancia un esquema** (`VentaCrear`) con esos datos: aquí
   ya hay un primer objeto, que solo vive para validar la forma del
   dato. Si algo no cumple el esquema, el objeto nunca se termina de
   construir y FastAPI responde 422 antes de tocar la base de datos.
3. **La ruta instancia el modelo SQLAlchemy** (`Venta(...)`, como arriba):
   nace el objeto que representa la fila que va a existir en la tabla.
4. **`db.add(objeto)`** avisa a SQLAlchemy que ese objeto debe
   persistirse.
5. **`db.commit()`** traduce el objeto a una sentencia `INSERT` real y la
   ejecuta contra MySQL. A partir de ese momento, el objeto en memoria y
   la fila en la base de datos están sincronizados; SQLAlchemy incluso
   rellena `id_venta` en el objeto Python con el id que MySQL acaba de
   asignar.

En resumen: **una clase se convierte en objeto cada vez que se llama a su
constructor** (`NombreDeClase(...)`), y en este proyecto eso pasa en dos
capas seguidas — primero para validar (Pydantic), después para persistir
(SQLAlchemy) — nunca directamente desde los datos crudos de la petición.

## 4. Herencia

Una clase hija reutiliza los atributos de una clase padre y solo agrega o
cambia lo que le hace falta. Aparece en dos niveles:

**Nivel 1 — todos los modelos heredan de `Base`:**

```python
class Rol(Base):        ...
class Usuario(Base):    ...
class Producto(Base):   ...
```

`Base` (de `sqlalchemy.orm.declarative_base()`) es la que le da a
cualquier clase que herede de ella el comportamiento de "esto es una
tabla": el registro automático en los metadatos, la generación del
`CREATE TABLE`, el mapeo objeto-fila. Ninguna de las 17 clases hijas
tiene que reescribir esa lógica.

**Nivel 2 — esquemas que heredan de otro esquema**, para no repetir
reglas de validación:

```python
class ProductoCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    precio: float = Field(ge=0)
    stock: int = Field(ge=0)
    ...

class ProductoActualizar(ProductoCrear):
    pass
```

`ProductoActualizar` hereda **todas** las reglas de `ProductoCrear` (los
mismos límites de longitud y de precio) sin volver a escribirlas. El
mismo patrón se repite en `CategoriaActualizar(CategoriaCrear)`,
`ServicioActualizar(ServicioCrear)` y `UsuarioCrear(UsuarioRegistro)`.
Si mañana cambia la regla del precio mínimo, se cambia en un solo lugar
y las dos clases quedan actualizadas.

## 5. Polimorfismo

Polimorfismo es que **el mismo llamado** se comporte de manera distinta
según qué hay detrás, sin que quien llama necesite saberlo. El ejemplo
más claro del proyecto es el asistente (`app/asistente.py`):

```python
def responder(mensaje: str, ficha: dict, historial: list) -> tuple[str, str]:
    if hay_proveedor_de_ia_configurado():
        return responder_con_ia(mensaje, ficha, historial)
    return responder_con_catalogo(mensaje, ficha)
```

`POST /api/chatbot/mensaje` siempre llama a `responder(...)`. Detrás de
esa única llamada hay **dos implementaciones completamente distintas** —
una que arma una respuesta a partir de reglas y del catálogo, otra que
llama a un proveedor de IA externo — pero el endpoint nunca se entera de
cuál de las dos se ejecutó, ni tiene que cambiar una sola línea si mañana
se agrega un tercer motor. Esa es la utilidad real del polimorfismo: se
puede cambiar o añadir el comportamiento sin tocar el código que lo usa.

Un segundo ejemplo, más pequeño, es `require_role(...)`
(`app/security.py`): genera una dependencia distinta según los roles que
se le pidan (`require_role("administrador")` frente a
`require_role("administrador", "empleado")`), pero cada ruta la usa
exactamente de la misma forma, como `Depends(require_role(...))`.

## 6. Utilidad de cada componente en este proyecto

| Concepto | Para qué se usó aquí |
|---|---|
| Clase | Definir una sola vez la forma de `Producto`, `Venta`, `Factura`... y reutilizarla en cada fila y en cada petición |
| Objeto | Representar *una* compra, *un* usuario, *una* factura concretos, con sus propios valores, sin mezclarse con los demás |
| Herencia | Evitar repetir las reglas de validación entre `Crear` y `Actualizar`, y evitar reescribir la lógica de persistencia en cada una de las 17 tablas |
| Polimorfismo | Que el chatbot funcione igual desde afuera tenga o no tenga una clave de IA configurada, y que la protección por rol se exprese siempre de la misma forma en cualquier ruta |

## 7. Preguntas típicas de sustentación, ya respondidas

- **¿Cuál es la diferencia entre `Producto` y un producto real del
  catálogo?** `Producto` es la clase (el molde, en `app/models.py`); el
  iPhone 17 con sus 15 unidades en stock es un objeto de esa clase, una
  fila concreta en la tabla `productos`.
- **¿En qué momento exacto se crea un objeto?** Cuando se ejecuta
  `NombreDeClase(...)`. En una compra pasa dos veces: primero Pydantic
  crea el objeto de validación, después SQLAlchemy crea el objeto que se
  convierte en fila.
- **¿Por qué usar herencia en los esquemas y no copiar y pegar los
  campos?** Porque una regla de negocio (por ejemplo, el precio mínimo)
  vive en un solo lugar. Copiar y pegar habría significado mantener la
  misma regla en varios archivos y arriesgarse a que queden
  desincronizados.
- **¿Dónde hay polimorfismo si el proyecto no define subclases con
  métodos sobrescritos?** El polimorfismo no exige herencia: exige que
  una misma llamada tenga comportamientos distintos según el contexto.
  `responder(...)` es el ejemplo — la función que se ejecuta realmente
  cambia según haya o no un proveedor de IA configurado, y quien la llama
  no necesita saberlo.
