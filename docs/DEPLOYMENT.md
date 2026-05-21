# TalentLens - Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Git

### 1. Initial Setup

```bash
# Clone and setup
git clone <repository-url>
cd TalentLens
chmod +x scripts/*.sh
./scripts/project-setup.sh
```

### 2. Start Development Environment

```bash
./scripts/start-development.sh
```

### 3. Access Applications

- **Backend API**: http://localhost:8000
- **Student Portal**: http://localhost:3001 (Blue theme)
- **Teacher Portal**: http://localhost:3002 (Green theme)
- **Admin Dashboard**: http://localhost:3003 (Purple theme)

## 🔐 Default Accounts

### Super Admin

- **Email**: admin@talentlens.com
- **Password**: admin123
- **Role**: Administrator

### Test Teacher

- **Email**: teacher@test.com
- **Password**: teacher123
- **Role**: Teacher

### Test Student

- **Email**: student@test.com
- **Password**: student123
- **Role**: Student

## 📁 Project Structure

```
TalentLens/
├── backend/           # Django REST API
├── clients/           # Frontend applications
│   ├── shared/       # Shared components & utilities
│   ├── student-ui/   # Student portal (Port 3001)
│   ├── teacher-ui/   # Teacher portal (Port 3002)
│   └── admin-ui/     # Admin dashboard (Port 3003)
├── scripts/          # Setup & deployment scripts
└── docs/            # Documentation
```

## 🔧 Development Commands

### Backend

```bash
cd backend
python manage.py runserver              # Start Django server
python manage.py migrate               # Run migrations
python manage.py createsuperuser       # Create admin user
python manage.py collectstatic         # Collect static files
```

### Frontend Clients

```bash
cd clients/student-ui
npm run dev                            # Start student portal

cd clients/teacher-ui
npm run dev                            # Start teacher portal

cd clients/admin-ui
npm run dev                            # Start admin dashboard
```

## 🐳 Docker Deployment

### Development

```bash
docker-compose up --build
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up --build
```

## 🌟 Key Features Testing

### 1. Hierarchical Access Control

- ✅ Students cannot self-register
- ✅ Teachers can create student accounts
- ✅ Role-based UI access

### 2. AI-Powered Interviews

- ✅ Question generation via Google Gemini
- ✅ Real-time scoring and feedback
- ✅ Resume-based personalization

### 3. Security Features

- ✅ Anti-cheating detection
- ✅ JWT authentication
- ✅ Role-based permissions

## 🔄 Common Tasks

### Reset Database

```bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Clear Cache

```bash
# Frontend
rm -rf clients/*/node_modules/.next

# Backend
cd backend
python manage.py clear_cache
```

### Update Dependencies

```bash
# Frontend
cd clients/student-ui && npm update
cd clients/teacher-ui && npm update
cd clients/admin-ui && npm update

# Backend
cd backend
pip install -r requirements.txt --upgrade
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on specific port
lsof -ti:3001 | xargs kill -9  # Student UI
lsof -ti:3002 | xargs kill -9  # Teacher UI
lsof -ti:3003 | xargs kill -9  # Admin UI
lsof -ti:8000 | xargs kill -9  # Backend
```

### Database Issues

```bash
cd backend
python manage.py dbshell  # Access database
python manage.py migrate --fake-initial  # Fix migration issues
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf clients/*/.next

# Reinstall dependencies
cd clients/student-ui && rm -rf node_modules && npm install
```

## 📊 Monitoring

### Health Checks

- Backend: http://localhost:8000/health/
- Student UI: http://localhost:3001/api/health
- Teacher UI: http://localhost:3002/api/health
- Admin UI: http://localhost:3003/api/health

### Logs

```bash
# Backend logs
cd backend && python manage.py logs

# Frontend logs
cd clients/student-ui && npm run logs
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Backend
export DJANGO_SECRET_KEY="your-secret-key"
export DATABASE_URL="your-database-url"
export GEMINI_API_KEY="your-gemini-api-key"

# Frontend
export NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

### Build for Production

```bash
# Backend
cd backend
python manage.py collectstatic --noinput
gunicorn talentlens.wsgi:application

# Frontend
cd clients/student-ui && npm run build && npm start
cd clients/teacher-ui && npm run build && npm start
cd clients/admin-ui && npm run build && npm start
```

## 📞 Support

For technical support or questions:

1. Check the [documentation](./docs/)
2. Review [troubleshooting guide](#-troubleshooting)
3. Contact the development team
