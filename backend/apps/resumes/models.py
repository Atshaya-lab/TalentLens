from django.db import models
import uuid
from apps.users.models import User

class Resume(models.Model):
    """Model for storing student resumes"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    student = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='resume',
        limit_choices_to={'role': 'student'}
    )
    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    content = models.TextField()  # Extracted text content
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(null=True, blank=True)  # in bytes
    uploaded_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='uploaded_resumes'
    )
    upload_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # AI-analyzed data
    skills_extracted = models.JSONField(default=list, blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    education_details = models.JSONField(default=list, blank=True)
    job_titles = models.JSONField(default=list, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    
    # Analysis metadata
    last_analyzed = models.DateTimeField(null=True, blank=True)
    analysis_version = models.CharField(max_length=10, default='1.0')
    
    class Meta:
        db_table = 'resumes'
        ordering = ['-updated_date', '-upload_date']  # Most recently updated first
    
    def __str__(self):
        return f"Resume for {self.student.username}"
    
    @property
    def word_count(self):
        """Get word count of resume content"""
        return len(self.content.split()) if self.content else 0
    
    def get_skills_list(self):
        """Get skills as a comma-separated string"""
        return ', '.join(self.skills_extracted) if self.skills_extracted else ''

class ResumeAnalysis(models.Model):
    """Model for storing AI analysis of resumes"""
    
    # Default id field (auto-incrementing primary key)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name='analysis'
    )
    overall_score = models.IntegerField(default=0)  # 0-100
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    
    # Detailed scoring
    content_quality_score = models.IntegerField(default=0)
    formatting_score = models.IntegerField(default=0)
    keywords_score = models.IntegerField(default=0)
    experience_relevance_score = models.IntegerField(default=0)
    
    # Career insights
    recommended_roles = models.JSONField(default=list)
    skill_gaps = models.JSONField(default=list)
    market_relevance = models.CharField(
        max_length=20,
        choices=[('high', 'High'), ('medium', 'Medium'), ('low', 'Low')],
        default='medium'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'resume_analysis'
    
    def __str__(self):
        return f"Analysis for {self.resume.student.username} - Score: {self.overall_score}/100"

class ResumeVersion(models.Model):
    """Model for storing resume versions/history"""
    
    # Default id field (auto-incrementing primary key)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.IntegerField()
    content = models.TextField()
    file_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Change tracking
    changes_summary = models.TextField(blank=True)
    improvement_score = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'resume_versions'
        unique_together = ('resume', 'version_number')
        ordering = ['-version_number']
    
    def __str__(self):
        return f"Version {self.version_number} of {self.resume.student.username}'s resume"
