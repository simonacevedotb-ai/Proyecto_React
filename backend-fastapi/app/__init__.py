"""Paquete principal del backend FastAPI de PhoneStore.

La consola de Windows usa por defecto la codificación cp1252, que no
puede imprimir tildes ni emojis: cualquier print con "✅" o "Catálogo"
lanzaba UnicodeEncodeError y tumbaba el script. Aquí se fuerza UTF-8 en
la salida estándar una sola vez, para que todos los scripts y mensajes
del servidor se vean bien en cmd, PowerShell y Git Bash.
"""

import sys

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):  # flujo redirigido o sin soporte
        pass
