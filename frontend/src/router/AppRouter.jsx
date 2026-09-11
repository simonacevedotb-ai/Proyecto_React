import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";

import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import WhatsAppButton from "../components/WhatsAppButton";

import ClienteLayout from "../layouts/ClienteLayout";
import ProtectedRoute from "./ProtectedRoute";

// Páginas públicas
import Checkout from "../pages/Checkout";
import Contacto from "../pages/Contacto";
import Index from "../pages/Index";
import Login from "../pages/Login";
import NoEncontrada from "../pages/NoEncontrada";
import Politicas from "../pages/Politicas";
import ProductoDetalle from "../pages/ProductoDetalle";
import Productos from "../pages/Productos";
import RecuperarContrasena from "../pages/RecuperarContrasena";
import QuienesSomos from "../pages/QuienesSomos";
import RestablecerPassword from "../pages/RestablecerPassword";
import Servicios from "../pages/Servicios";
import VerificarCorreo from "../pages/VerificarCorreo";

// Área del cliente
import ClienteResumen from "../pages/cliente/ClienteResumen";
import MiPerfil from "../pages/cliente/MiPerfil";
import MisPedidos from "../pages/cliente/MisPedidos";
import MisSolicitudes from "../pages/cliente/MisSolicitudes";

// Panel administrativo: se carga bajo demanda (code splitting).
// Un cliente que solo compra nunca descarga el código del panel, así la
// tienda arranca con un archivo mucho más pequeño.
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminProductos = lazy(() => import("../pages/admin/AdminProductos"));
const AdminCategorias = lazy(() => import("../pages/admin/AdminCategorias"));
const AdminServicios = lazy(() => import("../pages/admin/AdminServicios"));
const AdminInventario = lazy(() => import("../pages/admin/AdminInventario"));
const AdminVentas = lazy(() => import("../pages/admin/AdminVentas"));
const AdminSolicitudes = lazy(() => import("../pages/admin/AdminSolicitudes"));
const AdminMensajes = lazy(() => import("../pages/admin/AdminMensajes"));
const AdminUsuarios = lazy(() => import("../pages/admin/AdminUsuarios"));
const AdminReportes = lazy(() => import("../pages/admin/AdminReportes"));
const AdminConfiguracion = lazy(() => import("../pages/admin/AdminConfiguracion"));

const ROLES_GESTOR = ["administrador", "empleado"];
const TODOS_LOS_ROLES = ["administrador", "empleado", "cliente"];

/** Al cambiar de página, vuelve arriba (excepto si la URL trae un ancla). */
function VolverArriba() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname, hash]);

  return null;
}

/** Indicador mientras se descarga el código de una sección diferida. */
function CargandoSeccion() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-white/50">
      <span className="h-8 w-8 animate-[girar_.7s_linear_infinite] rounded-full border-2 border-brand-500 border-t-transparent" />
      <p className="text-sm">Cargando el panel...</p>
    </div>
  );
}

/**
 * Envoltorio de la tienda pública: encabezado fijo, contenido, pie de
 * página, carrito y botón de WhatsApp.
 *
 * `con-header-fijo` reserva la altura del encabezado para que este nunca
 * tape el contenido.
 */
function LayoutTienda() {
  return (
    <div className="flex min-h-screen flex-col bg-dark-900">
      <Header />
      <main className="con-header-fijo flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton phone="573147728502" />
      <CartDrawer />
    </div>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <VolverArriba />
      <ToastContainer />

      <Routes>
        {/* ---------- Tienda pública ---------- */}
        <Route element={<LayoutTienda />}>
          <Route path="/" element={<Index />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:id" element={<ProductoDetalle />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/quienes-somos" element={<QuienesSomos />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/politicas/:seccion" element={<Politicas />} />
          <Route path="/login" element={<Login />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
          <Route path="/verificar-correo" element={<VerificarCorreo />} />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute roles={TODOS_LOS_ROLES}>
                <Checkout />
              </ProtectedRoute>
            }
          />

          {/* Área privada del cliente (mantiene el encabezado de la tienda) */}
          <Route
            path="/cliente"
            element={
              <ProtectedRoute roles={TODOS_LOS_ROLES}>
                <ClienteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClienteResumen />} />
            <Route path="pedidos" element={<MisPedidos />} />
            <Route path="solicitudes" element={<MisSolicitudes />} />
            <Route path="perfil" element={<MiPerfil />} />
          </Route>

          <Route path="*" element={<NoEncontrada />} />
        </Route>

        {/* ---------- Panel administrativo (entorno propio) ---------- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={ROLES_GESTOR}>
              <Suspense fallback={<CargandoSeccion />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<CargandoSeccion />}><Dashboard /></Suspense>} />
          <Route path="productos" element={<Suspense fallback={<CargandoSeccion />}><AdminProductos /></Suspense>} />
          <Route path="categorias" element={<Suspense fallback={<CargandoSeccion />}><AdminCategorias /></Suspense>} />
          <Route path="servicios" element={<Suspense fallback={<CargandoSeccion />}><AdminServicios /></Suspense>} />
          <Route path="inventario" element={<Suspense fallback={<CargandoSeccion />}><AdminInventario /></Suspense>} />
          <Route path="ventas" element={<Suspense fallback={<CargandoSeccion />}><AdminVentas /></Suspense>} />
          <Route path="solicitudes" element={<Suspense fallback={<CargandoSeccion />}><AdminSolicitudes /></Suspense>} />
          <Route path="mensajes" element={<Suspense fallback={<CargandoSeccion />}><AdminMensajes /></Suspense>} />
          <Route path="reportes" element={<Suspense fallback={<CargandoSeccion />}><AdminReportes /></Suspense>} />

          {/* Solo administrador */}
          <Route
            path="usuarios"
            element={
              <ProtectedRoute roles={["administrador"]}>
                <Suspense fallback={<CargandoSeccion />}>
                  <AdminUsuarios />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="configuracion"
            element={
              <ProtectedRoute roles={ROLES_GESTOR}>
                <Suspense fallback={<CargandoSeccion />}>
                  <AdminConfiguracion />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
