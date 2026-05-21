from django.contrib import admin
from .models import InterviewSession, InterviewQuestion, InterviewResponse, InterviewFeedback, InterviewAnalytics

@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'student', 'teacher', 'interview_type', 
        'status', 'scheduled_datetime', 'overall_score'
    ]
    list_filter = ['status', 'interview_type', 'scheduled_datetime']
    search_fields = ['student__username', 'teacher__username']
    readonly_fields = ['created_at', 'updated_at', 'started_at', 'completed_at']
    
    def overall_score(self, obj):
        return obj.calculate_overall_score()
    overall_score.short_description = 'Overall Score'

@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'question_order', 'difficulty_level', 'generated_at']
    list_filter = ['difficulty_level', 'generated_at']
    search_fields = ['question_text', 'session__student__username']

@admin.register(InterviewResponse)
class InterviewResponseAdmin(admin.ModelAdmin):
    list_display = ['id', 'question', 'score', 'answered_at']
    list_filter = ['score', 'answered_at']
    search_fields = ['question__question_text', 'answer_text']

@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'overall_score', 'generated_at']
    list_filter = ['overall_score', 'generated_at']
    search_fields = ['session__student__username']

@admin.register(InterviewAnalytics)
class InterviewAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'session', 'completion_percentage', 
        'performance_trend', 'generated_at'
    ]
    list_filter = ['performance_trend', 'generated_at']
