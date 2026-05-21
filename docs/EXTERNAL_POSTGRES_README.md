# External PostgreSQL Setup for TalentLens

This guide explains how to set up and use an external PostgreSQL database with TalentLens instead of the Docker-managed PostgreSQL container.

## Why Use External PostgreSQL?

- Direct database access for management and debugging
- Better performance and resource control
- Easier backup and restore operations
- Independence from Docker container lifecycle

## Prerequisites

1. PostgreSQL installed on your system
2. PostgreSQL service running
3. Sufficient privileges to create databases and users

## Quick Setup

Run the automated setup script:

```bash
./setup-external-postgres.sh
```

This script will:

- Check if PostgreSQL is installed and running
- Create the `talentlens_dev` database
- Set up the postgres user with the correct password
- Display connection information

## Manual Setup

If you prefer to set up manually:

1. **Connect to PostgreSQL as superuser:**

   ```bash
   sudo -u postgres psql
   ```

2. **Create the database:**

   ```sql
   CREATE DATABASE talentlens_dev;
   ```

3. **Set postgres user password:**

   ```sql
   ALTER USER postgres PASSWORD 'password';
   ```

4. **Grant privileges:**

   ```sql
   GRANT ALL PRIVILEGES ON DATABASE talentlens_dev TO postgres;
   ```

5. **Exit PostgreSQL:**
   ```sql
   \q
   ```

## Configuration

The `.env` file has been updated to use the external PostgreSQL database:

```properties
# Database Configuration for External PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/talentlens_dev
```

### Customizing Database Credentials

If you want to use different credentials, update the following in your `.env` file:

```properties
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/your_database_name
```

## Running Migrations

After setting up the external database, run Django migrations:

```bash
# Navigate to the backend directory
cd backend

# Run migrations
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser
```

## Starting the Application

With external PostgreSQL configured, start the application:

```bash
# For development
docker-compose -f docker-compose.dev.yml up

# For production
docker-compose up
```

## Database Management

### Accessing the Database

You can now directly access your database using standard PostgreSQL tools:

```bash
# Command line access
psql -h localhost -U postgres -d talentlens_dev

# Using pgAdmin or other GUI tools
# Host: localhost
# Port: 5432
# Database: talentlens_dev
# Username: postgres
# Password: password
```

### Backup and Restore

```bash
# Create backup
pg_dump -h localhost -U postgres talentlens_dev > backup.sql

# Restore backup
psql -h localhost -U postgres talentlens_dev < backup.sql
```

### Database Logs

PostgreSQL logs are typically located at:

- Ubuntu/Debian: `/var/log/postgresql/`
- CentOS/RHEL: `/var/lib/pgsql/data/log/`
- macOS (Homebrew): `/usr/local/var/log/`

## Troubleshooting

### Connection Issues

1. **Check if PostgreSQL is running:**

   ```bash
   sudo systemctl status postgresql
   ```

2. **Check PostgreSQL configuration:**

   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   ```

   Ensure `listen_addresses = 'localhost'` or `'*'`

3. **Check authentication settings:**
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   Ensure local connections are allowed

### Permission Issues

If you encounter permission errors:

```bash
# Give postgres user necessary permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE talentlens_dev TO postgres;
ALTER USER postgres CREATEDB;
```

### Port Conflicts

If port 5432 is already in use, you can change it in PostgreSQL configuration:

1. Edit `postgresql.conf`:

   ```
   port = 5433  # or another available port
   ```

2. Update your `.env` file:

   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5433/talentlens_dev
   ```

3. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

## What Changed

The following files were modified to support external PostgreSQL:

1. **`.env`**: Updated `DATABASE_URL` to point to localhost
2. **`docker-compose.yml`**: Removed PostgreSQL service and dependency
3. **`docker-compose.dev.yml`**: Removed PostgreSQL service and dependency

The application now connects to your external PostgreSQL instance instead of a Docker container.
