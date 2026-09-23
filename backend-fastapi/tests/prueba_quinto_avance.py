"""Comprueba de punta a punta las funciones del quinto avance.

Recorre lo que pide el enunciado, en el mismo orden en que lo usaria una
persona:

  1. Registro de una venta con su detalle
  2. Historial de ventas con filtros
  3. Reporte diario y sus descargas en PDF y Excel
  4. Emision, consulta y descarga de la factura
  5. Dashboard con los indicadores nuevos y control por rol
  6. Radicacion, consulta y gestion de una PQR
  7. Conversacion con el asistente

Uso:
    python -m tests.prueba_quinto_avance
"""

import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

BASE = os.getenv("API_URL", "http://127.0.0.1:3000/api")
RAIZ = Path(__file__).resolve().parent.parent
DESCARGAS = Path(__file__).resolve().parent / "descargas_prueba"

VERDE, ROJO, GRIS, FIN = "\033[92m", "\033[91m", "\033[90m", "\033[0m"

resultados = []


def leer_env(clave, por_defecto=""):
    ruta = RAIZ / ".env"
    if ruta.exists():
        for linea in io.open(ruta, encoding="utf-8"):
            if linea.strip().startswith(clave + "="):
                return linea.split("=", 1)[1].strip()
    return os.getenv(clave, por_defecto)


def pedir(metodo, ruta, cuerpo=None, token=None, crudo=False):
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    peticion = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    peticion.add_header("Content-Type", "application/json")
    if token:
        peticion.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(peticion, timeout=40) as respuesta:
            contenido = respuesta.read()
            if crudo:
                cabeceras = {k.lower(): v for k, v in respuesta.headers.items()}
                return respuesta.status, contenido, cabeceras
            return respuesta.status, json.loads(contenido.decode("utf-8"))
    except urllib.error.HTTPError as error:
        texto = error.read().decode("utf-8", errors="replace")
        if crudo:
            return error.code, texto.encode(), {}
        try:
            return error.code, json.loads(texto)
        except json.JSONDecodeError:
            return error.code, {"raw": texto[:200]}


def comprobar(descripcion, condicion, detalle=""):
    resultados.append((descripcion, bool(condicion)))
    marca = f"{VERDE}OK  {FIN}" if condicion else f"{ROJO}FALLA{FIN}"
    print(f"  {marca} {descripcion}")
    if detalle:
        print(f"        {GRIS}{detalle}{FIN}")
    return bool(condicion)


def terminar():
    total = len(resultados)
    bien = sum(1 for _, ok in resultados if ok)
    print("\n" + "=" * 70)
    color = VERDE if bien == total else ROJO
    print(f"  {color}RESULTADO: {bien}/{total} comprobaciones superadas{FIN}")
    print("=" * 70 + "\n")
    sys.exit(0 if bien == total else 1)


def main():
    marca = time.strftime("%H%M%S")
    DESCARGAS.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 70)
    print("  PRUEBAS DEL QUINTO AVANCE")
    print("=" * 70 + "\n")

    # ---------------------------------------------------------- sesiones
    print("0. Sesiones")
    estado, datos = pedir("POST", "/auth/login", {
        "email": leer_env("ADMIN_EMAIL"), "password": leer_env("ADMIN_PASSWORD"),
    })
    admin = datos.get("token")
    comprobar("Inicia sesion el administrador", estado == 200 and bool(admin))
    if not admin:
        return terminar()

    correo_cliente = f"cliente.test.quinto{marca}@phonestore.com"
    estado, datos = pedir("POST", "/auth/register", {
        "nombre": "Quinto", "apellido": "Avance", "tipoDocumento": "CC",
        "numeroDocumento": f"55{marca}1", "direccion": "Calle 45 numero 12-34",
        "telefono": "3140009988", "email": correo_cliente, "password": "Prueba1234",
    })
    cliente = datos.get("token")
    comprobar("Se registra un cliente de prueba", estado == 201 and bool(cliente))
    if not cliente:
        return terminar()

    # ---------------------------------------------------------- 1. venta
    print("\n1. Modulo de ventas")
    estado, datos = pedir("GET", "/productos?limite=3")
    productos = [p for p in datos.get("productos", []) if p["stock"] > 1][:2]
    comprobar("Hay productos con existencias para comprar", len(productos) >= 1)
    if not productos:
        return terminar()

    estado, datos = pedir("POST", "/ventas", {
        "items": [{"id_producto": p["id_producto"], "cantidad": 1} for p in productos],
        "cliente_nombre": "Quinto Avance",
        "cliente_email": correo_cliente,
        "cliente_telefono": "3140009988",
        "cliente_documento": f"55{marca}1",
        "direccion_envio": "Calle 45 numero 12-34",
        "ciudad": "Medellin",
        "metodo_pago": "contraentrega",
    }, token=cliente)
    venta = datos.get("venta", {})
    comprobar("Se registra la venta", estado == 201, f"HTTP {estado}")
    comprobar("La venta guarda su detalle", len(venta.get("detalles", [])) == len(productos),
              f"{len(venta.get('detalles', []))} renglones")
    comprobar("La venta guarda cliente, total y estado",
              all(venta.get(c) for c in ("cliente_nombre", "total", "estado", "creado_en")))
    id_venta = venta.get("id_venta")
    if not id_venta:
        return terminar()

    # ---------------------------------------------------- 2. historial
    print("\n2. Historial de ventas")
    estado, datos = pedir("GET", "/ventas?limite=5", token=admin)
    comprobar("El gestor consulta el historial", estado == 200 and "ventas" in datos)
    estado, _ = pedir("GET", "/ventas?limite=5", token=cliente)
    comprobar("Un cliente NO puede ver el historial completo", estado == 403,
              f"HTTP {estado}")
    estado, datos = pedir("GET", f"/ventas?buscar={venta['codigo']}", token=admin)
    comprobar("El filtro por numero de venta encuentra el pedido",
              any(v["codigo"] == venta["codigo"] for v in datos.get("ventas", [])))
    hoy = date.today().isoformat()
    estado, datos = pedir("GET", f"/ventas?desde={hoy}&hasta={hoy}", token=admin)
    comprobar("El filtro por fecha responde", estado == 200, f"HTTP {estado}")

    # ------------------------------------------------------ 3. reportes
    print("\n3. Reporte diario y exportaciones")
    estado, datos = pedir("GET", "/reportes/ventas", token=admin)
    comprobar("El reporte diario responde", estado == 200, f"HTTP {estado}")
    comprobar("Trae resumen del periodo",
              all(c in datos.get("resumen", {}) for c in
                  ("total_ventas", "ingresos", "ticket_promedio")))
    comprobar("Incluye la venta recien registrada",
              any(v["codigo"] == venta["codigo"] for v in datos.get("ventas", [])))
    comprobar("Trae el ranking de mas vendidos", "mas_vendidos" in datos)

    estado, contenido, cabeceras = pedir("GET", "/reportes/ventas/pdf", token=admin, crudo=True)
    comprobar("El reporte se descarga en PDF", estado == 200 and contenido[:4] == b"%PDF",
              f"{len(contenido) // 1024} KB")
    comprobar("El PDF viaja como descarga",
              "attachment" in cabeceras.get("content-disposition", ""))
    (DESCARGAS / "reporte-ventas.pdf").write_bytes(contenido)

    estado, contenido, _ = pedir("GET", "/reportes/ventas/excel", token=admin, crudo=True)
    comprobar("El reporte se descarga en Excel",
              estado == 200 and contenido[:2] == b"PK", f"{len(contenido) // 1024} KB")
    (DESCARGAS / "reporte-ventas.xlsx").write_bytes(contenido)

    estado, _ = pedir("GET", "/reportes/ventas", token=cliente)
    comprobar("Un cliente NO puede pedir el reporte", estado == 403, f"HTTP {estado}")

    # ----------------------------------------------------- 4. facturas
    print("\n4. Facturacion")
    estado, datos = pedir("POST", "/facturas", {"id_venta": id_venta}, token=admin)
    factura = datos.get("factura", {})
    comprobar("Se emite la factura de la venta", estado == 201, f"HTTP {estado}")
    comprobar("La factura tiene numero consecutivo",
              (factura.get("numero") or "").startswith("FV-"), factura.get("numero"))
    comprobar("La factura copia cliente, importes y estado",
              all(factura.get(c) is not None for c in
                  ("cliente_nombre", "subtotal", "total", "estado")))

    estado, _ = pedir("POST", "/facturas", {"id_venta": id_venta}, token=admin)
    comprobar("No se puede facturar dos veces la misma venta", estado == 409,
              f"HTTP {estado}")

    id_factura = factura.get("id_factura")
    estado, datos = pedir("GET", f"/facturas?buscar={factura['numero']}", token=admin)
    comprobar("Se consulta la factura por su numero",
              any(f["numero"] == factura["numero"] for f in datos.get("facturas", [])))

    estado, contenido, cabeceras = pedir(
        "GET", f"/facturas/{id_factura}/pdf", token=admin, crudo=True
    )
    comprobar("La factura se descarga en PDF",
              estado == 200 and contenido[:4] == b"%PDF", f"{len(contenido) // 1024} KB")
    comprobar("El PDF lleva el numero de factura en el nombre",
              factura["numero"] in cabeceras.get("content-disposition", ""))
    (DESCARGAS / f"{factura['numero']}.pdf").write_bytes(contenido)

    estado, datos = pedir("GET", "/facturas/mis-facturas", token=cliente)
    comprobar("El cliente ve su propia factura",
              any(f["numero"] == factura["numero"] for f in datos.get("facturas", [])))
    estado, _ = pedir("GET", "/facturas?limite=5", token=cliente)
    comprobar("Un cliente NO puede listar todas las facturas", estado == 403,
              f"HTTP {estado}")

    estado, datos = pedir("PATCH", f"/facturas/{id_factura}/estado",
                          {"estado": "anulada"}, token=admin)
    comprobar("El gestor cambia el estado de la factura", estado == 200, f"HTTP {estado}")
    estado, _ = pedir("PATCH", f"/facturas/{id_factura}/estado",
                      {"estado": "pagada"}, token=admin)
    comprobar("Una factura anulada ya no vuelve atras", estado == 409, f"HTTP {estado}")

    # ---------------------------------------------------- 5. dashboard
    print("\n5. Dashboards")
    estado, datos = pedir("GET", "/dashboard/resumen", token=admin)
    comprobar("El dashboard responde", estado == 200, f"HTTP {estado}")
    comprobar("Trae indicadores de ventas, inventario y usuarios",
              all(c in datos for c in ("ventas", "inventario", "usuarios")))
    comprobar("Trae los indicadores nuevos de facturacion y PQR",
              "facturacion" in datos and "pqr" in datos)
    comprobar("Trae series para los graficos de barras y lineas",
              bool(datos.get("series", {}).get("dias")) and
              bool(datos.get("series", {}).get("meses")))
    estado, _ = pedir("GET", "/dashboard/resumen", token=cliente)
    comprobar("Un cliente NO accede al dashboard administrativo", estado == 403,
              f"HTTP {estado}")

    # ---------------------------------------------------------- 6. PQR
    print("\n6. Modulo de PQR")
    estado, datos = pedir("POST", "/pqr", {
        "tipo": "reclamo",
        "asunto": "El pedido llego con un accesorio de menos",
        "descripcion": "Compre dos articulos y en la caja solo venia uno de ellos.",
        "nombre": "Quinto Avance",
        "email": correo_cliente,
        "telefono": "3140009988",
        "id_venta": id_venta,
    }, token=cliente)
    pqr = datos.get("pqr", {})
    comprobar("El cliente radica una PQR", estado == 201, f"HTTP {estado}")
    comprobar("La PQR recibe numero de radicado",
              (pqr.get("radicado") or "").startswith("PQR-"), pqr.get("radicado"))
    comprobar("Nace en estado pendiente", pqr.get("estado") == "pendiente")

    estado, datos = pedir("GET", f"/pqr/consultar/{pqr['radicado']}")
    comprobar("Se consulta por radicado sin iniciar sesion", estado == 200,
              f"HTTP {estado}")
    comprobar("La consulta publica NO expone el correo del solicitante",
              "cliente_email" not in datos.get("pqr", {}))

    id_pqr = pqr.get("id_pqr")
    estado, datos = pedir("PATCH", f"/pqr/{id_pqr}/estado",
                          {"estado": "en_proceso"}, token=admin)
    comprobar("El gestor mueve la PQR a en proceso", estado == 200, f"HTTP {estado}")

    estado, datos = pedir("POST", f"/pqr/{id_pqr}/responder", {
        "respuesta": "Ya despachamos el accesorio faltante, llega en 24 horas.",
    }, token=admin)
    comprobar("El gestor responde la PQR", estado == 200, f"HTTP {estado}")
    comprobar("Queda registrada la respuesta y quien la dio",
              bool(datos.get("pqr", {}).get("respuesta")) and
              bool(datos.get("pqr", {}).get("responsable")))

    estado, datos = pedir("GET", "/pqr/mis-pqr", token=cliente)
    comprobar("El cliente ve sus propias PQR",
              any(p["radicado"] == pqr["radicado"] for p in datos.get("pqr", [])))
    estado, _ = pedir("GET", "/pqr?limite=5", token=cliente)
    comprobar("Un cliente NO puede listar todas las PQR", estado == 403, f"HTTP {estado}")

    # ----------------------------------------------------- 7. asistente
    print("\n7. Asistente de atencion al cliente")
    estado, datos = pedir("GET", "/chatbot/estado/motor")
    motor = datos.get("motor")
    comprobar("El asistente informa que motor usa", estado == 200 and bool(motor), motor)

    # La marca deja reconocer la charla para que limpiar_datos_prueba la borre.
    estado, datos = pedir("POST", "/chatbot/mensaje",
                          {"mensaje": "Hola, buenas tardes (prueba automatizada)"})
    clave = datos.get("clave")
    comprobar("Responde a un visitante sin cuenta", estado == 200 and bool(clave))
    comprobar("La respuesta no viene vacia",
              len((datos.get("respuesta") or {}).get("contenido", "")) > 20)

    estado, datos = pedir("POST", "/chatbot/mensaje",
                          {"mensaje": "Cuanto cuesta el envio?", "clave": clave})
    texto = (datos.get("respuesta") or {}).get("contenido", "").lower()
    comprobar("Contesta sobre envios con datos reales",
              "envio" in texto or "1.500.000" in texto, texto[:70])

    estado, datos = pedir("POST", "/chatbot/mensaje",
                          {"mensaje": "Quiero poner una queja", "clave": clave})
    texto = (datos.get("respuesta") or {}).get("contenido", "").lower()
    comprobar("Orienta sobre como radicar una PQR",
              "pqr" in texto or "radicado" in texto, texto[:70])

    estado, datos = pedir("GET", f"/chatbot/{clave}")
    comprobar("Se recupera la conversacion completa",
              estado == 200 and len(datos.get("conversacion", {}).get("mensajes", [])) >= 6,
              f"{len(datos.get('conversacion', {}).get('mensajes', []))} turnos")

    print(f"\n{GRIS}  Descargas guardadas en {DESCARGAS}{FIN}")
    terminar()


if __name__ == "__main__":
    main()
