import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class UUIDPrimaryKeyField(models.UUIDField):
    """
    A UUID primary key field that automatically generates UUIDs
    """
    def __init__(self, **kwargs):
        kwargs.setdefault('primary_key', True)
        kwargs.setdefault('editable', False)
        kwargs.setdefault('default', uuid.uuid4)
        super().__init__(**kwargs)


class UUIDField(models.UUIDField):
    """
    A UUID field that automatically generates UUIDs
    """
    def __init__(self, **kwargs):
        kwargs.setdefault('default', uuid.uuid4)
        kwargs.setdefault('editable', False)
        super().__init__(**kwargs)


def generate_uuid():
    """Generate a new UUID"""
    return str(uuid.uuid4())


def generate_short_uuid():
    """Generate a shorter UUID (first 8 characters)"""
    return str(uuid.uuid4())[:8] 