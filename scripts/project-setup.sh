#!/bin/bash

# TalentLens - Development Setup Script
echo "🚀 Setting up TalentLens Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file from config template
print_status "Setting up environment configuration..."
if [ ! -f config/local.env ]; then
    cp config/local.env.example config/local.env
    print_success "Created config/local.env file. Please update it with your actual values."
    print_warning "Don't forget to add your Gemini API key to config/local.env"
else
    print_warning "config/local.env already exists. Skipping creation."
fi

# Create frontend environment file
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
EOF
    print_success "Created frontend/.env.local file."
else
    print_warning "frontend/.env.local already exists. Skipping creation."
fi

# Start the development environment
print_status "Starting development environment with Docker Compose..."
docker-compose up -d postgres redis

# Wait for services to be ready
print_status "Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
print_success "PostgreSQL is ready!"

print_status "Waiting for Redis to be ready..."
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    sleep 1
done
print_success "Redis is ready!"

# Build and start backend
print_status "Building and starting backend..."
docker-compose up -d backend

# Wait for backend to be ready
print_status "Waiting for backend to be ready..."
sleep 10

# Run migrations
print_status "Running database migrations..."
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Create superuser (optional)
read -p "Do you want to create a superuser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Creating superuser..."
    docker-compose exec backend python manage.py createsuperuser
fi

# Install frontend dependencies and start
print_status "Installing frontend dependencies..."
cd frontend
npm install
cd ..

print_status "Starting frontend..."
docker-compose up -d frontend

print_success "🎉 Development environment is ready!"
echo
print_status "Services running:"
echo "  📊 Frontend: http://localhost:3000"
echo "  🔧 Backend API: http://localhost:8000/api"
echo "  👨‍💼 Django Admin: http://localhost:8000/admin"
echo "  🗄️  PostgreSQL: localhost:5432"
echo "  📮 Redis: localhost:6379"
echo
print_status "To view logs:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo
print_status "To stop all services:"
echo "  docker-compose down"
echo
print_warning "Remember to update your Gemini API key in config/local.env before testing AI features!"

# Check if all services are running
print_status "Checking service status..."
if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
    print_success "✅ Backend is responding"
else
    print_warning "⚠️  Backend might still be starting up. Check logs: docker-compose logs backend"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "✅ Frontend is responding"
else
    print_warning "⚠️  Frontend might still be starting up. Check logs: docker-compose logs frontend"
fi

print_success "Setup complete! Happy coding! 🚀"
