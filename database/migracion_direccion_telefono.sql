-- Migración: ampliar longitud de columnas en la tabla usuarios.
--
-- Motivo: se ajustaron las validaciones de "dirección" (10-150 caracteres,
-- antes 5-80) y "teléfono" (7-15 dígitos, antes 7-10) para admitir
-- direcciones y números de teléfono reales sin ser excesivamente largos.
--
-- Este script solo es necesario si tu base de datos "phonestore" ya
-- existía de antes (creada con la versión anterior de database/phonestore.sql).
-- Si vas a crear la base de datos desde cero, NO necesitas correr esto:
-- el script phonestore.sql ya incluye las columnas con el tamaño correcto.
--
-- Uso:
--   mysql -u root -p phonestore < database/migracion_direccion_telefono.sql

ALTER TABLE usuarios
  MODIFY COLUMN direccion VARCHAR(150) NOT NULL,
  MODIFY COLUMN telefono VARCHAR(15) NOT NULL;
