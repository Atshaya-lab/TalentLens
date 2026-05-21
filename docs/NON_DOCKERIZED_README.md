# TalentLens Non-Dockerized Development Setup

This guide explains how to run TalentLens with external PostgreSQL and local UI applications (non-dockerized). This setup provides better development experience with direct access to databases and faster UI development cycles.

## Architecture Overview

- **PostgreSQL**: External (host system)
- **Redis**: Docker container
- **Django Backend**: Docker container
- **UI Applications**: Local Node.js processes

## Prerequisites

### Required Software

1. **PostgreSQL** (v13+)

   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql
   ```

2. **Node.js** (v18+)

   ```bash
   # Using NodeSource repository (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # macOS
   brew install node
   ```

3. **Docker & Docker Compose**
   - [Install Docker](https://docs.docker.com/get-docker/)
   - [Install Docker Compose](https://docs.docker.com/compose/install/)

## Quick Setup

### 1. Set Up External PostgreSQL

Run the automated PostgreSQL setup:

```bash
./setup-external-postgres.sh
```

This script will:

- Check if PostgreSQL is installed and running
- Create the `talentlens_dev` database
- Configure the postgres user
- Display connection information

### 2. Set Up UI Applications

Install dependencies for all UI applications:

```bash
./setup-ui-apps.sh
```

This script will:

- Check Node.js installation
- Install dependencies for all UI apps
- Check port availability
- Create environment files

### 3. Start Development Environment

Start all services:

```bash
./start-development.sh
```

This script will:

- Start Redis and Django backend in Docker
- Start all UI applications locally
- Provide comprehensive status information

## Manual Setup

If you prefer manual setup:

### Database Setup

1. **Start PostgreSQL service:**

   ```bash
   sudo systemctl start postgresql  # Linux
   brew services start postgresql   # macOS
   ```

2. **Create database and user:**
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE talentlens_dev;
   ALTER USER postgres PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE talentlens_dev TO postgres;
   \q
   ```

### UI Applications Setup

1. **Install dependencies for each UI app:**

   ```bash
   # Student UI
   cd clients/student-ui
   npm install

   # Teacher UI
   cd ../teacher-ui
   npm install

   # Admin UI
   cd ../admin-ui
   npm install
   ```

2. **Start each UI application:**
   ```bash
   # In separate terminals:
   cd clients/student-ui && npm run dev    # Port 3000
   cd clients/teacher-ui && npm run dev    # Port 3001
   cd clients/admin-ui && npm run dev      # Port 3002
   ```

### Backend Setup

Start backend services:

```bash
docker-compose up redis backend
```

## Available Scripts

### Development Scripts

- `./start-development.sh` - Start complete development environment
- `./stop-development.sh` - Stop all services
- `./setup-external-postgres.sh` - Set up external PostgreSQL
- `./setup-ui-apps.sh` - Set up UI applications

### UI-Specific Scripts

- `./start-ui-apps.sh` - Start only UI applications
- `./stop-ui-apps.sh` - Stop only UI applications

### Legacy Scripts

- `./start-dev.sh` - Deprecated (redirects to new script)

## Service URLs

After starting the development environment:

- **Django API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin/
- **Student UI**: http://localhost:3000
- **Teacher UI**: http://localhost:3001
- **Admin UI**: http://localhost:3002

## Configuration Files

### Environment Files

- `backend/.env` - Backend environment variables
- `clients/student-ui/.env.local` - Student UI environment
- `clients/teacher-ui/.env.local` - Teacher UI environment
- `clients/admin-ui/.env.local` - Admin UI environment

### Docker Compose Files

- `docker-compose.yml` - Production configuration (backend only)
- `docker-compose.dev.yml` - Development configuration (backend only)

## Development Workflow

### Starting Development

1. Start complete environment:

   ```bash
   ./start-development.sh
   ```

2. Wait for all services to be ready

3. Access applications via URLs above

### Daily Development

- **Backend changes**: Restart with `docker-compose restart backend`
- **UI changes**: Auto-reload enabled (no restart needed)
- **Database changes**: Run migrations manually

### Stopping Development

```bash
./stop-development.sh
```

## Database Management

### Direct Access

```bash
# Connect to database
psql -h localhost -U postgres -d talentlens_dev

# Using environment variables
export PGHOST=localhost PGUSER=postgres PGDATABASE=talentlens_dev
psql
```

### Django Management

```bash
cd backend

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Access Django shell
python manage.py shell
```

### Backup and Restore

```bash
# Backup
pg_dump -h localhost -U postgres talentlens_dev > backup.sql

# Restore
psql -h localhost -U postgres talentlens_dev < backup.sql
```

## Logs and Debugging

### Backend Logs

```bash
# View live backend logs
docker-compose logs -f backend

# View Redis logs
docker-compose logs -f redis
```

### UI Application Logs

```bash
# View specific UI app logs
tail -f ./clients/logs/student-ui.log
tail -f ./clients/logs/teacher-ui.log
tail -f ./clients/logs/admin-ui.log

# View all UI logs
tail -f ./clients/logs/*.log
```

### Database Logs

PostgreSQL logs location varies by system:

- Ubuntu/Debian: `/var/log/postgresql/`
- CentOS/RHEL: `/var/lib/pgsql/data/log/`
- macOS (Homebrew): `/usr/local/var/log/`

## Troubleshooting

### Port Conflicts

If ports are in use:

1. **Check what's using the port:**

   ```bash
   lsof -i :3000  # Replace with actual port
   ```

2. **Kill the process:**

   ```bash
   kill -9 <PID>
   ```

3. **Or change the port** in the respective `.env.local` file

### PostgreSQL Issues

1. **Service not running:**

   ```bash
   sudo systemctl start postgresql
   ```

2. **Connection denied:**

   - Check `pg_hba.conf` for authentication settings
   - Ensure `listen_addresses` in `postgresql.conf`

3. **Permission errors:**
   ```bash
   sudo -u postgres psql
   GRANT ALL PRIVILEGES ON DATABASE talentlens_dev TO postgres;
   ```

### UI Application Issues

1. **Dependencies not installed:**

   ```bash
   ./setup-ui-apps.sh
   ```

2. **Port conflicts:**

   - Modify port in `package.json` scripts
   - Update corresponding `.env.local` file

3. **Build errors:**
   ```bash
   cd clients/[app-name]
   rm -rf node_modules .next
   npm install
   ```

### Docker Issues

1. **Backend won't start:**

   ```bash
   docker-compose down
   docker-compose up --build
   ```

2. **Redis connection issues:**
   ```bash
   docker-compose restart redis
   ```

## Advantages of This Setup

### For Developers

- **Faster UI development**: No Docker rebuild for frontend changes
- **Better debugging**: Direct access to Node.js processes
- **IDE integration**: Better TypeScript/ESLint support
- **Hot reload**: Instant UI updates during development

### For Database Management

- **Direct access**: Use any PostgreSQL client
- **Better performance**: No Docker networking overhead
- **Easier backups**: Standard PostgreSQL tools
- **Custom configuration**: Full control over PostgreSQL settings

### For DevOps

- **Flexible deployment**: Can deploy components separately
- **Resource control**: Better memory and CPU management
- **Monitoring**: Easier to monitor individual services
- **Scalability**: Can scale UI and backend independently

## Migration from Full Docker Setup

If migrating from a full Docker setup:

1. **Export existing data:**

   ```bash
   docker-compose exec postgres pg_dump -U postgres talentlens_dev > backup.sql
   ```

2. **Run setup scripts:**

   ```bash
   ./setup-external-postgres.sh
   ./setup-ui-apps.sh
   ```

3. **Import data:**

   ```bash
   psql -h localhost -U postgres talentlens_dev < backup.sql
   ```

4. **Start new environment:**
   ```bash
   ./start-development.sh
   ```

## Production Considerations

This setup is optimized for development. For production:

- Use proper PostgreSQL configuration and security
- Build and serve UI applications properly (not dev mode)
- Implement proper logging and monitoring
- Use environment-specific configurations
- Consider container orchestration for scalability

---

**Need help?** Check the logs, review the troubleshooting section, or examine the setup scripts for more details.
