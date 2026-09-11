-- =========================================================
--  PhoneStore - Script completo de creación de base de datos
--  Motor: MySQL 8+ / MariaDB 10.4+
--  Proyecto React + Vite + FastAPI (SENA - Ficha 3406211)
--
--  Este script es IDEMPOTENTE: se puede ejecutar varias veces
--  sobre la misma base sin duplicar datos ni romper llaves.
--
--  Uso:
--    mysql -u root -p < database/phonestore.sql
-- =========================================================

CREATE DATABASE IF NOT EXISTS phonestore
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE phonestore;

-- =========================================================
--  1. SEGURIDAD Y ACCESO (roles, permisos, usuarios)
-- =========================================================

-- ---------------------------------------------------------
-- Tabla: roles
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(150) NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: permisos
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS permisos (
  id_permiso INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  descripcion VARCHAR(150) NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: rol_permisos (relación N:M entre roles y permisos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol_permisos (
  id_rol INT NOT NULL,
  id_permiso INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  CONSTRAINT fk_rolperm_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rolperm_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: usuarios
--   La contraseña se guarda SIEMPRE hasheada (bcrypt) desde
--   el backend. Nunca en texto plano.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  tipo_documento ENUM('CC', 'TI', 'CE', 'PA') NOT NULL,
  numero_documento VARCHAR(12) NOT NULL UNIQUE,
  direccion VARCHAR(150) NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  email_verificado TINYINT(1) NOT NULL DEFAULT 0,
  doble_factor TINYINT(1) NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INT NOT NULL DEFAULT 3, -- 3 = Cliente por defecto
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_usuarios_estado (estado),
  INDEX idx_usuarios_creado (creado_en),
  INDEX idx_usuarios_verificado (email_verificado)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: password_resets
--   Tokens de recuperación de contraseña. Se guarda solo el
--   HASH del token (igual que una contraseña), con caducidad
--   y marca de un solo uso.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id_reset INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  codigo_hash CHAR(64) NULL,
  intentos TINYINT NOT NULL DEFAULT 0,
  expira_en DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_reset_token (token_hash),
  INDEX idx_reset_usuario (id_usuario)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: codigos_verificacion
--   Un solo lugar para los dos códigos que viajan por correo:
--     'correo'       -> enlace de verificación de la cuenta
--     'doble_factor' -> código de 6 dígitos del segundo paso
--   Igual que en password_resets, se guarda solo el HASH: si
--   alguien leyera la tabla no podría usar los códigos vivos.
--   `desafio` es el identificador público que devuelve el login
--   para que el navegador no tenga que manejar el id del usuario.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id_codigo INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo ENUM('correo', 'doble_factor') NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  desafio CHAR(43) NULL,
  expira_en DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  intentos TINYINT NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_codigo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_codigo_hash (codigo_hash),
  INDEX idx_codigo_desafio (desafio),
  INDEX idx_codigo_usuario_tipo (id_usuario, tipo)
) ENGINE=InnoDB;

-- =========================================================
--  2. CATÁLOGO (categorías, productos, servicios)
-- =========================================================

-- ---------------------------------------------------------
-- Tabla: categorias
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(70) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  icono VARCHAR(40) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: productos
--   stock          -> unidades disponibles (se descuenta al vender)
--   stock_minimo   -> umbral para la alerta de "stock bajo"
--   precio_anterior-> precio tachado para mostrar ofertas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  marca VARCHAR(40) NOT NULL,
  id_categoria INT NULL,
  descripcion VARCHAR(500) NULL,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  precio_anterior DECIMAL(12,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 5,
  destacado TINYINT(1) NOT NULL DEFAULT 0,
  imagen_url VARCHAR(255) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria)
    REFERENCES categorias(id_categoria)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_productos_precio CHECK (precio >= 0),
  CONSTRAINT chk_productos_stock CHECK (stock >= 0),
  INDEX idx_productos_estado (estado),
  INDEX idx_productos_categoria (id_categoria),
  INDEX idx_productos_marca (marca),
  INDEX idx_productos_destacado (destacado)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: servicios (soporte técnico, reparaciones, garantía)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(500) NULL,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  duracion VARCHAR(40) NULL,
  icono VARCHAR(40) NULL,
  imagen_url VARCHAR(255) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_servicios_precio CHECK (precio >= 0),
  INDEX idx_servicios_estado (estado)
) ENGINE=InnoDB;

-- =========================================================
--  3. VENTAS E INVENTARIO
-- =========================================================

-- ---------------------------------------------------------
-- Tabla: ventas (cabecera del pedido)
--   Los datos del cliente se copian en la venta para conservar
--   la información histórica aunque el usuario cambie sus datos
--   o su cuenta se elimine (id_usuario queda en NULL).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  id_usuario INT NULL,
  cliente_nombre VARCHAR(90) NOT NULL,
  cliente_email VARCHAR(120) NOT NULL,
  cliente_telefono VARCHAR(15) NOT NULL,
  cliente_documento VARCHAR(12) NULL,
  direccion_envio VARCHAR(150) NOT NULL,
  ciudad VARCHAR(60) NOT NULL,
  notas VARCHAR(300) NULL,
  metodo_pago ENUM('contraentrega', 'transferencia', 'efectivo') NOT NULL
    DEFAULT 'contraentrega',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_envio DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_articulos INT NOT NULL DEFAULT 0,
  estado ENUM('pendiente', 'pagada', 'enviada', 'entregada', 'cancelada')
    NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_ventas_total CHECK (total >= 0),
  INDEX idx_ventas_usuario (id_usuario),
  INDEX idx_ventas_estado (estado),
  INDEX idx_ventas_creado (creado_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: venta_detalles (líneas del pedido)
--   Guarda nombre y precio DEL MOMENTO DE LA COMPRA, para que
--   el histórico no cambie si después se edita el producto.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta_detalles (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NULL,
  nombre_producto VARCHAR(80) NOT NULL,
  marca_producto VARCHAR(40) NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  cantidad INT NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  INDEX idx_detalle_venta (id_venta),
  INDEX idx_detalle_producto (id_producto)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: movimientos_inventario (kardex)
--   Deja rastro de TODA variación de stock: ventas, ingresos
--   de mercancía, ajustes manuales y devoluciones por
--   cancelación de un pedido.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  motivo VARCHAR(150) NULL,
  id_venta INT NULL,
  id_usuario INT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mov_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_mov_producto (id_producto),
  INDEX idx_mov_creado (creado_en),
  INDEX idx_mov_tipo (tipo)
) ENGINE=InnoDB;

-- =========================================================
--  4. ATENCIÓN AL CLIENTE
-- =========================================================

-- ---------------------------------------------------------
-- Tabla: solicitudes_servicio
--   Cuando un cliente agenda un servicio técnico desde la
--   página de Servicios, queda registrado aquí y el
--   administrador/empleado le hace seguimiento.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_servicio (
  id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  id_servicio INT NULL,
  id_usuario INT NULL,
  nombre_servicio VARCHAR(80) NOT NULL,
  precio_servicio DECIMAL(12,2) NOT NULL DEFAULT 0,
  cliente_nombre VARCHAR(90) NOT NULL,
  cliente_email VARCHAR(120) NOT NULL,
  cliente_telefono VARCHAR(15) NOT NULL,
  equipo VARCHAR(80) NULL,
  descripcion VARCHAR(500) NOT NULL,
  respuesta VARCHAR(500) NULL,
  estado ENUM('pendiente', 'en_proceso', 'completada', 'cancelada')
    NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitud_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_solicitud_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_solicitud_estado (estado),
  INDEX idx_solicitud_usuario (id_usuario),
  INDEX idx_solicitud_creado (creado_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabla: mensajes_contacto
--   Formulario de contacto de la página pública.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_contacto (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  telefono VARCHAR(15) NULL,
  asunto VARCHAR(120) NOT NULL,
  mensaje VARCHAR(1000) NOT NULL,
  estado ENUM('nuevo', 'leido', 'respondido') NOT NULL DEFAULT 'nuevo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mensajes_estado (estado),
  INDEX idx_mensajes_creado (creado_en)
) ENGINE=InnoDB;

-- =========================================================
--  5. MIGRACIÓN DE BASES DE DATOS YA EXISTENTES
--
--  Si la base "phonestore" ya existía (avances anteriores), los
--  CREATE TABLE IF NOT EXISTS de arriba no modifican las tablas
--  antiguas. Este bloque agrega de forma segura las columnas,
--  índices y llaves foráneas nuevas, sin tocar los datos ya
--  guardados y sin fallar si se ejecuta varias veces.
-- =========================================================

DROP PROCEDURE IF EXISTS ps_add_column;
DROP PROCEDURE IF EXISTS ps_modify_column;
DROP PROCEDURE IF EXISTS ps_add_index;
DROP PROCEDURE IF EXISTS ps_add_foreign_key;

DELIMITER $$

CREATE PROCEDURE ps_add_column(
  IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_definicion VARCHAR(300))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = p_tabla AND COLUMN_NAME = p_columna) THEN
    SET @ps_sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_columna, '` ', p_definicion);
    PREPARE ps_stmt FROM @ps_sql; EXECUTE ps_stmt; DEALLOCATE PREPARE ps_stmt;
  END IF;
END$$

CREATE PROCEDURE ps_modify_column(
  IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_definicion VARCHAR(300))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = p_tabla AND COLUMN_NAME = p_columna) THEN
    SET @ps_sql = CONCAT('ALTER TABLE `', p_tabla, '` MODIFY COLUMN `', p_columna, '` ', p_definicion);
    PREPARE ps_stmt FROM @ps_sql; EXECUTE ps_stmt; DEALLOCATE PREPARE ps_stmt;
  END IF;
END$$

CREATE PROCEDURE ps_add_index(
  IN p_tabla VARCHAR(64), IN p_indice VARCHAR(64), IN p_columnas VARCHAR(200))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = p_tabla AND INDEX_NAME = p_indice) THEN
    SET @ps_sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD INDEX `', p_indice, '` (', p_columnas, ')');
    PREPARE ps_stmt FROM @ps_sql; EXECUTE ps_stmt; DEALLOCATE PREPARE ps_stmt;
  END IF;
END$$

CREATE PROCEDURE ps_add_foreign_key(
  IN p_tabla VARCHAR(64), IN p_nombre VARCHAR(64), IN p_definicion VARCHAR(400))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = p_tabla AND CONSTRAINT_NAME = p_nombre) THEN
    SET @ps_sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_nombre, '` ', p_definicion);
    PREPARE ps_stmt FROM @ps_sql; EXECUTE ps_stmt; DEALLOCATE PREPARE ps_stmt;
  END IF;
END$$

CREATE PROCEDURE ps_add_check(
  IN p_tabla VARCHAR(64), IN p_nombre VARCHAR(64), IN p_condicion VARCHAR(300))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = p_tabla AND CONSTRAINT_NAME = p_nombre) THEN
    SET @ps_sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_nombre,
                         '` CHECK (', p_condicion, ')');
    PREPARE ps_stmt FROM @ps_sql; EXECUTE ps_stmt; DEALLOCATE PREPARE ps_stmt;
  END IF;
END$$

DELIMITER ;

-- usuarios: dirección y teléfono más largos (validación 10-150 y 7-15)
CALL ps_modify_column('usuarios', 'direccion', 'VARCHAR(150) NOT NULL');
CALL ps_modify_column('usuarios', 'telefono', 'VARCHAR(15) NOT NULL');
CALL ps_add_index('usuarios', 'idx_usuarios_estado', '`estado`');
CALL ps_add_index('usuarios', 'idx_usuarios_creado', '`creado_en`');

-- usuarios: verificación de correo y segundo factor por correo
CALL ps_add_column('usuarios', 'email_verificado',
                   'TINYINT(1) NOT NULL DEFAULT 0 AFTER `email`');
CALL ps_add_column('usuarios', 'doble_factor',
                   'TINYINT(1) NOT NULL DEFAULT 0 AFTER `email_verificado`');
CALL ps_add_index('usuarios', 'idx_usuarios_verificado', '`email_verificado`');

-- password_resets: codigo de 6 digitos para restablecer sin abrir el enlace
CALL ps_add_column('password_resets', 'codigo_hash',
                   'CHAR(64) NULL AFTER `token_hash`');
CALL ps_add_column('password_resets', 'intentos',
                   'TINYINT NOT NULL DEFAULT 0 AFTER `codigo_hash`');
CALL ps_add_index('password_resets', 'idx_reset_codigo', '`codigo_hash`');

-- productos: categoría, control de stock mínimo, ofertas y destacados
CALL ps_add_column('productos', 'id_categoria', 'INT NULL AFTER `marca`');
CALL ps_add_column('productos', 'precio_anterior', 'DECIMAL(12,2) NULL AFTER `precio`');
CALL ps_add_column('productos', 'stock_minimo', 'INT NOT NULL DEFAULT 5 AFTER `stock`');
CALL ps_add_column('productos', 'destacado', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `stock_minimo`');
CALL ps_add_foreign_key('productos', 'fk_productos_categoria',
  'FOREIGN KEY (`id_categoria`) REFERENCES `categorias`(`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE');
CALL ps_add_index('productos', 'idx_productos_estado', '`estado`');
CALL ps_add_index('productos', 'idx_productos_marca', '`marca`');
CALL ps_add_index('productos', 'idx_productos_destacado', '`destacado`');

-- servicios: información extra para la vitrina pública
CALL ps_add_column('servicios', 'duracion', 'VARCHAR(40) NULL AFTER `precio`');
CALL ps_add_column('servicios', 'icono', 'VARCHAR(40) NULL AFTER `duracion`');
CALL ps_add_column('servicios', 'imagen_url', 'VARCHAR(255) NULL AFTER `icono`');
CALL ps_add_index('servicios', 'idx_servicios_estado', '`estado`');

-- Reglas de integridad en tablas que ya existían antes de esta versión.
-- (Las tablas nuevas ya las traen declaradas en su CREATE TABLE.)
CALL ps_add_check('productos', 'chk_productos_precio', '`precio` >= 0');
CALL ps_add_check('productos', 'chk_productos_stock', '`stock` >= 0');
CALL ps_add_check('servicios', 'chk_servicios_precio', '`precio` >= 0');

DROP PROCEDURE IF EXISTS ps_add_column;
DROP PROCEDURE IF EXISTS ps_modify_column;
DROP PROCEDURE IF EXISTS ps_add_index;
DROP PROCEDURE IF EXISTS ps_add_foreign_key;
DROP PROCEDURE IF EXISTS ps_add_check;

-- =========================================================
--  6. DATOS INICIALES (seed idempotente)
-- =========================================================

INSERT INTO roles (id_rol, nombre, descripcion) VALUES
  (1, 'administrador', 'Gestión total del sistema: usuarios, catálogo, ventas e inventario'),
  (2, 'empleado', 'Gestión operativa de productos, servicios, pedidos e inventario'),
  (3, 'cliente', 'Usuario final que compra productos y solicita servicios')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO permisos (nombre, descripcion) VALUES
  ('usuarios.ver', 'Ver listado de usuarios'),
  ('usuarios.crear', 'Crear usuarios'),
  ('usuarios.editar', 'Editar usuarios'),
  ('usuarios.eliminar', 'Eliminar / desactivar usuarios'),
  ('productos.ver', 'Ver productos'),
  ('productos.crear', 'Crear productos'),
  ('productos.editar', 'Editar productos'),
  ('productos.eliminar', 'Eliminar productos'),
  ('servicios.gestionar', 'Gestionar servicios'),
  ('categorias.gestionar', 'Gestionar categorías del catálogo'),
  ('ventas.ver', 'Consultar pedidos y ventas'),
  ('ventas.gestionar', 'Cambiar el estado de los pedidos'),
  ('inventario.gestionar', 'Registrar entradas, salidas y ajustes de stock'),
  ('solicitudes.gestionar', 'Atender solicitudes de servicio técnico'),
  ('mensajes.gestionar', 'Atender mensajes del formulario de contacto'),
  ('reportes.ver', 'Ver el dashboard y los reportes de ventas')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Administrador: todos los permisos
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT 1, id_permiso FROM permisos
ON DUPLICATE KEY UPDATE id_rol = id_rol;

-- Empleado: operación diaria, sin administración de usuarios ni borrados
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT 2, id_permiso FROM permisos
WHERE nombre IN ('usuarios.ver', 'productos.ver', 'productos.crear',
                 'productos.editar', 'servicios.gestionar', 'categorias.gestionar',
                 'ventas.ver', 'ventas.gestionar', 'inventario.gestionar',
                 'solicitudes.gestionar', 'mensajes.gestionar', 'reportes.ver')
ON DUPLICATE KEY UPDATE id_rol = id_rol;

-- Cliente: solo ver productos
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT 3, id_permiso FROM permisos WHERE nombre = 'productos.ver'
ON DUPLICATE KEY UPDATE id_rol = id_rol;

-- Categorías de ejemplo
INSERT INTO categorias (nombre, slug, descripcion, icono) VALUES
  ('Smartphones', 'smartphones', 'Teléfonos inteligentes de las mejores marcas', 'phone'),
  ('Accesorios', 'accesorios', 'Fundas, cargadores, cables y protectores', 'plug'),
  ('Audio', 'audio', 'Audífonos, manos libres y parlantes portátiles', 'headphones'),
  ('Smartwatch', 'smartwatch', 'Relojes inteligentes y bandas deportivas', 'watch'),
  ('Tablets', 'tablets', 'Tabletas para estudio, trabajo y entretenimiento', 'tablet')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), icono = VALUES(icono);

-- Productos de ejemplo (solo si la tabla está vacía, para no duplicar)
INSERT INTO productos (nombre, marca, id_categoria, descripcion, precio, precio_anterior, stock, stock_minimo, destacado, estado)
SELECT * FROM (
  SELECT 'iPhone 17' AS nombre, 'Apple' AS marca,
         (SELECT id_categoria FROM categorias WHERE slug = 'smartphones') AS id_categoria,
         'Pantalla Super Retina XDR de 6.1", chip A19 y 128 GB de almacenamiento.' AS descripcion,
         4500000 AS precio, 4900000 AS precio_anterior, 15 AS stock, 5 AS stock_minimo,
         1 AS destacado, 'activo' AS estado
  UNION ALL SELECT 'iPhone 15 Pro', 'Apple',
         (SELECT id_categoria FROM categorias WHERE slug = 'smartphones'),
         'Chip A17 Pro, cuerpo en titanio y sistema de cámara triple de 48 MP.',
         3800000, NULL, 10, 5, 1, 'activo'
  UNION ALL SELECT 'Galaxy S24 Ultra', 'Samsung',
         (SELECT id_categoria FROM categorias WHERE slug = 'smartphones'),
         'Pantalla AMOLED 120 Hz, S-Pen incluido y 256 GB de almacenamiento.',
         3200000, 3600000, 20, 5, 1, 'activo'
  UNION ALL SELECT 'Xiaomi Redmi Note 13', 'Xiaomi',
         (SELECT id_categoria FROM categorias WHERE slug = 'smartphones'),
         'Batería de 5000 mAh, cámara de 108 MP y carga rápida de 67 W.',
         950000, NULL, 25, 5, 0, 'activo'
  UNION ALL SELECT 'AirPods Pro 2', 'Apple',
         (SELECT id_categoria FROM categorias WHERE slug = 'audio'),
         'Cancelación activa de ruido, audio espacial y estuche con USB-C.',
         890000, 990000, 30, 8, 1, 'activo'
  UNION ALL SELECT 'Galaxy Watch 6', 'Samsung',
         (SELECT id_categoria FROM categorias WHERE slug = 'smartwatch'),
         'Monitoreo de sueño, ritmo cardiaco y GPS integrado.',
         1100000, NULL, 12, 4, 0, 'activo'
  UNION ALL SELECT 'Cargador rápido 65W GaN', 'Ugreen',
         (SELECT id_categoria FROM categorias WHERE slug = 'accesorios'),
         'Tres puertos, tecnología GaN y protección contra sobrecarga.',
         180000, 220000, 40, 10, 0, 'activo'
  UNION ALL SELECT 'iPad 10ma generación', 'Apple',
         (SELECT id_categoria FROM categorias WHERE slug = 'tablets'),
         'Pantalla Liquid Retina de 10.9", chip A14 Bionic y 64 GB.',
         2100000, NULL, 8, 3, 0, 'activo'
) AS semilla
WHERE NOT EXISTS (SELECT 1 FROM productos);

-- Servicios de ejemplo (solo si la tabla está vacía)
INSERT INTO servicios (nombre, descripcion, precio, duracion, icono, estado)
SELECT * FROM (
  SELECT 'Cambio de pantalla' AS nombre,
         'Reparación e instalación de pantalla original con garantía de 6 meses.' AS descripcion,
         250000 AS precio, '2 a 4 horas' AS duracion, 'screen' AS icono, 'activo' AS estado
  UNION ALL SELECT 'Cambio de batería',
         'Reemplazo de batería certificada y calibración del sistema de carga.',
         180000, '1 a 2 horas', 'battery', 'activo'
  UNION ALL SELECT 'Garantía extendida',
         '12 meses adicionales de cobertura sobre fallas de fábrica.',
         150000, 'Inmediato', 'shield', 'activo'
  UNION ALL SELECT 'Diagnóstico técnico',
         'Revisión completa del equipo con informe escrito del estado de cada módulo.',
         50000, '45 minutos', 'search', 'activo'
  UNION ALL SELECT 'Liberación de equipo',
         'Desbloqueo de operador para usar cualquier SIM, con soporte posterior.',
         120000, '24 horas', 'unlock', 'activo'
  UNION ALL SELECT 'Respaldo y migración de datos',
         'Copia de seguridad y traslado de tu información al equipo nuevo.',
         80000, '1 hora', 'cloud', 'activo'
) AS semilla
WHERE NOT EXISTS (SELECT 1 FROM servicios);

-- Nota: el usuario administrador se crea desde el backend con la
-- contraseña hasheada (backend-fastapi/app/scripts/seed_admin.py),
-- para no almacenar contraseñas en texto plano en este script.
