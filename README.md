# TalentLens - AI-Powered Talent Assessment Platform

TalentLens is a comprehensive platform for conducting AI-powered interviews and talent assessments. It provides separate interfaces for students, teachers, and administrators with advanced AI integration for interview analysis and skill evaluation.

## 🚀 Quick Start

### Prerequisites

- PostgreSQL (v13+)
- Node.js (v18+)
- Docker & Docker Compose
- Python (v3.8+)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TalentLens
   ```

2. **Run the setup script**

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Start the development environment**

   ```bash
   ./start.sh
   ```

4. **Run database migrations**

   ```bash
   cd backend
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Access the applications**
   - **Student UI**: http://localhost:3000
   - **Teacher UI**: http://localhost:3001
   - **Admin UI**: http://localhost:3002
   - **API**: http://localhost:8000
   - **Admin Panel**: http://localhost:8000/admin/

## 🏗️ Architecture

### Components

- **Backend**: Django REST API with AI integration
- **Database**: PostgreSQL (external)
- **Cache**: Redis (Docker)
- **Frontend**: Next.js applications (local)

### Services

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │  Django Backend │
│   (External)    │    │    (Docker)     │    │    (Docker)     │
│   Port: 5432    │    │   Port: 6379    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Student UI    │    │   Teacher UI    │    │    Admin UI     │
│    (Local)      │    │    (Local)      │    │    (Local)      │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
TalentLens/
├── backend/                 # Django REST API
│   ├── apps/               # Django applications
│   │   ├── authentication/ # User authentication
│   │   ├── interviews/     # Interview management
│   │   ├── dashboard/      # Dashboard data
│   │   ├── users/          # User management
│   │   └── ai_engine/      # AI integration
│   └── manage.py
├── clients/                # Frontend applications
│   ├── student-ui/         # Student interface
│   ├── teacher-ui/         # Teacher interface
│   └── admin-ui/           # Admin interface
├── config/                 # Configuration files
│   ├── local.env           # Local environment variables
│   └── local.env.example   # Environment template
├── requirements/           # Python dependencies
│   ├── backend.txt         # Production dependencies
│   ├── dev.txt            # Development dependencies
│   └── prod.txt           # Production-only dependencies
├── docker-compose.yml      # Docker services
├── setup.sh               # Main setup script
├── start.sh               # Start development environment
└── stop.sh                # Stop development environment
```

## ⚙️ Configuration

### Environment Variables

The main configuration is stored in `config/local.env`. Key variables:

- **Database**: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- **API Keys**: `GEMINI_API_KEY`
- **Ports**: `STUDENT_UI_PORT`, `TEACHER_UI_PORT`, `ADMIN_UI_PORT`
- **URLs**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

### Customization

1. Copy the example configuration:

   ```bash
   cp config/local.env.example config/local.env
   ```

2. Edit `config/local.env` with your settings

3. Restart the environment:
   ```bash
   ./stop.sh && ./start.sh
   ```

## 🛠️ Development

### Available Commands

```bash
# Environment management
./setup.sh                 # Initial setup
./start.sh                 # Start all services
./stop.sh                  # Stop all services

# Backend management
cd backend
python manage.py migrate   # Run database migrations
python manage.py createsuperuser  # Create admin user
python manage.py shell     # Django shell

# Database access
psql -h localhost -U postgres -d talentlens_dev

# Logs
docker-compose logs -f backend     # Backend logs
tail -f clients/logs/*.log         # UI application logs
```

### Development Workflow

1. **Start the environment**

   ```bash
   ./start.sh
   ```

2. **Make changes**

   - Backend changes: Auto-reload with Django
   - Frontend changes: Auto-reload with Next.js

3. **Database changes**

   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Stop when done**
   ```bash
   ./stop.sh
   ```

## 🎯 Features

### Student Interface

- Take AI-powered interviews
- View interview results and feedback
- Track progress and performance
- Access learning resources

### Teacher Interface

- Create and manage interview questions
- Review student interviews
- Generate detailed reports
- Monitor class performance

### Admin Interface

- Manage users and permissions
- Configure system settings
- View analytics and insights
- Manage AI configurations

### Backend API

- RESTful API with JWT authentication
- WebSocket support for real-time features
- AI integration with Google Gemini
- File upload and processing
- Background task processing

## 🔒 Security

- JWT-based authentication
- CORS protection
- Environment-based configuration
- Secure file uploads
- Input validation and sanitization

## 🚀 Deployment

### Production Setup

1. **Configure production environment**

   ```bash
   cp config/local.env.example config/production.env
   # Edit production.env with production values
   ```

2. **Install production dependencies**

   ```bash
   pip install -r requirements/backend.txt -r requirements/prod.txt
   ```

3. **Build frontend applications**

   ```bash
   cd clients/student-ui && npm run build
   cd ../teacher-ui && npm run build
   cd ../admin-ui && npm run build
   ```

4. **Configure web server** (Nginx, Apache, etc.)

5. **Set up process management** (systemd, PM2, etc.)

## 🆘 Troubleshooting

### Common Issues

**Port conflicts**

```bash
# Check what's using a port
lsof -i :3000
# Kill the process
kill -9 <PID>
```

**Database connection errors**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Docker issues**

```bash
# Restart Docker services
docker-compose down && docker-compose up
# Clean Docker cache
docker system prune
```

**Node.js dependency issues**

```bash
# Clear npm cache
npm cache clean --force
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. Check the logs for error messages
2. Verify all prerequisites are installed
3. Ensure all ports are available
4. Review the configuration files
5. Check the troubleshooting section above

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy coding!** 🚀
