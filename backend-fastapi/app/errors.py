# Excepción de aplicación con forma de respuesta consistente.
# Equivale a lanzar un error con .status en los controladores de Node
# y que termine en middleware/errorHandler.js

from typing import Optional


class AppError(Exception):
    def __init__(self, status_code: int, message: str, errors: Optional[dict] = None):
        self.status_code = status_code
        self.message = message
        self.errors = errors
        super().__init__(message)
