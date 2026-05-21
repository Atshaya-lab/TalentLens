#!/bin/bash

# PostgreSQL Database Setup Script for TalentLens (No Sudo Required)
# This script creates the PostgreSQL database and user for TalentLens without requiring sudo

# Source environment variables
source "$(dirname "$0")/../setup.sh"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}🐘 PostgreSQL Database Setup for TalentLens (No Sudo)${NC}"
echo "======================================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed"
    echo ""
    echo "Install PostgreSQL:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install postgresql postgresql-contrib"
    echo "  CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo "  macOS: brew install postgresql"
    echo ""
    exit 1
fi

print_success "PostgreSQL is installed"

# Check if PostgreSQL service is running
if ! pgrep -x "postgres" > /dev/null; then
    print_warning "PostgreSQL service is not running"
    echo ""
    echo "Start PostgreSQL:"
    echo "  Ubuntu/Debian: sudo systemctl start postgresql"
    echo "  CentOS/RHEL: sudo systemctl start postgresql"
    echo "  macOS: brew services start postgresql"
    echo ""
    exit 1
fi

print_success "PostgreSQL service is running"

echo ""
print_info "Database Configuration:"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Database Host: $DB_HOST"
echo "  Database Port: $DB_PORT"
echo ""

# Test if current user can connect to PostgreSQL
print_info "Testing PostgreSQL connection..."
if ! psql -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    print_error "Cannot connect to PostgreSQL with current user"
    echo ""
    echo "To fix this, you need to either:"
    echo "  1. Configure PostgreSQL to allow local connections without password"
    echo "  2. Add your user to the postgres group:"
    echo "     sudo usermod -a -G postgres \$USER"
    echo "     sudo systemctl restart postgresql"
    echo "     newgrp postgres"
    echo "  3. Or configure pg_hba.conf to trust local connections"
    echo ""
    echo "Example pg_hba.conf entry for local trust:"
    echo "  local   all             all                                     trust"
    echo ""
    exit 1
fi

print_success "Can connect to PostgreSQL"

# Create database and configure user
print_info "Creating database and configuring user..."

psql -d postgres << EOF
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if it doesn't exist (only if not using postgres user)
DO \$\$
BEGIN
    IF '$DB_USER' != 'postgres' THEN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '$DB_USER') THEN
            CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB;
            RAISE NOTICE 'User $DB_USER created';
        ELSE
            ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';
            RAISE NOTICE 'User $DB_USER password updated';
        END IF;
    ELSE
        ALTER USER postgres PASSWORD '$DB_PASSWORD';
        RAISE NOTICE 'PostgreSQL user password updated';
    END IF;
END
\$\$;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database and grant schema privileges
\c $DB_NAME

-- Grant all privileges on public schema
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

\q
EOF

if [ $? -eq 0 ]; then
    print_success "Database setup completed successfully!"
    echo ""
    echo -e "${BLUE}📋 Database Information:${NC}"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo ""
    echo -e "${BLUE}🔗 Connection URL:${NC}"
    echo "  postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo -e "${BLUE}🧪 Test Connection:${NC}"
    echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo ""
else
    print_error "Database setup failed!"
    echo ""
    echo "Common issues:"
    echo "  1. PostgreSQL service not running"
    echo "  2. Insufficient permissions - user cannot connect to PostgreSQL"
    echo "  3. pg_hba.conf doesn't allow local connections"
    echo "  4. Current user doesn't have createdb privileges"
    echo ""
    echo "Solutions:"
    echo "  1. Check PostgreSQL service: systemctl status postgresql"
    echo "  2. Review pg_hba.conf configuration"
    echo "  3. Ensure your user can connect: psql -d postgres -c 'SELECT 1;'"
    echo "  4. Add user to postgres group or configure trust authentication"
    echo ""
    exit 1
fi

# Test database connection
print_info "Testing database connection..."

if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    print_success "Database connection test passed!"
else
    print_warning "Database connection test failed"
    echo "Please verify the connection manually:"
    echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

echo ""
print_success "PostgreSQL setup complete! 🎉"
echo ""
print_info "Next steps:"
echo "  1. Update your application's database configuration"
echo "  2. Run database migrations if needed"
echo "  3. Test your application's database connectivity"
