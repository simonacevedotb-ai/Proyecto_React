"""Pruebas automatizadas de la API de PhoneStore.

Igual que en app/__init__.py, se fuerza UTF-8 en la salida estándar para
que la consola de Windows (cp1252) pueda imprimir tildes y símbolos sin
lanzar UnicodeEncodeError.
"""

import sys

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
