import { Link, Navigate, useParams } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useReveal } from "../hooks/useReveal";

/**
 * Páginas legales y de soporte de la tienda.
 *
 * Todas comparten el mismo diseño y navegación lateral; el contenido se
 * elige con el parámetro de la URL (/politicas/:seccion). Así los
 * enlaces del footer llevan a información real y no a un enlace muerto.
 */
const CONTENIDO = {
  garantias: {
    icono: "escudo",
    titulo: "Política de garantías",
    resumen:
      "Cómo funciona la garantía de los equipos y las reparaciones que hacemos en nuestro taller.",
    bloques: [
      {
        titulo: "Cobertura",
        parrafos: [
          "Todos los equipos nuevos vendidos por PhoneStore tienen 12 meses de garantía contra defectos de fábrica, contados desde la fecha de entrega registrada en el pedido.",
          "Los accesorios (cargadores, cables, fundas y audífonos) tienen 6 meses de garantía. Las reparaciones realizadas en nuestro taller tienen 3 meses de garantía sobre el repuesto instalado y la mano de obra.",
        ],
      },
      {
        titulo: "Qué cubre",
        lista: [
          "Fallas de fábrica en pantalla, batería, placa, cámara, altavoces y botones.",
          "Defectos de software originados en el sistema operativo instalado de fábrica.",
          "Repuestos instalados por nuestro taller que presenten fallas dentro del periodo cubierto.",
        ],
      },
      {
        titulo: "Qué no cubre",
        lista: [
          "Daños por golpes, caídas o presión sobre la pantalla.",
          "Contacto con líquidos o humedad, salvo en equipos con certificación oficial de resistencia y dentro de sus límites.",
          "Equipos abiertos o intervenidos por terceros no autorizados.",
          "Desgaste normal por uso, como rayones en la carcasa o reducción gradual de la autonomía de la batería.",
        ],
      },
      {
        titulo: "Cómo hacerla efectiva",
        parrafos: [
          "Escríbenos desde la página de contacto o agenda un diagnóstico técnico indicando el número de pedido. Revisamos el equipo sin costo y te informamos si la falla está cubierta antes de intervenirlo.",
          "Si la garantía aplica, reparamos o reemplazamos el equipo sin costo. Si no aplica, te entregamos una cotización que puedes aceptar o rechazar libremente.",
        ],
      },
    ],
  },

  envios: {
    icono: "camion",
    titulo: "Envíos y entregas",
    resumen: "Tiempos, costos y cobertura de los despachos a todo el país.",
    bloques: [
      {
        titulo: "Costos",
        parrafos: [
          "El envío es gratis en pedidos iguales o superiores a $1.500.000. Por debajo de ese monto se aplica una tarifa plana de $15.000 a cualquier destino del país.",
          "El costo se calcula automáticamente en el carrito y se confirma en el servidor al registrar el pedido, así que el valor que ves es el valor que pagas.",
        ],
      },
      {
        titulo: "Tiempos de entrega",
        lista: [
          "Medellín y área metropolitana: 24 horas hábiles.",
          "Ciudades principales: 24 a 48 horas hábiles.",
          "Municipios y zonas rurales: 3 a 5 días hábiles.",
          "Los pedidos confirmados después de las 2:00 p. m. se despachan al día hábil siguiente.",
        ],
      },
      {
        titulo: "Seguimiento",
        parrafos: [
          "Cada pedido tiene un código propio (por ejemplo PS-20260908-1234) y un estado que puedes consultar en cualquier momento desde la sección Mis pedidos de tu cuenta.",
          "Los estados son: pendiente, pagada, enviada, entregada o cancelada. Cada cambio queda registrado en la base de datos con su fecha.",
        ],
      },
      {
        titulo: "Recepción del pedido",
        parrafos: [
          "Revisa el empaque delante del mensajero. Si notas daños o el sello está roto, no lo recibas y contáctanos de inmediato: reponemos el envío sin costo.",
          "En pago contra entrega, el mensajero recibe el valor exacto del pedido en efectivo.",
        ],
      },
    ],
  },

  terminos: {
    icono: "documento",
    titulo: "Términos y condiciones",
    resumen: "Las reglas que aplican al usar la tienda y comprar en ella.",
    bloques: [
      {
        titulo: "Aceptación",
        parrafos: [
          "Al crear una cuenta, realizar un pedido o agendar un servicio en PhoneStore aceptas estos términos. Si no estás de acuerdo con alguno, te pedimos no usar la plataforma.",
        ],
      },
      {
        titulo: "Cuentas de usuario",
        lista: [
          "Los datos que registres deben ser verdaderos y estar actualizados.",
          "Eres responsable de mantener tu contraseña en secreto y de la actividad realizada desde tu cuenta.",
          "Podemos desactivar cuentas que incumplan estos términos o que registren información falsa.",
          "Las cuentas nuevas se crean siempre con rol de cliente. Los roles de empleado y administrador solo los asigna un administrador desde el panel.",
        ],
      },
      {
        titulo: "Pedidos y precios",
        parrafos: [
          "Los precios están en pesos colombianos e incluyen impuestos. El precio y el stock definitivos se validan en el servidor al confirmar el pedido, no en el navegador.",
          "Un pedido registrado no implica que el producto esté reservado indefinidamente: si detectamos un error evidente de precio o falta de existencias, te contactamos antes de despachar y puedes cancelarlo sin costo.",
        ],
      },
      {
        titulo: "Cambios y devoluciones",
        parrafos: [
          "Tienes 5 días hábiles desde la entrega para solicitar un cambio, siempre que el producto conserve empaque, accesorios y no presente daños por uso indebido.",
          "El derecho de retracto se aplica según la normativa colombiana vigente de protección al consumidor.",
        ],
      },
      {
        titulo: "Uso permitido",
        lista: [
          "No está permitido intentar acceder a áreas administrativas sin autorización.",
          "No está permitido manipular precios, cantidades o identificadores en las peticiones a la API.",
          "No está permitido automatizar compras masivas ni saturar los formularios de la tienda.",
        ],
      },
    ],
  },

  privacidad: {
    icono: "candado",
    titulo: "Política de privacidad",
    resumen: "Qué datos guardamos, para qué los usamos y cómo los protegemos.",
    bloques: [
      {
        titulo: "Datos que recogemos",
        lista: [
          "Datos de registro: nombre, apellido, tipo y número de documento, dirección, teléfono y correo.",
          "Datos de tus pedidos: productos comprados, cantidades, precios del momento de la compra y dirección de envío.",
          "Datos de tus solicitudes de servicio y de los mensajes que nos envías por el formulario de contacto.",
        ],
      },
      {
        titulo: "Para qué los usamos",
        lista: [
          "Procesar tus pedidos y entregarlos en la dirección indicada.",
          "Atender tus solicitudes de servicio técnico y responder tus mensajes.",
          "Emitir facturas y cumplir las obligaciones legales de la tienda.",
          "Enviarte novedades, únicamente si te suscribiste al boletín.",
        ],
      },
      {
        titulo: "Cómo protegemos tu información",
        parrafos: [
          "Las contraseñas nunca se guardan en texto plano: se almacenan cifradas con bcrypt y no pueden recuperarse, ni siquiera por un administrador.",
          "El acceso a la información administrativa está protegido con autenticación por token (JWT) y control de roles verificado en el servidor, no solo en la interfaz.",
          "Los textos que envías se limpian antes de guardarse para evitar la inyección de código, y las consultas a la base de datos usan parámetros, lo que impide la inyección SQL.",
        ],
      },
      {
        titulo: "Tus derechos",
        parrafos: [
          "Puedes consultar y actualizar tus datos personales en cualquier momento desde tu perfil. Si quieres que eliminemos tu cuenta, escríbenos desde la página de contacto.",
          "Ten en cuenta que la información de pedidos ya facturados se conserva por obligación legal y contable, incluso si desactivas tu cuenta.",
        ],
      },
    ],
  },

  soporte: {
    icono: "chat",
    titulo: "Centro de soporte",
    resumen: "Respuestas rápidas a las dudas más frecuentes.",
    bloques: [
      {
        titulo: "¿Cómo sigo mi pedido?",
        parrafos: [
          "Inicia sesión y entra a Mis pedidos. Allí verás el código, la fecha, los productos, el total y el estado actual de cada compra.",
        ],
      },
      {
        titulo: "¿Puedo cambiar la dirección después de comprar?",
        parrafos: [
          "Sí, siempre que el pedido siga en estado pendiente o pagada. Escríbenos desde la página de contacto indicando el código del pedido y la nueva dirección.",
        ],
      },
      {
        titulo: "¿Qué hago si un producto llegó con falla?",
        parrafos: [
          "Contáctanos dentro de los primeros 5 días hábiles. Agendamos un diagnóstico sin costo y, si la falla está cubierta por la garantía, reparamos o reemplazamos el equipo.",
        ],
      },
      {
        titulo: "Olvidé mi contraseña",
        parrafos: [
          "En la pantalla de inicio de sesión elige “¿Olvidaste tu contraseña?”. Te enviamos un enlace de un solo uso que caduca en 30 minutos.",
        ],
      },
      {
        titulo: "¿Cómo agendo una reparación?",
        parrafos: [
          "Entra a la sección Servicios, elige el que necesitas y pulsa “Agendar este servicio”. Recibirás un código de seguimiento y te contactaremos para confirmar la cita.",
        ],
      },
    ],
  },
};

const SECCIONES = [
  { slug: "garantias", label: "Garantías" },
  { slug: "envios", label: "Envíos y entregas" },
  { slug: "terminos", label: "Términos y condiciones" },
  { slug: "privacidad", label: "Privacidad" },
  { slug: "soporte", label: "Centro de soporte" },
];

function Politicas() {
  const { seccion } = useParams();
  useReveal([seccion]);

  const datos = CONTENIDO[seccion];
  if (!datos) return <Navigate to="/politicas/garantias" replace />;

  return (
    <div className="bg-dark-900 pb-16">
      <div className="border-b border-white/10 bg-dark-900">
        <div className="mx-auto w-[94%] max-w-7xl py-10">
          <nav aria-label="Ruta" className="mb-3 flex items-center gap-1.5 text-xs text-white/40">
            <Link to="/" className="transition-colors hover:text-brand-500">
              Inicio
            </Link>
            <Icon name="chevronDerecha" className="h-3 w-3" />
            <span className="font-medium text-white/60">{datos.titulo}</span>
          </nav>

          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <Icon name={datos.icono} className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {datos.titulo}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-white/50">{datos.resumen}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-[94%] max-w-7xl py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-64 lg:shrink-0">
            <nav
              aria-label="Secciones legales"
              className="sticky top-[calc(var(--altura-header)+16px)] flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-dark-900 p-2 scroll-oculto lg:flex-col lg:overflow-visible lg:p-3"
            >
              {SECCIONES.map((s) => (
                <Link
                  key={s.slug}
                  to={`/politicas/${s.slug}`}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    s.slug === seccion
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-white/60 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 flex-1 space-y-5">
            {datos.bloques.map((bloque, i) => (
              <section
                key={bloque.titulo}
                className={`reveal reveal-d${Math.min(i + 1, 5)} rounded-2xl border border-white/10 bg-dark-900 p-6 sm:p-7`}
              >
                <h2 className="mb-3 text-lg font-bold text-white">{bloque.titulo}</h2>

                {bloque.parrafos?.map((parrafo, j) => (
                  <p key={j} className="mb-3 text-sm leading-relaxed text-white/60 last:mb-0">
                    {parrafo}
                  </p>
                ))}

                {bloque.lista && (
                  <ul className="space-y-2">
                    {bloque.lista.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/60">
                        <Icon
                          name="check"
                          className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-500"
                          strokeWidth={2.5}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="reveal rounded-2xl bg-dark-900 p-6 text-center text-white sm:p-8">
              <h2 className="mb-2 text-lg font-bold">¿Te quedó alguna duda?</h2>
              <p className="mb-5 text-sm text-white/30">
                Escríbenos y te respondemos en menos de 24 horas hábiles.
              </p>
              <Link
                to="/contacto"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Icon name="chat" className="h-4 w-4" />
                Ir a contacto
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default Politicas;
