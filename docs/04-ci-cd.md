# CI/CD — Integración y entrega continuas

**Proyecto:** PhoneStore — React + Vite + FastAPI + MySQL
**Herramienta:** GitHub Actions
**Definición del flujo:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

---

## 1. Qué resuelve

Sin integración continua, un error solo se descubre cuando alguien lo
ejecuta a mano. Con ella, cada cambio que se sube al repositorio se
compila y se prueba automáticamente contra una base de datos real. Si algo
se rompe, GitHub marca el commit en rojo antes de que el problema llegue
al resto del equipo o a la entrega.

## 2. Cuándo se ejecuta

| Disparador | Ramas |
|-----------|-------|
| `push` | `main`, `master`, `develop` |
| `pull_request` | `main`, `master`, `develop` |
| Manual (`workflow_dispatch`) | Cualquiera, desde la pestaña *Actions* |

## 3. Los tres trabajos

Se ejecutan en paralelo, así que el resultado completo llega en pocos
minutos.

### 3.1 `backend` — API y pruebas

Levanta un **MySQL 8 real** como servicio del contenedor, no un simulador.

| Paso | Qué hace | Falla si… |
|------|----------|-----------|
| 1 | Descarga el código | — |
| 2 | Instala Python 3.12 con caché de `pip` | — |
| 3 | Instala `requirements.txt` | Falta una dependencia o hay un conflicto de versiones |
| 4 | Ejecuta `database/phonestore.sql` sobre el MySQL limpio | El script SQL tiene un error de sintaxis o de orden |
| 5 | Importa `app.main` | Hay un error de importación o de sintaxis en Python |
| 6 | Corre `seed_admin` y `seed_demo` | Los scripts de datos iniciales fallan |
| 7 | Levanta uvicorn y espera a `/api/health` | La API no arranca en 30 segundos |
| 8 | Ejecuta las 87 pruebas de la API | Cualquier prueba falla |
| 9 | Guarda la evidencia como artefacto descargable | — |

Este trabajo comprueba de una sola pasada que el script SQL funciona
desde cero, que el backend arranca y que toda la funcionalidad responde
como debe.

### 3.2 `frontend` — Linter y compilación

| Paso | Qué hace | Falla si… |
|------|----------|-----------|
| 1 | Instala Node 20 con caché de `npm` | — |
| 2 | `npm ci` (instalación reproducible desde el lockfile) | El lockfile no coincide con `package.json` |
| 3 | `npm run lint` | ESLint encuentra un solo error |
| 4 | `npm run build` | La compilación de producción falla |
| 5 | Guarda `dist/` como artefacto | — |

El artefacto `frontend-dist` es la carpeta lista para publicar: se puede
descargar y subir a cualquier hosting estático.

### 3.3 `seguridad` — Revisión básica

| Comprobación | Por qué importa |
|--------------|-----------------|
| Ningún archivo `.env` versionado | Un `.env` en el repositorio filtra la contraseña de la base de datos y la clave del JWT |
| Sin credenciales escritas en el código | Busca `JWT_SECRET`, `DB_PASSWORD` o `SMTP_PASSWORD` asignados a un texto literal en `.py`, `.js` y `.jsx` |
| `npm audit --audit-level=high` | Avisa de vulnerabilidades conocidas en las dependencias |

Las dos primeras hacen fallar la ejecución. La auditoría solo informa,
porque muchas alertas vienen de dependencias de desarrollo que no llegan
al navegador.

## 4. Variables y secretos

El flujo no necesita ningún secreto configurado en GitHub: usa una base
de datos desechable creada dentro del propio contenedor.

| Variable | Valor en CI | Por qué es seguro |
|----------|-------------|-------------------|
| `DB_PASSWORD` | `root` | Base efímera que se destruye al terminar |
| `JWT_SECRET` | Clave de prueba | No firma ninguna sesión real |
| `RATE_LIMIT_ENABLED` | `false` | Permite que las 87 pruebas corran seguidas sin toparse con el límite anti-fuerza-bruta |
| `ADMIN_PASSWORD` | `Admin1234` | Solo existe dentro de la ejecución |

Si más adelante se añade un despliegue automático, las credenciales
reales irían en *Settings → Secrets and variables → Actions*, nunca en el
archivo YAML.

## 5. Cómo leer el resultado

1. Entra a la pestaña **Actions** del repositorio.
2. Abre la ejecución correspondiente al commit.
3. Verde en los tres trabajos: el cambio es seguro.
4. Rojo en alguno: abre el trabajo, despliega el paso que falló y lee el
   registro. El mensaje señala el archivo y la línea.
5. En **Artifacts** se descargan `evidencia-pruebas-api` (el informe de
   las 87 pruebas) y `frontend-dist` (la compilación).

## 6. Reproducir el mismo flujo en local

Antes de subir un cambio, estos cuatro comandos reproducen exactamente lo
que hará el CI:

```bash
cd proyecto-react/frontend && npm run lint
```

```bash
cd proyecto-react/frontend && npm run build
```

```bash
cd proyecto-react/backend-fastapi && python -m uvicorn app.main:app --port 3000
```

```bash
cd proyecto-react/backend-fastapi && python -m tests.pruebas_api
```

## 7. Sobre la parte de entrega (CD)

El flujo actual cubre la **integración** continua: compila, prueba y deja
el resultado listo para publicar. No incluye despliegue automático a un
servidor porque el proyecto es académico y se ejecuta en local.

Cuando haga falta, la extensión natural sería añadir un cuarto trabajo
`deploy` que se ejecute solo cuando los tres anteriores estén en verde y
la rama sea `main`:

| Componente | Destino habitual | Qué necesita |
|-----------|------------------|--------------|
| Frontend (`dist/`) | Netlify, Vercel o GitHub Pages | Un token del proveedor como secreto |
| Backend (FastAPI) | Render, Railway o un VPS con Docker | Variables de entorno de producción |
| Base de datos | MySQL gestionado | Ejecutar `phonestore.sql` una vez y guardar la cadena de conexión |

Los tres pasos son aditivos: no requieren cambiar nada de lo ya
construido.

## 8. Estado actual

| Trabajo | Comprobaciones | Estado local |
|---------|----------------|--------------|
| backend | 9 pasos, 87 pruebas | 87/87 superadas |
| frontend | ESLint + compilación | 0 errores, 0 advertencias; compila en menos de 1 s |
| seguridad | 3 comprobaciones | Sin `.env` versionados, sin credenciales en el código |
