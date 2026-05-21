from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import User, TeacherStudentMapping, UserPreferences
from .serializers import UserSerializer, TeacherStudentMappingSerializer, StudentListSerializer, UserPreferencesSerializer

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users"""
    
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'administrator':
            return User.objects.all().order_by('first_name', 'last_name', 'username')
        elif user.role == 'teacher':
            # Teachers can see their assigned students
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            return User.objects.filter(Q(id__in=student_ids) | Q(id=user.id)).order_by('first_name', 'last_name', 'username')
        else:
            # Students can only see themselves
            return User.objects.filter(id=user.id).order_by('first_name', 'last_name', 'username')
    
    def create(self, request, *args, **kwargs):
        # Only administrators can create users
        if request.user.role != 'administrator':
            return Response(
                {'error': 'Only administrators can create users'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'put'])
    def preferences(self, request):
        """Get or update user preferences"""
        user = request.user
        
        if request.method == 'GET':
            # Get or create preferences for the user
            preferences = UserPreferences.get_or_create_for_user(user)
            serializer = UserPreferencesSerializer(preferences)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            # Update user preferences
            preferences = UserPreferences.get_or_create_for_user(user)
            serializer = UserPreferencesSerializer(preferences, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['patch'])
    def theme(self, request):
        """Update only the theme preference"""
        user = request.user
        theme = request.data.get('theme')
        
        if theme not in ['light', 'dark', 'auto']:
            return Response(
                {'error': 'Invalid theme. Must be light, dark, or auto.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        preferences = UserPreferences.get_or_create_for_user(user)
        preferences.theme = theme
        preferences.save()
        
        return Response({'theme': preferences.theme})

    @action(detail=False, methods=['get'])
    def students(self, request):
        """Get list of students for teachers and administrators"""
        user = request.user
        
        if user.role == 'administrator':
            students = User.objects.filter(role='student').order_by('first_name', 'last_name', 'username')
        elif user.role == 'teacher':
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            students = User.objects.filter(id__in=student_ids).order_by('first_name', 'last_name', 'username')
        else:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def teachers(self, request):
        """Get list of teachers (admin only)"""
        if request.user.role != 'administrator':
            return Response(
                {'error': 'Only administrators can view teachers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        teachers = User.objects.filter(role='teacher').order_by('first_name', 'last_name', 'username')
        serializer = StudentListSerializer(teachers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def student_limit_info(self, request):
        """Get student limit information for teachers"""
        if request.user.role != 'teacher':
            return Response(
                {'error': 'Only teachers can view student limit information'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user
        return Response({
            'current_student_count': user.current_student_count,
            'student_limit': 3 if not user.has_premium else None,
            'has_premium': user.has_premium,
            'can_add_student': user.can_add_student(),
            'message': 'Premium account - unlimited students' if user.has_premium else f'Free account - {user.current_student_count}/3 students used'
        })

    @action(detail=False, methods=['post'])
    def create_student(self, request):
        """Allow teachers to create student accounts"""
        if request.user.role != 'teacher':
            return Response(
                {'error': 'Only teachers can create student accounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if teacher can add more students (premium feature flag)
        if not request.user.can_add_student():
            current_count = request.user.current_student_count
            return Response(
                {
                    'error': 'Student limit reached', 
                    'message': f'You currently have {current_count} students. Free accounts are limited to 3 students. Upgrade to Premium to add unlimited students.',
                    'current_student_count': current_count,
                    'student_limit': 3,
                    'has_premium': request.user.has_premium
                }, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        data['role'] = 'student'  # Ensure role is student
        
        # Generate username from email if not provided
        if 'username' not in data or not data['username']:
            email = data.get('email', '')
            if email:
                data['username'] = email.split('@')[0]
            else:
                return Response(
                    {'error': 'Email is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'A user with this email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            # Add a number to make it unique
            base_username = data['username']
            counter = 1
            while User.objects.filter(username=f"{base_username}{counter}").exists():
                counter += 1
            data['username'] = f"{base_username}{counter}"
        
        try:
            # Create the student user
            serializer = UserSerializer(data=data)
            if serializer.is_valid():
                student = serializer.save()
                
                # Create the teacher-student mapping
                TeacherStudentMapping.objects.create(
                    teacher=request.user,
                    student=student,
                    is_active=True
                )
                
                return Response({
                    'message': 'Student account created successfully',
                    'student': UserSerializer(student).data,
                    'login_credentials': {
                        'email': student.email,
                        'username': student.username,
                        'temporary_password': data['password']  # In production, this should be sent securely
                    }
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to create student: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get detailed analytics for a specific student"""
        user = request.user
        student = self.get_object()
        
        # Check permissions
        if user.role == 'student' and user.id != student.id:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role == 'teacher':
            # Check if teacher is assigned to this student
            mapping_exists = TeacherStudentMapping.objects.filter(
                teacher=user, student=student, is_active=True
            ).exists()
            if not mapping_exists:
                return Response(
                    {'error': 'Access denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        # Administrators have access to all students
        
        try:
            from apps.interviews.models import InterviewSession, InterviewFeedback
            from django.db.models import Avg, Count
            from datetime import datetime, timedelta
            
            # Get student's interview sessions
            interviews = InterviewSession.objects.filter(
                student=student,
                status='completed',
                feedback__isnull=False
            ).order_by('-created_at')
            
            total_interviews = interviews.count()
            
            if total_interviews > 0:
                # Calculate average scores
                avg_overall = interviews.aggregate(avg=Avg('feedback__overall_score'))['avg'] or 0
                avg_technical = interviews.aggregate(avg=Avg('feedback__technical_score'))['avg'] or 0
                avg_communication = interviews.aggregate(avg=Avg('feedback__communication_score'))['avg'] or 0
                avg_problem_solving = interviews.aggregate(avg=Avg('feedback__problem_solving_score'))['avg'] or 0
                
                # Determine trend (simple logic based on recent vs older interviews)
                recent_interviews = interviews[:5]  # Last 5 interviews
                older_interviews = interviews[5:10]  # Previous 5 interviews
                
                if recent_interviews.exists() and older_interviews.exists():
                    recent_avg = recent_interviews.aggregate(avg=Avg('feedback__overall_score'))['avg'] or 0
                    older_avg = older_interviews.aggregate(avg=Avg('feedback__overall_score'))['avg'] or 0
                    
                    if recent_avg > older_avg + 5:
                        trend = 'improving'
                    elif recent_avg < older_avg - 5:
                        trend = 'declining'
                    else:
                        trend = 'stable'
                else:
                    trend = 'stable'
                
                # Get recent interview details
                recent_interviews_data = []
                for interview in interviews[:10]:  # Last 10 interviews
                    recent_interviews_data.append({
                        'interview_type': interview.interview_type,
                        'date': interview.created_at.isoformat(),
                        'score': interview.feedback.overall_score if interview.feedback else 0,
                        'duration': interview.duration_minutes
                    })
                
                analytics_data = {
                    'total_interviews': total_interviews,
                    'average_score': round(avg_overall, 1),
                    'trend': trend,
                    'skills': {
                        'technical_score': round(avg_technical, 1),
                        'communication_score': round(avg_communication, 1),
                        'problem_solving_score': round(avg_problem_solving, 1)
                    },
                    'recent_interviews': recent_interviews_data
                }
            else:
                analytics_data = {
                    'total_interviews': 0,
                    'average_score': 0,
                    'trend': 'no_data',
                    'skills': {
                        'technical_score': 0,
                        'communication_score': 0,
                        'problem_solving_score': 0
                    },
                    'recent_interviews': []
                }
            
            return Response(analytics_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request, *args, **kwargs):
        """Override list to filter by role parameter if provided"""
        queryset = self.get_queryset()
        
        # Filter by role if provided in query parameters
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
class TeacherStudentMappingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing teacher-student mappings"""
    
    serializer_class = TeacherStudentMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'administrator':
            return TeacherStudentMapping.objects.all().order_by('-assigned_date')
        elif user.role == 'teacher':
            return TeacherStudentMapping.objects.filter(teacher=user).order_by('-assigned_date')
        else:
            return TeacherStudentMapping.objects.filter(student=user).order_by('-assigned_date')
    
    def create(self, request, *args, **kwargs):
        # Only administrators can create mappings
        if request.user.role != 'administrator':
            return Response(
                {'error': 'Only administrators can assign students to teachers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
