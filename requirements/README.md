# TalentLens Requirements

This directory contains organized Python dependency files for different environments and purposes.

## Files Overview

### `backend.txt`

Core production dependencies required to run the TalentLens backend application:

- Django REST Framework and core web framework
- Database drivers (PostgreSQL, Redis)
- AI integration libraries
- File processing utilities
- Production server components

### `dev.txt`

Development-only dependencies for enhanced development experience:

- Testing frameworks (pytest, coverage)
- Code quality tools (flake8, black, isort)
- Development utilities (debug toolbar, shell-plus)
- API documentation tools

### `prod.txt`

Additional production-specific dependencies:

- Enhanced production servers (uwsgi)
- Security enhancements
- Monitoring and logging tools
- Performance optimization libraries

## Usage

### Development Environment

Install both backend and development dependencies:

```bash
pip install -r requirements/backend.txt -r requirements/dev.txt
```

### Production Environment

Install backend and production dependencies:

```bash
pip install -r requirements/backend.txt -r requirements/prod.txt
```

### Backend Only

Install only core dependencies:

```bash
pip install -r requirements/backend.txt
```

## Dependency Management

### Adding New Dependencies

1. **Core functionality** → Add to `backend.txt`
2. **Development tools** → Add to `dev.txt`
3. **Production optimizations** → Add to `prod.txt`

### Updating Dependencies

1. **Update individual files** as needed
2. **Test thoroughly** in development environment
3. **Update version pins** for security and stability
4. **Document any breaking changes**

### Version Pinning Strategy

- **Exact versions** (`==`) for critical dependencies
- **Compatible versions** (`~=`) for stable libraries
- **Minimum versions** (`>=`) for utilities with backward compatibility

## Docker Integration

The main `backend/requirements.txt` file includes the backend requirements:

```
-r ../requirements/backend.txt
```

This allows Docker builds to use the organized requirements while maintaining compatibility.

## Environment-Specific Notes

### Development (`dev.txt`)

- Includes testing frameworks for comprehensive test coverage
- Code quality tools for maintaining clean, consistent code
- Debug utilities for easier troubleshooting
- API documentation generators for interactive docs

### Production (`prod.txt`)

- Enhanced WSGI servers for better performance
- Security middleware for production hardening
- Monitoring tools for observability
- Caching optimizations for improved response times

## Troubleshooting

### Common Issues

**Dependency conflicts**:

```bash
# Clear pip cache
pip cache purge

# Use virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements/backend.txt
```

**Version incompatibilities**:

```bash
# Check for outdated packages
pip list --outdated

# Update specific package
pip install --upgrade package_name
```

**Build failures**:

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install python3-dev postgresql-dev build-essential

# Install system dependencies (CentOS/RHEL)
sudo yum install python3-devel postgresql-devel gcc
```

## Best Practices

1. **Use virtual environments** to isolate dependencies
2. **Pin exact versions** for production deployments
3. **Regular security updates** for critical dependencies
4. **Test dependency updates** in staging before production
5. **Document custom requirements** with inline comments
6. **Keep requirements files organized** by purpose and environment
