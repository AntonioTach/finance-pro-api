# Finance Pro API

Backend API desarrollada con NestJS, Sequelize y PostgreSQL.

## Requisitos Previos

- Node.js (v18 o superior)
- Docker y Docker Compose (recomendado)
- PostgreSQL 16+ (si no usas Docker)

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Application
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=financepro

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Importante:** Cambia `JWT_SECRET` por una clave secreta segura en producción.

### 3. Iniciar Base de Datos con Docker

La forma más fácil de iniciar PostgreSQL es usando Docker Compose:

```bash
# Iniciar PostgreSQL
docker-compose up -d

# Verificar que está corriendo
docker-compose ps

# Ver logs
docker-compose logs -f postgres
```

### 4. Iniciar Base de Datos sin Docker

Si prefieres usar PostgreSQL instalado localmente:

1. Crea una base de datos:
```sql
CREATE DATABASE financepro;
```

2. Asegúrate de que las credenciales en `.env` coincidan con tu instalación de PostgreSQL.

### 5. Ejecutar la Aplicación

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

La aplicación estará disponible en `http://localhost:3000`

## Comandos Útiles

```bash
# Detener PostgreSQL
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO! Esto borra los datos)
docker-compose down -v

# Reiniciar PostgreSQL
docker-compose restart postgres

# Ver estado de la base de datos
docker-compose ps
```

## Estructura del Proyecto

```
src/
├── auth/              # Autenticación y autorización
├── users/             # Gestión de usuarios
├── transactions/      # Transacciones financieras
├── categories/        # Categorías de transacciones
├── budgets/           # Presupuestos
├── reports/          # Reportes y análisis
├── config/            # Configuración (DB, JWT, etc.)
└── common/            # Utilidades compartidas
```

## Base de Datos

La aplicación usa Sequelize ORM con PostgreSQL. Los modelos se sincronizan automáticamente en modo desarrollo.

### Modelos Principales

- **User**: Usuarios del sistema
- **Transaction**: Transacciones financieras
- **Category**: Categorías de transacciones
- **Budget**: Presupuestos

## Desarrollo

```bash
# Ejecutar tests
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Linting
npm run lint

# Formatear código
npm run format
```

## Troubleshooting

### Error de conexión a la base de datos

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker-compose ps
   ```

2. Verifica las variables de entorno en `.env`

3. Verifica los logs:
   ```bash
   docker-compose logs postgres
   ```

### La base de datos no se sincroniza

- Asegúrate de que `NODE_ENV=development` en tu `.env`
- Verifica que los modelos estén correctamente importados en `database.provider.ts`
