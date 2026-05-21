volumes:
postgres_data:

````

### 4.2 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Run migrations and collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "talentlens.wsgi:application"]
````

### 4.3 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Phase 5: Advanced Features Implementation

### 5.1 Dashboard Analytics

#### Performance Analytics Service

```python
# apps/dashboard/services.py
from django.db.models import Avg, Count, Q
from apps.interviews.models import InterviewSession, InterviewResponse
from apps.users.models import User
import pandas as pd
from datetime import datetime, timedelta

class AnalyticsService:
    @staticmethod
    def get_student_performance_summary(student_id):
        sessions = InterviewSession.objects.filter(
            student_id=student_id,
            status='completed'
        )

        total_sessions = sessions.count()
        if total_sessions == 0:
            return {
                'total_sessions': 0,
                'average_score': 0,
                'technical_avg': 0,
                'communication_avg': 0,
                'aptitude_avg': 0,
                'improvement_trend': 0
            }

        # Calculate averages by type
        technical_avg = sessions.filter(interview_type='technical').aggregate(
            avg_score=Avg('responses__score')
        )['avg_score'] or 0

        communication_avg = sessions.filter(interview_type='communication').aggregate(
            avg_score=Avg('responses__score')
        )['avg_score'] or 0

        aptitude_avg = sessions.filter(interview_type='aptitude').aggregate(
            avg_score=Avg('responses__score')
        )['avg_score'] or 0

        overall_avg = sessions.aggregate(
            avg_score=Avg('responses__score')
        )['avg_score'] or 0

        # Calculate improvement trend (last 5 sessions vs previous 5)
        recent_sessions = sessions.order_by('-created_at')[:5]
        previous_sessions = sessions.order_by('-created_at')[5:10]

        recent_avg = sum([
            resp.score for session in recent_sessions
            for resp in session.responses.all()
        ]) / max(sum([session.responses.count() for session in recent_sessions]), 1)

        previous_avg = sum([
            resp.score for session in previous_sessions
            for resp in session.responses.all()
        ]) / max(sum([session.responses.count() for session in previous_sessions]), 1)

        improvement_trend = recent_avg - previous_avg

        return {
            'total_sessions': total_sessions,
            'average_score': round(overall_avg, 2),
            'technical_avg': round(technical_avg, 2),
            'communication_avg': round(communication_avg, 2),
            'aptitude_avg': round(aptitude_avg, 2),
            'improvement_trend': round(improvement_trend, 2)
        }

    @staticmethod
    def get_teacher_analytics(teacher_id):
        students = User.objects.filter(
            teachers__teacher_id=teacher_id,
            role='student'
        )

        total_students = students.count()
        total_sessions = InterviewSession.objects.filter(
            teacher_id=teacher_id,
            status='completed'
        ).count()

        # Student performance distribution
        performance_data = []
        for student in students:
            student_data = AnalyticsService.get_student_performance_summary(student.id)
            performance_data.append({
                'student_name': f"{student.first_name} {student.last_name}",
                'average_score': student_data['average_score'],
                'total_sessions': student_data['total_sessions']
            })

        # Calculate class average
        class_average = sum([data['average_score'] for data in performance_data]) / max(len(performance_data), 1)

        return {
            'total_students': total_students,
            'total_sessions': total_sessions,
            'class_average': round(class_average, 2),
            'student_performance': performance_data
        }

    @staticmethod
    def get_admin_analytics():
        total_users = User.objects.count()
        total_students = User.objects.filter(role='student').count()
        total_teachers = User.objects.filter(role='teacher').count()
        total_sessions = InterviewSession.objects.filter(status='completed').count()

        # Monthly session trends
        thirty_days_ago = datetime.now() - timedelta(days=30)
        monthly_sessions = InterviewSession.objects.filter(
            created_at__gte=thirty_days_ago
        ).extra(
            select={'month': 'DATE_TRUNC(\'day\', created_at)'}
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Performance by interview type
        performance_by_type = {}
        for interview_type in ['technical', 'communication', 'aptitude']:
            avg_score = InterviewSession.objects.filter(
                interview_type=interview_type,
                status='completed'
            ).aggregate(
                avg_score=Avg('responses__score')
            )['avg_score'] or 0

            performance_by_type[interview_type] = round(avg_score, 2)

        return {
            'total_users': total_users,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_sessions': total_sessions,
            'monthly_trends': list(monthly_sessions),
            'performance_by_type': performance_by_type
        }
```

### 5.2 Advanced Interview Features

#### Interview Timer and Auto-submission

```typescript
// components/student/InterviewTimer.tsx
import React, { useState, useEffect } from "react";

interface InterviewTimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
  isActive: boolean;
}

const InterviewTimer: React.FC<InterviewTimerProps> = ({
  duration,
  onTimeUp,
  isActive,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          onTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    return ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  };

  const getColorClass = () => {
    if (timeLeft < 300) return "text-red-600"; // Last 5 minutes
    if (timeLeft < 600) return "text-yellow-600"; // Last 10 minutes
    return "text-green-600";
  };

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      <div className="text-center">
        <div className={`text-2xl font-bold ${getColorClass()}`}>
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm text-gray-500 mt-1">Time Remaining</div>
        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              timeLeft < 300
                ? "bg-red-500"
                : timeLeft < 600
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default InterviewTimer;
```

#### Enhanced Interview Session with Anti-cheating

```typescript
// components/student/SecureInterviewSession.tsx
import React, { useState, useEffect, useRef } from "react";
import InterviewTimer from "./InterviewTimer";

interface SecureInterviewSessionProps {
  sessionId: number;
  duration: number;
}

const SecureInterviewSession: React.FC<SecureInterviewSessionProps> = ({
  sessionId,
  duration,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [warningShown, setWarningShown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Enter fullscreen mode
    const enterFullscreen = async () => {
      if (containerRef.current) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (error) {
          console.error("Failed to enter fullscreen:", error);
        }
      }
    };

    enterFullscreen();

    // Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        if (!warningShown) {
          alert(
            "Warning: Tab switching is being monitored. Multiple switches may result in session termination."
          );
          setWarningShown(true);
        }
      }
    };

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent common keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.shiftKey && e.key === "C")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [warningShown]);

  const handleTimeUp = () => {
    // Auto-submit the interview
    alert("Time is up! Your interview will be submitted automatically.");
    // Implement auto-submission logic here
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-100 p-4">
      <InterviewTimer
        duration={duration}
        onTimeUp={handleTimeUp}
        isActive={true}
      />

      {tabSwitchCount > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Warning: {tabSwitchCount} tab switch(es) detected. This is being
          monitored.
        </div>
      )}

      {/* Interview content goes here */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Interview questions and answers */}
      </div>
    </div>
  );
};

export default SecureInterviewSession;
```

### 5.3 Resume Management System

#### Resume Upload and Processing

```python
# apps/resumes/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume
from .serializers import ResumeSerializer
import PyPDF2
import docx
import io

class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return Resume.objects.all()
        elif user.role == 'teacher':
            return Resume.objects.filter(
                student__teachers__teacher=user
            )
        else:  # student
            return Resume.objects.filter(student=user)

    @action(detail=False, methods=['post'])
    def upload_resume(self, request):
        student_id = request.data.get('student_id')
        resume_file = request.FILES.get('resume_file')

        if not resume_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract text from file
        try:
            if resume_file.name.endswith('.pdf'):
                content = self.extract_pdf_text(resume_file)
            elif resume_file.name.endswith(('.doc', '.docx')):
                content = self.extract_docx_text(resume_file)
            elif resume_file.name.endswith('.txt'):
                content = resume_file.read().decode('utf-8')
            else:
                return Response({'error': 'Unsupported file format'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Save or update resume
        resume, created = Resume.objects.update_or_create(
            student_id=student_id,
            defaults={
                'content': content,
                'uploaded_by': request.user,
                'is_active': True
            }
        )

        serializer = self.get_serializer(resume)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def extract_pdf_text(self, file):
        reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text

    def extract_docx_text(self, file):
        doc = docx.Document(io.BytesIO(file.read()))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
```

### 5.4 Notification System

#### Real-time Notifications

```python
# apps/notifications/models.py
from django.db import models
from apps.users.models import User

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_completed', 'Interview Completed'),
        ('resume_uploaded', 'Resume Uploaded'),
        ('student_assigned', 'Student Assigned'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications', null=True)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
```

```python
# apps/notifications/services.py
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class NotificationService:
    @staticmethod
    def create_notification(recipient, sender, notification_type, title, message):
        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=notification_type,
            title=title,
            message=message
        )

        # Send real-time notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{recipient.id}",
            {
                'type': 'send_notification',
                'notification': {
                    'id': notification.id,
                    'title': notification.title,
                    'message': notification.message,
                    'type': notification.notification_type,
                    'created_at': notification.created_at.isoformat()
                }
            }
        )

        return notification

    @staticmethod
    def notify_interview_scheduled(student, teacher, session):
        NotificationService.create_notification(
            recipient=student,
            sender=teacher,
            notification_type='interview_scheduled',
            title='New Interview Scheduled',
            message=f'You have a {session.interview_type} interview scheduled for {session.scheduled_datetime}'
        )
```

## Phase 6: Testing Strategy

### 6.1 Backend Testing

```python
# apps/interviews/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import InterviewSession
from apps.resumes.models import Resume
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class InterviewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass',
            role='administrator'
        )

        self.teacher = User.objects.create_user(
            username='teacher',
            email='teacher@test.com',
            password='testpass',
            role='teacher'
        )

        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass',
            role='student'
        )

        # Create resume
        Resume.objects.create(
            student=self.student,
            content="Software Developer with 3 years experience in Python and Django",
            uploaded_by=self.teacher
        )

    def test_interview_scheduling(self):
        self.client.force_authenticate(user=self.teacher)

        data = {
            'student': self.student.id,
            'scheduled_datetime': (timezone.now() + timedelta(hours=1)).isoformat(),
            'end_datetime': (timezone.now() + timedelta(hours=2)).isoformat(),
            'interview_type': 'technical'
        }

        response = self.client.post('/api/interviews/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        session = InterviewSession.objects.get(id=response.data['id'])
        self.assertEqual(session.student, self.student)
        self.assertEqual(session.teacher, self.teacher)

    def test_interview_access_control(self):
        # Create session
        session = InterviewSession.objects.create(
            student=self.student,
            teacher=self.teacher,
            scheduled_datetime=timezone.now() - timedelta(minutes=30),
            end_datetime=timezone.now() + timedelta(minutes=30),
            interview_type='technical'
        )

        # Test student access
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/interviews/{session.id}/start_interview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test unauthorized access
        other_student = User.objects.create_user(
            username='other_student',
            email='other@test.com',
            password='testpass',
            role='student'
        )
        self.client.force_authenticate(user=other_student)
        response = self.client.post(f'/api/interviews/{session.id}/start_interview/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### 6.2 Frontend Testing

```typescript
// __tests__/components/InterviewSession.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InterviewSession from "../components/student/InterviewSession";
import { AuthProvider } from "../context/AuthContext";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe("InterviewSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("starts interview successfully", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        questions: [
          "What is your experience with Python?",
          "Explain Django ORM",
        ],
      },
    });

    renderWithAuth(<InterviewSession sessionId={1} />);

    const startButton = screen.getByText("Start Interview");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(
        screen.getByText("What is your experience with Python?")
      ).toBeInTheDocument();
    });
  });

  test("submits answer and shows feedback", async () => {
    // Mock start interview
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        questions: ["What is your experience with Python?"],
      },
    });

    // Mock submit answer
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        score: 85,
        feedback: "Good understanding of Python concepts",
      },
    });

    renderWithAuth(<InterviewSession sessionId={1} />);

    // Start interview
    fireEvent.click(screen.getByText("Start Interview"));

    await waitFor(() => {
      expect(
        screen.getByText("What is your experience with Python?")
      ).toBeInTheDocument();
    });

    // Type answer
    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, {
      target: { value: "I have 3 years of experience with Python" },
    });

    // Submit answer
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByText("Score: 85/100")).toBeInTheDocument();
      expect(
        screen.getByText("Good understanding of Python concepts")
      ).toBeInTheDocument();
    });
  });
});
```

## Phase 7: Deployment and DevOps

### 7.1 Production Environment Variables

```bash
# .env.production
# Database
DB_NAME=talentlens_prod
DB_USER=talentlens_user
DB_PASSWORD=your_secure_password
DB_HOST=your_db_host
DB_PORT=5432

# Django
SECRET_KEY=your_very_long_secret_key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Redis
REDIS_URL=redis://your_redis_host:6379/0

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_USE_TLS=True

# Security
SECURE_SSL_REDIRECT=True
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True
```

### 7.2 Production Docker Compose

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: gunicorn talentlens.wsgi:application --bind 0.0.0.0:8000 --workers 3
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    expose:
      - 8000
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    expose:
      - 3000
    environment:
      - NEXT_PUBLIC_API_URL=https://yourdomain.com/api
    restart: unless-stopped

  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

### 7.3 Nginx Configuration

```nginx
# nginx/nginx.conf
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API requests
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_redirect off;
        client_max_body_size 100M;
    }

    # WebSocket connections
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /app/staticfiles/;
    }

    location /media/ {
        alias /app/media/;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-# TalentLens - Complete Development Plan

## Tech Stack Overview
- **Backend**: Django (Python) with Django REST Framework
- **Frontend**: Next.js (React) with TypeScript
- **Database**: PostgreSQL
- **AI Integration**: Google Gemini API
- **Authentication**: JWT tokens with role-based access
- **Real-time Features**: WebSockets (Django Channels)

## Project Structure

```

talentlens/
├── backend/
│ ├── talentlens/
│ │ ├── settings/
│ │ │ ├── base.py
│ │ │ ├── development.py
│ │ │ └── production.py
│ │ ├── urls.py
│ │ └── wsgi.py
│ ├── apps/
│ │ ├── authentication/
│ │ ├── users/
│ │ ├── interviews/
│ │ ├── resumes/
│ │ ├── dashboard/
│ │ └── ai_engine/
│ ├── requirements.txt
│ └── manage.py
├── frontend/
│ ├── components/
│ │ ├── common/
│ │ ├── admin/
│ │ ├── teacher/
│ │ └── student/
│ ├── pages/
│ │ ├── admin/
│ │ ├── teacher/
│ │ └── student/
│ ├── utils/
│ ├── hooks/
│ ├── context/
│ └── styles/
└── docker-compose.yml

````

## Phase 1: Backend Development (Django)

### 1.1 Environment Setup & Database Configuration

#### PostgreSQL Database Schema
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('administrator', 'teacher', 'student')),
    first_name VARCHAR(30),
    last_name VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Teacher-Student Mapping
CREATE TABLE teacher_students (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, student_id)
);

-- Resumes table
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Interview Sessions
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    scheduled_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    interview_type VARCHAR(20) CHECK (interview_type IN ('technical', 'communication', 'aptitude')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview Questions
CREATE TABLE interview_questions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview Responses
CREATE TABLE interview_responses (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES interview_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    ai_feedback TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Analytics
CREATE TABLE performance_analytics (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    technical_score INTEGER,
    communication_score INTEGER,
    aptitude_score INTEGER,
    total_questions INTEGER,
    correct_answers INTEGER,
    completion_time INTEGER, -- in minutes
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
````

#### Django Settings Configuration

```python
# settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'apps.authentication',
    'apps.users',
    'apps.interviews',
    'apps.resumes',
    'apps.dashboard',
    'apps.ai_engine',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'talentlens'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Gemini API Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_MODEL = 'gemini-pro'
```

### 1.2 Django Models

#### User Management Models

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('administrator', 'Administrator'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True)
    profile_picture = models.TextField(blank=True)  # Base64 encoded

    def __str__(self):
        return f"{self.username} ({self.role})"

class TeacherStudentMapping(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='students')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teachers')
    assigned_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'student')
```

#### Resume Models

```python
# apps/resumes/models.py
from django.db import models
from apps.users.models import User

class Resume(models.Model):
    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name='resume')
    content = models.TextField()
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_resumes')
    upload_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Resume for {self.student.username}"
```

#### Interview Models

```python
# apps/interviews/models.py
from django.db import models
from django.utils import timezone
from apps.users.models import User

class InterviewSession(models.Model):
    INTERVIEW_TYPES = [
        ('technical', 'Technical'),
        ('communication', 'Communication'),
        ('aptitude', 'Aptitude'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interview_sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scheduled_sessions')
    scheduled_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    def is_accessible(self):
        now = timezone.now()
        return self.scheduled_datetime <= now <= self.end_datetime

    def __str__(self):
        return f"{self.interview_type} interview for {self.student.username}"

class InterviewQuestion(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_order = models.IntegerField()
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['question_order']

class InterviewResponse(models.Model):
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name='response')
    answer_text = models.TextField()
    score = models.IntegerField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
```

### 1.3 Django Views & API Endpoints

#### Authentication Views

```python
# apps/authentication/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .serializers import UserRegistrationSerializer, UserLoginSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
```

#### Interview Management Views

```python
# apps/interviews/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import InterviewSession, InterviewQuestion, InterviewResponse
from .serializers import InterviewSessionSerializer
from apps.ai_engine.services import GeminiService

class InterviewSessionViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSessionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'administrator':
            return InterviewSession.objects.all()
        elif user.role == 'teacher':
            return InterviewSession.objects.filter(teacher=user)
        else:  # student
            return InterviewSession.objects.filter(student=user)

    @action(detail=True, methods=['post'])
    def start_interview(self, request, pk=None):
        session = self.get_object()

        if not session.is_accessible():
            return Response({'error': 'Interview not accessible at this time'},
                          status=status.HTTP_403_FORBIDDEN)

        if session.status != 'scheduled':
            return Response({'error': 'Interview already started or completed'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Generate questions using Gemini AI
        gemini_service = GeminiService()
        questions = gemini_service.generate_interview_questions(
            session.student.resume.content,
            session.interview_type
        )

        # Save questions to database
        for i, question_text in enumerate(questions):
            InterviewQuestion.objects.create(
                session=session,
                question_text=question_text,
                question_order=i + 1
            )

        session.status = 'in_progress'
        session.save()

        return Response({'message': 'Interview started', 'questions': questions})

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        session = self.get_object()
        question_id = request.data.get('question_id')
        answer_text = request.data.get('answer')

        try:
            question = InterviewQuestion.objects.get(id=question_id, session=session)
        except InterviewQuestion.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get or create response
        response_obj, created = InterviewResponse.objects.get_or_create(
            question=question,
            defaults={'answer_text': answer_text}
        )

        if not created:
            response_obj.answer_text = answer_text
            response_obj.save()

        # Score using Gemini AI
        gemini_service = GeminiService()
        score, feedback = gemini_service.score_answer(
            question.question_text,
            answer_text,
            session.interview_type
        )

        response_obj.score = score
        response_obj.ai_feedback = feedback
        response_obj.save()

        return Response({
            'score': score,
            'feedback': feedback
        })
```

### 1.4 AI Engine Service

```python
# apps/ai_engine/services.py
import google.generativeai as genai
from django.conf import settings
import json
import re

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')

    def generate_interview_questions(self, resume_content, interview_type, num_questions=10):
        prompt = f"""
        Based on the following resume content, generate {num_questions} {interview_type} interview questions.

        Resume Content:
        {resume_content}

        Interview Type: {interview_type}

        Requirements:
        - Questions should be relevant to the candidate's background
        - Difficulty should be appropriate for the experience level mentioned in resume
        - For technical: Focus on skills, technologies, and experience mentioned
        - For communication: Focus on behavioral and situational questions
        - For aptitude: Focus on logical reasoning, problem-solving, and analytical thinking

        Return only the questions as a JSON array of strings.
        """

        response = self.model.generate_content(prompt)

        try:
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
                return questions
        except:
            pass

        # Fallback: parse line by line
        lines = response.text.strip().split('\n')
        questions = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                # Remove numbering and quotes
                question = re.sub(r'^\d+\.?\s*["\']?', '', line)
                question = re.sub(r'["\']?$', '', question)
                if question:
                    questions.append(question)

        return questions[:num_questions]

    def score_answer(self, question, answer, interview_type):
        prompt = f"""
        Evaluate the following interview answer and provide a score and feedback.

        Question: {question}
        Answer: {answer}
        Interview Type: {interview_type}

        Scoring Criteria:
        - Relevance to the question (0-25 points)
        - Technical accuracy (for technical questions) (0-25 points)
        - Clarity of communication (0-25 points)
        - Completeness of answer (0-25 points)

        Provide your response in the following JSON format:
        {{
            "score": <integer from 0-100>,
            "feedback": "<detailed feedback explaining the score>"
        }}
        """

        response = self.model.generate_content(prompt)

        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result.get('score', 0), result.get('feedback', 'No feedback provided')
        except:
            pass

        # Fallback scoring
        return 50, "Unable to generate detailed feedback. Please review manually."
```

## Phase 2: Frontend Development (Next.js)

### 2.1 Project Setup & Structure

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint
cd frontend
npm install axios @types/axios react-hook-form @hookform/resolvers yup
npm install @headlessui/react @heroicons/react
npm install socket.io-client
```

### 2.2 Authentication Context

```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: number;
  username: string;
  email: string;
  role: "administrator" | "teacher" | "student";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common["Authorization"] = `Token ${savedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login/", {
        username,
        password,
      });

      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);

      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      axios.defaults.headers.common["Authorization"] = `Token ${newToken}`;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

### 2.3 Role-Based Route Protection

```typescript
// components/common/ProtectedRoute.tsx
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### 2.4 Interview Component

```typescript
// components/student/InterviewSession.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";

interface Question {
  id: number;
  question_text: string;
  question_order: number;
}

interface InterviewSessionProps {
  sessionId: number;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({ sessionId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const startInterview = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/interviews/${sessionId}/start_interview/`
      );
      setQuestions(
        response.data.questions.map((q: string, index: number) => ({
          id: index + 1,
          question_text: q,
          question_order: index + 1,
        }))
      );
      setSessionStarted(true);
    } catch (error) {
      console.error("Error starting interview:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `/api/interviews/${sessionId}/submit_answer/`,
        {
          question_id: questions[currentQuestionIndex].id,
          answer: answer,
        }
      );

      setScore(response.data.score);
      setFeedback(response.data.feedback);

      // Move to next question after 3 seconds
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setAnswer("");
          setScore(null);
          setFeedback("");
        }
      }, 3000);
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold mb-8">Interview Session</h1>
        <button
          onClick={startInterview}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? "Starting..." : "Start Interview"}
        </button>
      </div>
    );
  }

  if (currentQuestionIndex >= questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold mb-8">Interview Completed!</h1>
        <p>
          Thank you for completing the interview. Results will be available
          shortly.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <span className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {currentQuestion.question_text}
          </h2>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || score !== null}
          />

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {answer.length} characters
            </span>
            <button
              onClick={submitAnswer}
              disabled={loading || !answer.trim() || score !== null}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Answer"}
            </button>
          </div>
        </div>

        {score !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">
              Score: {score}/100
            </h3>
            <p className="text-blue-700">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewSession;
```

## Phase 3: Database & Security Implementation

### 3.1 Security Measures

#### Interview Session Security

```python
# apps/interviews/middleware.py
from django.utils import timezone
from django.http import JsonResponse
from .models import InterviewSession

class InterviewSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if this is an interview-related request
        if '/api/interviews/' in request.path and 'start_interview' in request.path:
            session_id = request.path.split('/')[-2]
            try:
                session = InterviewSession.objects.get(id=session_id)

                # Check if user is authorized
                if request.user != session.student:
                    return JsonResponse({'error': 'Unauthorized'}, status=403)

                # Check time window
                if not session.is_accessible():
                    return JsonResponse({'error': 'Interview not accessible'}, status=403)

            except InterviewSession.DoesNotExist:
                return JsonResponse({'error': 'Session not found'}, status=404)

        response = self.get_response(request)
        return response
```

### 3.2 Real-time Features with WebSockets

```python
# apps/interviews/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import InterviewSession

class InterviewConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.session_group_name = f'interview_{self.session_id}'

        # Join session group
        await self.channel_layer.group_add(
            self.session_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave session group
        await self.channel_layer.group_discard(
            self.session_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']

        if message_type == 'heartbeat':
            # Keep connection alive and track session activity
            await self.send(text_data=json.dumps({
                'type': 'heartbeat_response',
                'timestamp': timezone.now().isoformat()
            }))
```

## Phase 4: Deployment & Production Setup

### 4.1 Docker Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: talentlens
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    environment:
      - DEBUG=1
      - DB_HOST=postgres
      - DB_NAME=talentlens
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_URL=redis://redis:6379/1
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

volumes:
  postgres_data:
```
