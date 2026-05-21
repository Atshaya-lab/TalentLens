from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from .models import Resume, ResumeAnalysis, ResumeVersion
from .serializers import (
    ResumeSerializer, ResumeListSerializer, ResumeUploadSerializer,
    ResumeAnalysisSerializer, ResumeVersionSerializer
)
from apps.ai_engine.services import GeminiService
from apps.users.models import User, TeacherStudentMapping
import PyPDF2
import docx
import io
import logging

logger = logging.getLogger(__name__)

class ResumeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing resumes"""
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ResumeListSerializer
        elif self.action == 'upload_resume':
            return ResumeUploadSerializer
        return ResumeSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'administrator':
            return Resume.objects.all().order_by('-updated_date', '-upload_date')
        elif user.role == 'teacher':
            # Get resumes of assigned students
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            return Resume.objects.filter(student_id__in=student_ids).order_by('-updated_date', '-upload_date')
        else:  # student
            return Resume.objects.filter(student=user).order_by('-updated_date', '-upload_date')
    
    @action(detail=False, methods=['post'])
    def upload_resume(self, request):
        """Upload and process resume file - Only teachers and admins can upload"""
        # Check permissions - only teachers and administrators can upload resumes
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Only teachers and administrators can upload resumes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ResumeUploadSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        student_id = serializer.validated_data['student_id']
        resume_file = serializer.validated_data['resume_file']
        title = serializer.validated_data.get('title', '')
        description = serializer.validated_data.get('description', '')
        
        try:
            # For teachers, verify they have permission to upload for this student
            if request.user.role == 'teacher':
                student_mapping = TeacherStudentMapping.objects.filter(
                    teacher=request.user,
                    student_id=student_id,
                    is_active=True
                ).first()
                
                if not student_mapping:
                    return Response(
                        {'error': 'You do not have permission to upload resume for this student'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Extract text from file
            content = self._extract_text_from_file(resume_file)
            
            if not content or len(content.strip()) < 50:
                return Response(
                    {'error': 'Resume content appears to be empty or too short'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create student
            student = get_object_or_404(User, id=student_id, role='student')
            
            # Save previous version if resume exists
            existing_resume = Resume.objects.filter(student=student).first()
            if existing_resume:
                self._create_version_backup(existing_resume)
                
                # Update existing resume
                existing_resume.title = title or resume_file.name.replace('.pdf', '').replace('.docx', '').replace('.doc', '')
                existing_resume.description = description
                existing_resume.content = content
                existing_resume.file_name = resume_file.name
                existing_resume.file_size = resume_file.size
                existing_resume.uploaded_by = request.user
                existing_resume.is_active = True
                existing_resume.save()
                resume = existing_resume
            else:
                # Create new resume
                resume = Resume.objects.create(
                    student=student,
                    title=title or resume_file.name.replace('.pdf', '').replace('.docx', '').replace('.doc', ''),
                    description=description,
                    content=content,
                    file_name=resume_file.name,
                    file_size=resume_file.size,
                    uploaded_by=request.user,
                    is_active=True
                )
            
            # Analyze resume with AI
            self._analyze_resume_content(resume)
            
            serializer = ResumeSerializer(resume)
            logger.info(f"Resume uploaded for student {student.username}")
            
            return Response(
                {
                    'message': 'Resume uploaded and analyzed successfully',
                    'resume': serializer.data
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error uploading resume: {str(e)}")
            return Response(
                {'error': f'Failed to process resume: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def analyze_resume(self, request, pk=None):
        """Re-analyze resume with AI"""
        resume = self.get_object()
        
        try:
            self._analyze_resume_content(resume)
            serializer = ResumeSerializer(resume)
            
            return Response({
                'message': 'Resume analyzed successfully',
                'analysis': serializer.data.get('analysis')
            })
            
        except Exception as e:
            logger.error(f"Error analyzing resume: {str(e)}")
            return Response(
                {'error': 'Failed to analyze resume'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def get_analysis(self, request, pk=None):
        """Get detailed resume analysis"""
        resume = self.get_object()
        
        if not hasattr(resume, 'analysis'):
            return Response(
                {'error': 'Resume has not been analyzed yet'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ResumeAnalysisSerializer(resume.analysis)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def get_versions(self, request, pk=None):
        """Get resume version history"""
        resume = self.get_object()
        versions = resume.versions.all()
        serializer = ResumeVersionSerializer(versions, many=True)
        
        return Response({
            'current_version': ResumeSerializer(resume).data,
            'versions': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Get resume text content for preview"""
        resume = self.get_object()
        
        if not resume.content:
            return Response(
                {'error': 'Resume content not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'content': resume.content})
    
    @action(detail=False, methods=['get'])
    def get_skills_statistics(self, request):
        """Get statistics about skills across all resumes"""
        user = request.user
        
        if user.role == 'administrator':
            resumes = Resume.objects.filter(is_active=True)
        elif user.role == 'teacher':
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            resumes = Resume.objects.filter(student_id__in=student_ids, is_active=True)
        else:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Aggregate skills data
        all_skills = []
        all_technologies = []
        
        for resume in resumes:
            if resume.skills_extracted:
                all_skills.extend(resume.skills_extracted)
            if resume.technologies:
                all_technologies.extend(resume.technologies)
        
        # Count occurrences
        from collections import Counter
        skills_counter = Counter(all_skills)
        tech_counter = Counter(all_technologies)
        
        return Response({
            'total_resumes': resumes.count(),
            'top_skills': dict(skills_counter.most_common(10)),
            'top_technologies': dict(tech_counter.most_common(10)),
            'average_experience': resumes.aggregate(
                avg_exp=models.Avg('experience_years')
            )['avg_exp'] or 0
        })
    
    def create(self, request, *args, **kwargs):
        """Override create to add permission check"""
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Only teachers and administrators can create resumes'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Override update to add permission check"""
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Only teachers and administrators can update resumes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For teachers, verify they can update this student's resume
        if request.user.role == 'teacher':
            resume = self.get_object()
            student_mapping = TeacherStudentMapping.objects.filter(
                teacher=request.user,
                student=resume.student,
                is_active=True
            ).first()
            
            if not student_mapping:
                return Response(
                    {'error': 'You do not have permission to update this student\'s resume'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to add permission check"""
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Only teachers and administrators can delete resumes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For teachers, verify they can delete this student's resume
        if request.user.role == 'teacher':
            resume = self.get_object()
            student_mapping = TeacherStudentMapping.objects.filter(
                teacher=request.user,
                student=resume.student,
                is_active=True
            ).first()
            
            if not student_mapping:
                return Response(
                    {'error': 'You do not have permission to delete this student\'s resume'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().destroy(request, *args, **kwargs)
    
    def _extract_text_from_file(self, file):
        """Extract text content from uploaded file"""
        file_extension = file.name.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            return self._extract_pdf_text(file)
        elif file_extension in ['doc', 'docx']:
            return self._extract_docx_text(file)
        elif file_extension == 'txt':
            return file.read().decode('utf-8')
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    def _extract_pdf_text(self, file):
        """Extract text from PDF file"""
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def _extract_docx_text(self, file):
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(io.BytesIO(file.read()))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
    
    def _analyze_resume_content(self, resume):
        """Analyze resume content using AI with comprehensive analysis"""
        try:
            gemini_service = GeminiService()
            # Use the new comprehensive analysis method
            analysis_data = gemini_service.analyze_resume_comprehensive(resume.content)
            
            logger.info(f"AI analysis completed for resume {resume.id}")
            
            # Update resume with extracted data
            resume.skills_extracted = analysis_data.get('skills_extracted', [])
            resume.experience_years = analysis_data.get('experience_years', 0)
            resume.education_details = analysis_data.get('education_details', [])
            resume.job_titles = analysis_data.get('job_titles', [])
            resume.technologies = analysis_data.get('technologies', [])
            resume.last_analyzed = timezone.now()
            resume.save()
            
            # Create or update comprehensive analysis record
            analysis, created = ResumeAnalysis.objects.get_or_create(
                resume=resume,
                defaults={
                    'overall_score': analysis_data.get('overall_score', 50),
                    'content_quality_score': analysis_data.get('content_quality_score', 50),
                    'formatting_score': analysis_data.get('formatting_score', 50),
                    'keywords_score': analysis_data.get('keywords_score', 50),
                    'experience_relevance_score': analysis_data.get('experience_relevance_score', 50),
                    'strengths': analysis_data.get('strengths', []),
                    'weaknesses': analysis_data.get('weaknesses', []),
                    'suggestions': analysis_data.get('suggestions', []),
                    'recommended_roles': analysis_data.get('recommended_roles', []),
                    'skill_gaps': analysis_data.get('skill_gaps', []),
                    'market_relevance': analysis_data.get('market_relevance', 'medium')
                }
            )
            
            if not created:
                # Update existing analysis with new AI data
                analysis.overall_score = analysis_data.get('overall_score', analysis.overall_score)
                analysis.content_quality_score = analysis_data.get('content_quality_score', analysis.content_quality_score)
                analysis.formatting_score = analysis_data.get('formatting_score', analysis.formatting_score)
                analysis.keywords_score = analysis_data.get('keywords_score', analysis.keywords_score)
                analysis.experience_relevance_score = analysis_data.get('experience_relevance_score', analysis.experience_relevance_score)
                analysis.strengths = analysis_data.get('strengths', analysis.strengths)
                analysis.weaknesses = analysis_data.get('weaknesses', analysis.weaknesses)
                analysis.suggestions = analysis_data.get('suggestions', analysis.suggestions)
                analysis.recommended_roles = analysis_data.get('recommended_roles', analysis.recommended_roles)
                analysis.skill_gaps = analysis_data.get('skill_gaps', analysis.skill_gaps)
                analysis.market_relevance = analysis_data.get('market_relevance', analysis.market_relevance)
                analysis.save()
            
            logger.info(f"Resume analysis saved for {resume.student.username} - Score: {analysis.overall_score}/100")
            
        except Exception as e:
            logger.error(f"Error analyzing resume content: {str(e)}")
            # Create a basic analysis record even if AI fails
            self._create_fallback_analysis(resume)

    def _create_fallback_analysis(self, resume):
        """Create a basic analysis when AI fails"""
        try:
            analysis, created = ResumeAnalysis.objects.get_or_create(
                resume=resume,
                defaults={
                    'overall_score': 50,
                    'content_quality_score': 50,
                    'formatting_score': 50,
                    'keywords_score': 50,
                    'experience_relevance_score': 50,
                    'strengths': ['Content Present', 'Resume Uploaded'],
                    'weaknesses': ['Analysis Pending', 'Needs Review'],
                    'suggestions': ['Please contact administrator for manual review'],
                    'recommended_roles': ['To be determined'],
                    'skill_gaps': ['Analysis pending'],
                    'market_relevance': 'medium'
                }
            )
            logger.info(f"Fallback analysis created for resume {resume.id}")
        except Exception as e:
            logger.error(f"Failed to create fallback analysis: {str(e)}")
    
    def _create_version_backup(self, resume):
        """Create a backup version of existing resume"""
        try:
            # Get next version number
            last_version = resume.versions.first()
            next_version = (last_version.version_number + 1) if last_version else 1
            
            ResumeVersion.objects.create(
                resume=resume,
                version_number=next_version,
                content=resume.content,
                file_name=resume.file_name,
                created_by=resume.uploaded_by,
                changes_summary="Updated resume content"
            )
            
        except Exception as e:
            logger.error(f"Error creating resume version backup: {str(e)}")
            # Don't fail the entire operation if backup fails
            pass
