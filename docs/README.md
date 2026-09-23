# Documentación de la entrega — PhoneStore

**Cuarto avance:** Desarrollo de una aplicación web con React + Vite y FastAPI
**Ficha:** 3406211 · Trimestre 03 · Ambiente 702
**Instructor:** Jhan Hader Muñoz

---

## Los seis entregables de la matriz

| # | Entregable | Documento | Estado |
|---|-----------|-----------|--------|
| 1 | Lista de chequeo preliminar | [01-lista-chequeo-preliminar.md](01-lista-chequeo-preliminar.md) | 89 de 90 requisitos cumplidos (1 no aplica) |
| 2 | Matriz de validaciones (funcionalidad) | [02-matriz-validaciones.md](02-matriz-validaciones.md) | Reglas por campo en las 4 capas |
| 3 | ¿Requiere pasarela de pagos? | [03-pasarela-de-pagos.md](03-pasarela-de-pagos.md) | **N** — justificado |
| 4 | CI/CD | [04-ci-cd.md](04-ci-cd.md) · [`ci.yml`](../.github/workflows/ci.yml) | 3 trabajos automáticos en GitHub Actions |
| 5 | Evidencia de pruebas de APIs | [evidencia_pruebas_api.md](../backend-fastapi/tests/evidencia_pruebas_api.md) | 87 pruebas, 87 superadas |
| 6 | Manual técnico | [05-manual-tecnico.md](05-manual-tecnico.md) | Instalación, arquitectura, API, seguridad y mantenimiento |
| 7 | Correos y verificación en dos pasos | [06-correos-y-doble-factor.md](06-correos-y-doble-factor.md) | Correos del sistema, cómo comprobarlos y segundo paso del login |
| 8 | Quinto avance | [07-quinto-avance.md](07-quinto-avance.md) | Facturación, reportes en PDF y Excel, PQR, asistente y despliegue |
| 9 | Comparativa técnica | [08-comparativa-fastapi-drf.md](08-comparativa-fastapi-drf.md) | FastAPI frente a Django REST Framework, aplicado a este proyecto |
| 10 | Matriz de validación técnica | [09-matriz-validacion-tecnica.md](09-matriz-validacion-tecnica.md) | Evidencia de los 24 criterios del instructor, uno por uno |
| 11 | Normalización de la base de datos | [10-normalizacion-base-datos.md](10-normalizacion-base-datos.md) | 1FN, 2FN, 3FN y las dos excepciones documentadas (ventas y facturas) |
| 12 | Conceptos y principios de POO | [11-conceptos-poo.md](11-conceptos-poo.md) | Objeto, clase, herencia y polimorfismo con código real del proyecto |

---

## Por dónde empezar

| Si quieres… | Ve a |
|-------------|------|
| Instalar y ejecutar el proyecto | [Manual técnico § 4](05-manual-tecnico.md#4-instalación-paso-a-paso) |
| Ver qué requisitos de la guía se cumplen | [Lista de chequeo](01-lista-chequeo-preliminar.md) |
| Entender cómo se valida cada campo | [Matriz de validaciones](02-matriz-validaciones.md) |
| Consultar los endpoints | [Manual técnico § 7](05-manual-tecnico.md#7-referencia-de-la-api) o `http://localhost:3000/docs` |
| Revisar las medidas de seguridad | [Manual técnico § 8](05-manual-tecnico.md#8-seguridad) |
| Configurar el envío de correos | [Correos § 4](06-correos-y-doble-factor.md#4-enviar-a-buzones-reales) |
| Entender la verificación en dos pasos | [Correos § 5](06-correos-y-doble-factor.md#5-verificación-en-dos-pasos) |
| Reproducir las pruebas | `cd backend-fastapi && pytest` (unitarias) o `python -m tests.pruebas_api` (punta a punta) |
| Comparar FastAPI con Django REST | [Comparativa](08-comparativa-fastapi-drf.md) |

---

## Resumen del proyecto

PhoneStore es una tienda virtual completa: catálogo con filtros, carrito
con validación de stock, compra que se registra en la base de datos y
descuenta inventario dentro de una transacción, agendamiento real de
servicios técnicos, y un panel administrativo con dashboard, reportes y
gestión de todas las entidades.

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 |
| Backend | Python 3 · FastAPI · SQLAlchemy 2 · Pydantic 2 |
| Autenticación | JWT (python-jose) · bcrypt (passlib) |
| Base de datos | MySQL 8 / MariaDB 10.4 |
| Integración continua | GitHub Actions |

| Cifra | Valor |
|-------|-------|
| Endpoints | 51 |
| Tablas | 13 |
| Pruebas automatizadas | 87 (todas superadas) |
| Errores de ESLint | 0 |
| Roles | 3 (administrador, empleado, cliente) |
