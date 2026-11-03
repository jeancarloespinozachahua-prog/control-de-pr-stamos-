-- Ejecutar como administrador de MySQL (por ejemplo: mysql -u root -p < database/crear_base.sql)
-- Cambie 'CAMBIE_ESTA_CLAVE' por una contraseña propia y colóquela en su archivo .env

CREATE DATABASE IF NOT EXISTS laboratorio_prestamos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS laboratorio_prestamos_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'lab_user'@'localhost' IDENTIFIED BY 'CAMBIE_ESTA_CLAVE';
GRANT ALL PRIVILEGES ON laboratorio_prestamos.*      TO 'lab_user'@'localhost';
GRANT ALL PRIVILEGES ON laboratorio_prestamos_test.* TO 'lab_user'@'localhost';
FLUSH PRIVILEGES;
