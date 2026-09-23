import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { facturaService } from "../../services/facturaService";
import { formatoFecha, formatoPrecio } from "../../utils/formato";

const ESTADOS = {
  emitida: { texto: "Emitida", clase: "bg-amber-500/15 text-amber-400" },
  pagada: { texto: "Pagada", clase: "bg-emerald-500/15 text-emerald-400" },
  anulada: { texto: "Anulada", clase: "bg-white/10 text-white/45" },
};

/** Facturas del cliente, con descarga en PDF. */
function MisFacturas() {
  const toast = useToast();

  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    let vivo = true;

    async function pedirFacturas() {
      try {
        const lista = await facturaService.misFacturas();
        if (vivo) setFacturas(lista);
      } catch (fallo) {
        if (vivo) setError(fallo.message || "No se pudieron cargar tus facturas.");
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirFacturas();
    return () => {
      vivo = false;
    };
  }, []);

  const descargar = async (factura) => {
    setDescargando(factura.id_factura);
    try {
      await facturaService.descargarPDF(factura.id_factura, factura.numero);
      toast.exito(`Descargando ${factura.numero}.pdf`);
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo descargar la factura.");
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Mis facturas</h1>
        <p className="text-sm text-white/50">
          Aquí quedan las facturas de tus compras. Puedes descargarlas cuando quieras.
        </p>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : facturas.length === 0 ? (
        <EmptyState
          icono="recibo"
          titulo="Todavía no tienes facturas"
          descripcion="Cuando confirmemos una compra tuya, su factura aparecerá aquí."
        >
          <Button to="/productos" icono="carrito">
            Ver el catálogo
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {facturas.map((f) => {
            const estado = ESTADOS[f.estado] || ESTADOS.emitida;
            return (
              <li
                key={f.id_factura}
                className="flex flex-col gap-4 border border-white/10 bg-dark-900 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white">
                      {f.numero}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>
                  </div>

                  <p className="text-xs text-white/45">
                    {formatoFecha(f.creado_en)}
                    {f.codigo_venta && (
                      <>
                        {" · "}
                        <Link
                          to="/cliente/pedidos"
                          className="text-brand-500 hover:underline"
                        >
                          Pedido {f.codigo_venta}
                        </Link>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-white/35">
                      Total
                    </p>
                    <p className="text-lg font-bold text-white">
                      {formatoPrecio(f.total)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    icono="descargar"
                    cargando={descargando === f.id_factura}
                    onClick={() => descargar(f)}
                  >
                    PDF
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/40">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
        Si una factura tiene un dato equivocado, radica una{" "}
        <Link to="/pqr" className="text-brand-500 hover:underline">
          PQR
        </Link>{" "}
        y la corregimos.
      </p>
    </div>
  );
}

export default MisFacturas;
