from rest_framework import serializers
from .models import Resume, ResumeAnalysis, ResumeVersion
from apps.users.serializers import UserSerializer

class ResumeAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for resume analysis"""
    
    class Meta:
        model = ResumeAnalysis
        fields = [
            'id', 'overall_score', 'strengths', 'weaknesses', 'suggestions',
            'content_quality_score', 'formatting_score', 'keywords_score',
            'experience_relevance_score', 'recommended_roles', 'skill_gaps',
            'market_relevance', 'created_at', 'updated_at'
        ]

class ResumeVersionSerializer(serializers.ModelSerializer):
    """Serializer for resume versions"""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = ResumeVersion
        fields = [
            'id', 'version_number', 'file_name', 'created_at',
            'created_by', 'created_by_name', 'changes_summary',
            'improvement_score'
        ]

class ResumeSerializer(serializers.ModelSerializer):
    """Serializer for resumes"""
    
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    analysis = ResumeAnalysisSerializer(read_only=True)
    versions = ResumeVersionSerializer(many=True, read_only=True)
    word_count = serializers.ReadOnlyField()
    skills_list = serializers.ReadOnlyField(source='get_skills_list')
    
    class Meta:
        model = Resume
        fields = [
            'id', 'student', 'student_name', 'title', 'description', 'content', 'file_name',
            'file_size', 'uploaded_by', 'uploaded_by_name', 'upload_date',
            'updated_date', 'is_active', 'skills_extracted', 'experience_years',
            'education_details', 'job_titles', 'technologies', 'last_analyzed',
            'analysis_version', 'word_count', 'skills_list', 'analysis', 'versions'
        ]
        read_only_fields = [
            'uploaded_by', 'upload_date', 'updated_date', 'last_analyzed',
            'skills_extracted', 'experience_years', 'education_details',
            'job_titles', 'technologies'
        ]

class ResumeUploadSerializer(serializers.Serializer):
    """Serializer for resume file upload"""
    
    student_id = serializers.IntegerField()
    resume_file = serializers.FileField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_resume_file(self, value):
        """Validate uploaded file"""
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt']
        file_extension = value.name.lower().split('.')[-1]
        
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file format. Allowed formats: {', '.join(allowed_extensions)}"
            )
        
        # Check file size (10MB limit)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 10MB")
        
        return value
    
    def validate_student_id(self, value):
        """Validate student ID"""
        from apps.users.models import User
        
        try:
            student = User.objects.get(id=value, role='student')
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid student ID")
        
        # Check if requesting user has permission to upload for this student
        request = self.context.get('request')
        if request:
            if request.user.role == 'student' and request.user.id != value:
                raise serializers.ValidationError("You can only upload your own resume")
            elif request.user.role == 'teacher':
                from apps.users.models import TeacherStudentMapping
                if not TeacherStudentMapping.objects.filter(
                    teacher=request.user, 
                    student_id=value, 
                    is_active=True
                ).exists():
                    raise serializers.ValidationError("Student is not assigned to you")
        
        return value

class ResumeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing resumes"""
    
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    overall_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Resume
        fields = [
            'id', 'student', 'student_name', 'file_name', 'upload_date',
            'is_active', 'word_count', 'overall_score'
        ]
    
    def get_overall_score(self, obj):
        return obj.analysis.overall_score if hasattr(obj, 'analysis') else None
