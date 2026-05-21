
from .base import *

DEBUG = True

# Use PostgreSQL database from base settings (don't override with SQLite)
# DATABASES configuration is inherited from base.py

# Development CORS settings
CORS_ALLOW_ALL_ORIGINS = True

# Development email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Use in-memory channel layer for development instead of Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
