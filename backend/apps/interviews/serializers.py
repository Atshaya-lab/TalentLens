from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion, InterviewResponse, InterviewFeedback, InterviewAnalytics
from apps.users.serializers import UserSerializer

class InterviewQuestionSerializer(serializers.ModelSerializer):
    """Serializer for interview questions"""
    
    class Meta:
        model = InterviewQuestion
        fields = [
            'id', 'question_text', 'question_order', 'generated_at',
            'expected_duration_minutes', 'difficulty_level'
        ]

class InterviewResponseSerializer(serializers.ModelSerializer):
    """Serializer for interview responses"""
    
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    question_order = serializers.IntegerField(source='question.question_order', read_only=True)
    
    class Meta:
        model = InterviewResponse
        fields = [
            'id', 'question', 'question_text', 'question_order',
            'answer_text', 'score', 'ai_feedback', 'answered_at',
            'time_taken_seconds', 'relevance_score', 'completeness_score',
            'clarity_score', 'example_score'
        ]

class InterviewFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for interview feedback"""
    
    class Meta:
        model = InterviewFeedback
        fields = [
            'id', 'overall_score', 'strengths', 'areas_for_improvement',
            'detailed_feedback', 'recommendations', 'generated_at',
            'technical_score', 'communication_score', 'problem_solving_score'
        ]

class InterviewAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for interview analytics"""
    
    class Meta:
        model = InterviewAnalytics
        fields = [
            'id', 'total_questions', 'questions_answered',
            'average_response_time', 'completion_percentage',
            'performance_trend', 'generated_at'
        ]

class InterviewSessionSerializer(serializers.ModelSerializer):
    """Serializer for interview sessions"""
    
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    questions = InterviewQuestionSerializer(many=True, read_only=True)
    feedback = InterviewFeedbackSerializer(read_only=True)
    analytics = InterviewAnalyticsSerializer(read_only=True)
    time_remaining = serializers.SerializerMethodField()
    overall_score = serializers.SerializerMethodField()
    
    class Meta:
        model = InterviewSession
        fields = [
            'id', 'student', 'teacher', 'student_name', 'teacher_name',
            'scheduled_datetime', 'end_datetime', 'interview_type', 'status',
            'duration_minutes', 'instructions', 'created_at', 'updated_at',
            'started_at', 'completed_at', 'tab_switches', 'warning_count',
            'is_secure_mode', 'session_id', 'security_config', 'security_violations',
            'session_token', 'is_session_valid', 'questions', 'feedback', 'analytics',
            'time_remaining', 'overall_score'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'started_at', 'completed_at',
            'tab_switches', 'warning_count', 'session_token'
        ]
    
    def get_time_remaining(self, obj):
        return obj.get_time_remaining()
    
    def get_overall_score(self, obj):
        return obj.calculate_overall_score()
    
    def validate(self, attrs):
        """Validate interview session data"""
        if 'end_datetime' in attrs and 'scheduled_datetime' in attrs:
            if attrs['end_datetime'] <= attrs['scheduled_datetime']:
                raise serializers.ValidationError("End time must be after start time")
        
        return attrs

class InterviewSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating interview sessions"""
    
    class Meta:
        model = InterviewSession
        fields = [
            'student', 'scheduled_datetime', 'end_datetime',
            'interview_type', 'duration_minutes', 'instructions',
            'is_secure_mode', 'session_id', 'security_config'
        ]
    
    def validate_student(self, value):
        """Validate that the student is assigned to the requesting teacher"""
        request = self.context.get('request')
        if request and request.user.role == 'teacher':
            from apps.users.models import TeacherStudentMapping
            if not TeacherStudentMapping.objects.filter(
                teacher=request.user, 
                student=value, 
                is_active=True
            ).exists():
                raise serializers.ValidationError("Student is not assigned to you")
        return value

class InterviewSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing interview sessions"""
    
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    overall_score = serializers.SerializerMethodField()
    
    class Meta:
        model = InterviewSession
        fields = [
            'id', 'student_name', 'teacher_name', 'scheduled_datetime',
            'interview_type', 'status', 'duration_minutes', 'overall_score'
        ]
    
    def get_overall_score(self, obj):
        return obj.calculate_overall_score()

class QuestionResponseSerializer(serializers.Serializer):
    """Serializer for submitting question responses"""
    
    question_id = serializers.IntegerField()
    answer_text = serializers.CharField(max_length=5000)
    time_taken_seconds = serializers.IntegerField(required=False)
    
    def validate_answer_text(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Answer must be at least 10 characters long")
        return value
