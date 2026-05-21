# Docker Compose Setup Guide

## Overview

TalentLens uses Docker Compose to orchestrate the development and production environments. There are two Docker Compose configurations:

1. **`docker-compose.yml`** - Full stack with all services (backend + all UIs)
2. **`docker-compose.dev.yml`** - Backend services only (for frontend development)

## Architecture

### Full Stack (`docker-compose.yml`)

- **postgres** - PostgreSQL database (port 5432)
- **redis** - Redis cache (port 6379)
- **backend** - Django API server (port 8000)
- **student-ui** - Student interface (port 3000)
- **teacher-ui** - Teacher interface (port 3001)
- **admin-ui** - Admin interface (port 3002)

### Backend Only (`docker-compose.dev.yml`)

- **postgres** - PostgreSQL database (port 5432)
- **redis** - Redis cache (port 6379)
- **backend** - Django API server (port 8000)

## Quick Commands

### Full Stack Development

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Rebuild containers
npm run docker:build
```

### Backend Only Development

```bash
# Start backend services only
npm run docker:dev

# View backend logs
npm run docker:dev:logs

# Stop backend services
npm run docker:dev:down

# Run frontends locally
npm run dev:all
```

## Environment Variables

Make sure to create a `.env` file in the `backend/` directory with the following variables:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_HOST=postgres
DB_NAME=talentlens_dev
DB_USER=postgres
DB_PASSWORD=password
DB_PORT=5432
REDIS_URL=redis://redis:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://localhost:3002
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_PORT=587
EMAIL_USE_TLS=True
GEMINI_API_KEY=your-gemini-api-key
```

## Ports

- **Backend API**: http://localhost:8000
- **Student UI**: http://localhost:3000
- **Teacher UI**: http://localhost:3001
- **Admin UI**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Troubleshooting

### Container Name Conflicts

If you encounter container name conflicts, stop all containers:

```bash
docker container stop $(docker container ls -aq)
docker container rm $(docker container ls -aq)
```

### Database Issues

Reset the database:

```bash
docker-compose down -v
docker-compose up -d
```

### Build Issues

Force rebuild all containers:

```bash
docker-compose build --no-cache
```

### Port Conflicts

If ports are already in use, you can modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # Change left number to available port
```

## Development Workflow

### Option 1: Full Docker Setup

1. `npm run docker:up` - Start all services
2. Access UIs at their respective ports
3. `npm run docker:logs` - Monitor logs

### Option 2: Hybrid Development

1. `npm run docker:dev` - Start backend services only
2. `npm run dev:all` - Start all frontend clients locally
3. Develop with hot reloading on frontends

### Option 3: Local Development

1. Start PostgreSQL and Redis manually
2. `npm run dev:backend` - Start Django server
3. `npm run dev:all` - Start all frontend clients

## Health Checks

All services include health checks:

- **postgres**: `pg_isready -U postgres`
- **redis**: `redis-cli ping`
- **backend**: `curl -f http://localhost:8000/admin/`

## Volume Management

### Development Volumes

- **postgres_data**: Database persistence
- **redis_data**: Redis persistence
- **media_volume**: Uploaded files

### Development-specific Volumes

- **postgres_data_dev**: Development database
- **redis_data_dev**: Development cache
- **media_volume_dev**: Development uploads

## Migration from Old Setup

The old `frontend/` monolith has been replaced with multiple client applications:

- `clients/student-ui/` - Student interface
- `clients/teacher-ui/` - Teacher interface
- `clients/admin-ui/` - Admin interface

All references to the old frontend have been removed from Docker Compose.
