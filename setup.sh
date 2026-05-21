#!/bin/bash

# TalentLens Environment Variables
# This file contains all configuration variables for TalentLens

# Database Configuration
export DB_NAME="talentlens_dev"
export DB_USER="postgres"
export DB_PASSWORD="password"
export DB_HOST="localhost"
export DB_PORT="5433"

# Constructed Database URL for Django
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Django Configuration
export SECRET_KEY="django-insecure-your-secret-key-here-change-in-production"
export DEBUG="True"
export ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0"

# Redis Configuration
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_DB="0"

# AI Configuration
export GEMINI_API_KEY=None

# Email Configuration
export EMAIL_HOST="smtp.gmail.com"
export EMAIL_PORT="587"
export EMAIL_HOST_USER="your_email@gmail.com"
export EMAIL_HOST_PASSWORD="your_app_password"
export EMAIL_USE_TLS="True"
export EMAIL_USE_SSL="False"

# CORS Settings
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002"

# UI Application Configuration
export NEXT_PUBLIC_API_URL="http://localhost:8000/api"
export NEXT_PUBLIC_WS_URL="ws://localhost:8000/ws"
export STUDENT_UI_PORT="3000"
export TEACHER_UI_PORT="3001"
export ADMIN_UI_PORT="3002"

# Development Settings
export POSTGRES_MODE="local"
export REDIS_MODE="docker"
export UI_MODE="local"
export LOG_LEVEL="DEBUG"
export DJANGO_DEBUG_TOOLBAR="True"
