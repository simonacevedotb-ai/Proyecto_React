# Frontend — PhoneStore

Interfaz de la tienda, construida con **React 19 + Vite 8 + Tailwind CSS 4**
y **React Router 7**.

Consume la API de FastAPI que vive en `../backend-fastapi`.

---

## Comandos

```bash
npm install
```

```bash
npm run dev
```

Abre `http://localhost:5173`. El backend debe estar corriendo en el
puerto 3000.

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación para revisarla |
| `npm run lint` | ESLint (debe terminar con 0 errores) |

## Configuración

Copia `.env.example` como `.env`:

```
VITE_API_URL=http://localhost:3000/api
```

Si cambias el puerto del backend, ajústalo aquí y también en
`CORS_ORIGINS` del `.env` del backend.

## Cómo está organizado

```
src/
├── components/
│   ├── ui/        Componentes base: Button, Input, Select, Textarea,
│   │              Modal, Badge, Alert, Skeleton, Pagination,
│   │              EmptyState, ConfirmDialog, Icon
│   ├── home/      Secciones de la portada
│   ├── tienda/    Tarjeta de producto, agendamiento de servicios
│   └── admin/     Gráficas SVG y piezas del panel
├── context/       AuthContext (sesión), CartContext (carrito),
│                  ToastContext (avisos)
├── hooks/         useForm, useDebounce, useReveal
├── layouts/       AdminLayout, ClienteLayout
├── pages/         Públicas, del cliente y del panel administrativo
├── router/        Rutas y protección por rol
├── services/      Un cliente por módulo de la API
└── utils/         Formateadores, validadores e iconos
```

### Proveedores

```
ToastProvider → AuthProvider → CartProvider → AppRouter
```

El orden importa: el carrito y la sesión emiten avisos, así que el
proveedor de avisos debe envolverlos.

### Rendimiento

- El panel administrativo se carga bajo demanda (`React.lazy`): quien solo
  compra no descarga ese código.
- Las animaciones usan únicamente `opacity` y `transform`, y respetan
  `prefers-reduced-motion`.
- Los iconos son SVG en línea: cero peticiones de red.
- Las gráficas del dashboard son SVG generado a mano, sin librería.

### Validación

`hooks/useForm.js` valida mientras el usuario escribe, con las reglas de
`utils/validations.js`. Esa validación es solo comodidad: **el backend
vuelve a validar todo**, y sus errores se pintan sobre el campo
correspondiente.

---

Documentación completa del proyecto en [`../docs/`](../docs/README.md).
