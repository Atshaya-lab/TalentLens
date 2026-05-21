from django.contrib import admin
from .models import User, TeacherStudentMapping

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'full_name', 'has_premium', 'is_active', 'date_joined']
    list_filter = ['role', 'has_premium', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    def get_readonly_fields(self, request, obj=None):
        """Make premium field editable only for superusers"""
        if request.user.is_superuser:
            return []
        return ['has_premium']

@admin.register(TeacherStudentMapping)
class TeacherStudentMappingAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'student', 'assigned_date', 'is_active']
    list_filter = ['assigned_date', 'is_active']
    search_fields = ['teacher__username', 'student__username']
