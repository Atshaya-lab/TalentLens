from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User
import uuid

class InterviewSession(models.Model):
    """Model for interview sessions"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
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
        ('cancelled', 'Cancelled'),
        ('terminated', 'Terminated'),
    ]
    
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='interview_sessions',
        limit_choices_to={'role': 'student'}
    )
    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='scheduled_sessions',
        limit_choices_to={'role': 'teacher'}
    )
    scheduled_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    duration_minutes = models.IntegerField(default=60)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Security and monitoring fields
    tab_switches = models.IntegerField(default=0)
    warning_count = models.IntegerField(default=0)
    is_secure_mode = models.BooleanField(default=True)
    session_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    security_config = models.JSONField(default=dict, blank=True)
    security_violations = models.JSONField(default=list, blank=True)
    session_token = models.CharField(max_length=255, null=True, blank=True)
    is_session_valid = models.BooleanField(default=True)
    
    # Enhanced fields for professional interview
    security_metadata = models.JSONField(default=dict, blank=True)
    actual_duration = models.IntegerField(null=True, blank=True)  # Actual duration in minutes
    time_limit = models.IntegerField(default=300)  # Time limit in seconds
    category = models.CharField(max_length=50, blank=True)  # Additional category field
    expected_answer_length = models.CharField(
        max_length=20,
        choices=[
            ('short', 'Short (1-2 sentences)'),
            ('medium', 'Medium (1-2 paragraphs)'),
            ('long', 'Long (3+ paragraphs)')
        ],
        default='medium'
    )
    evaluation_criteria = models.JSONField(default=dict, blank=True)  # Criteria for evaluation
    difficulty_level = models.CharField(
        max_length=20, 
        choices=[
            ('easy', 'Easy'),
            ('medium', 'Medium'), 
            ('hard', 'Hard')
        ],
        default='medium'
    )
    
    class Meta:
        db_table = 'interview_sessions'
        ordering = ['-scheduled_datetime']
    
    def __str__(self):
        return f"{self.interview_type} interview - {self.student.username} by {self.teacher.username}"
    
    def is_accessible(self):
        """Check if interview is currently accessible"""
        now = timezone.now()
        return self.scheduled_datetime <= now <= self.end_datetime and self.status in ['scheduled', 'in_progress']
    
    def is_upcoming(self):
        """Check if interview is upcoming (within next 30 minutes)"""
        now = timezone.now()
        return self.scheduled_datetime > now and (self.scheduled_datetime - now) <= timedelta(minutes=30)
    
    def get_time_remaining(self):
        """Get remaining time in minutes"""
        if self.status != 'in_progress':
            return 0
        
        now = timezone.now()
        if now > self.end_datetime:
            return 0
        
        return int((self.end_datetime - now).total_seconds() / 60)
    
    def calculate_overall_score(self):
        """Calculate overall score from feedback if available, otherwise from responses"""
        # First, try to get the score from feedback (most accurate)
        try:
            feedback = self.feedback
            return feedback.overall_score
        except:
            pass
        
        # Fallback to calculating from individual responses
        responses = self.questions.filter(response__isnull=False).select_related('response')
        if not responses.exists():
            return 0
        
        total_score = sum(q.response.score or 0 for q in responses)
        return round(total_score / responses.count(), 2)

class InterviewQuestion(models.Model):
    """Model for interview questions"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    session = models.ForeignKey(
        InterviewSession, 
        on_delete=models.CASCADE, 
        related_name='questions'
    )
    question_text = models.TextField()
    question_order = models.IntegerField()
    generated_at = models.DateTimeField(auto_now_add=True)
    expected_duration_minutes = models.IntegerField(default=5)
    difficulty_level = models.CharField(
        max_length=10,
        choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')],
        default='medium'
    )
    
    # Enhanced fields for professional interview
    time_limit = models.IntegerField(default=300)  # Time limit in seconds
    category = models.CharField(max_length=50, blank=True)  # Question category
    expected_answer_length = models.CharField(
        max_length=20,
        choices=[
            ('short', 'Short (1-2 sentences)'),
            ('medium', 'Medium (1-2 paragraphs)'),
            ('long', 'Long (3+ paragraphs)')
        ],
        default='medium'
    )
    evaluation_criteria = models.JSONField(default=dict, blank=True)  # Criteria for evaluation
    order = models.IntegerField(default=0)  # Question order in session
    
    class Meta:
        db_table = 'interview_questions'
        ordering = ['question_order']
        unique_together = ('session', 'question_order')
    
    def __str__(self):
        return f"Q{self.question_order}: {self.question_text[:50]}..."

class InterviewResponse(models.Model):
    """Model for interview responses"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    question = models.OneToOneField(
        InterviewQuestion, 
        on_delete=models.CASCADE, 
        related_name='response'
    )
    answer_text = models.TextField()
    score = models.IntegerField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
    time_taken_seconds = models.IntegerField(null=True, blank=True)
    
    # AI scoring breakdown
    relevance_score = models.IntegerField(null=True, blank=True)
    completeness_score = models.IntegerField(null=True, blank=True)
    clarity_score = models.IntegerField(null=True, blank=True)
    example_score = models.IntegerField(null=True, blank=True)
    
    # Enhanced fields for professional interview responses
    audio_recording_url = models.URLField(blank=True)  # URL to audio recording
    transcription_confidence = models.FloatField(null=True, blank=True)  # Transcription confidence score
    evaluation_details = models.JSONField(default=dict, blank=True)  # Detailed evaluation
    response_quality_score = models.IntegerField(null=True, blank=True)  # Quality score out of 100
    
    class Meta:
        db_table = 'interview_responses'
    
    def __str__(self):
        return f"Response to Q{self.question.question_order} - Score: {self.score or 'N/A'}"

class InterviewFeedback(models.Model):
    """Model for overall interview feedback"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    session = models.OneToOneField(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    overall_score = models.IntegerField()
    strengths = models.JSONField(default=list)
    areas_for_improvement = models.JSONField(default=list)
    detailed_feedback = models.TextField()
    recommendations = models.TextField(blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # Score breakdowns
    technical_score = models.IntegerField(null=True, blank=True)
    communication_score = models.IntegerField(null=True, blank=True)
    problem_solving_score = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'interview_feedback'
    
    def __str__(self):
        return f"Feedback for {self.session} - Score: {self.overall_score}/100"

class InterviewAnalytics(models.Model):
    """Model for storing interview analytics"""
    
    # Use UUID as primary key for better security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    session = models.OneToOneField(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    total_questions = models.IntegerField()
    questions_answered = models.IntegerField()
    average_response_time = models.FloatField()  # in seconds
    completion_percentage = models.FloatField()
    performance_trend = models.CharField(
        max_length=20,
        choices=[('improving', 'Improving'), ('declining', 'Declining'), ('stable', 'Stable')],
        default='stable'
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'interview_analytics'
    
    def __str__(self):
        return f"Analytics for {self.session}"
