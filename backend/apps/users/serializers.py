from rest_framework import serializers
from .models import User, TeacherStudentMapping, UserPreferences

class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for UserPreferences model"""
    
    class Meta:
        model = UserPreferences
        fields = [
            'theme', 'email_notifications', 'sms_notifications', 
            'push_notifications', 'auto_save_drafts', 'language', 
            'timezone', 'compact_view', 'show_tips', 'profile_visibility'
        ]

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    password = serializers.CharField(write_only=True)
    full_name = serializers.ReadOnlyField()
    preferences = UserPreferencesSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'uuid', 'username', 'email', 'first_name', 'last_name', 
            'full_name', 'role', 'phone_number', 'profile_picture',
            'date_of_birth', 'address', 'has_premium', 'is_active', 'date_joined',
            'password', 'preferences'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'date_joined': {'read_only': True},
        }
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        # Create default preferences for new user
        UserPreferences.get_or_create_for_user(user)
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def to_representation(self, instance):
        """Include preferences in the response"""
        data = super().to_representation(instance)
        if hasattr(instance, 'preferences'):
            data['preferences'] = UserPreferencesSerializer(instance.preferences).data
        else:
            # Create preferences if they don't exist
            preferences = UserPreferences.get_or_create_for_user(instance)
            data['preferences'] = UserPreferencesSerializer(preferences).data
        return data

class TeacherStudentMappingSerializer(serializers.ModelSerializer):
    """Serializer for TeacherStudentMapping model"""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    teacher_email = serializers.CharField(source='teacher.email', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    
    class Meta:
        model = TeacherStudentMapping
        fields = [
            'id', 'teacher', 'student', 'teacher_name', 'student_name',
            'teacher_email', 'student_email', 'assigned_date', 'is_active'
        ]

class StudentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing students"""
    
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ['id', 'uuid', 'username', 'email', 'full_name', 'is_active']
