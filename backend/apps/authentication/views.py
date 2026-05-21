from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import authenticate
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    TokenResponseSerializer,
    ChangePasswordSerializer
)

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token obtain view with user data"""
    
    def post(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user
            }
            
            response_serializer = TokenResponseSerializer(response_data)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """User registration endpoint - only allows teacher and admin registration"""
    # Check if the role is student and prevent self-registration
    role = request.data.get('role', '').lower()
    if role == 'student':
        return Response({
            'error': 'Students cannot register themselves. Please contact your teacher to create an account for you.',
            'message': 'Student accounts are created and managed by teachers.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Only allow teacher and administrator self-registration
    if role not in ['teacher', 'administrator']:
        return Response({
            'error': 'Invalid role. Only teachers and administrators can self-register.',
            'allowed_roles': ['teacher', 'administrator']
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user
        }
        
        response_serializer = TokenResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Allow logout without authentication
def logout(request):
    """User logout endpoint"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    user_data = {
        'id': user.id,
        'uuid': str(user.uuid) if user.uuid else None,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'phone_number': user.phone_number,
        'profile_picture': user.profile_picture,
        'date_of_birth': user.date_of_birth,
        'address': user.address,
        'full_name': user.full_name,
        'date_joined': user.date_joined
    }
    return Response(user_data)

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    """Update user profile"""
    user = request.user
    allowed_fields = [
        'first_name', 'last_name', 'phone_number', 
        'profile_picture', 'date_of_birth', 'address'
    ]
    
    for field in allowed_fields:
        if field in request.data:
            setattr(user, field, request.data[field])
    
    user.save()
    return Response({'message': 'Profile updated successfully'})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_api(request):
    """Test API endpoint to check backend connectivity"""
    return Response({
        'message': 'Backend is running successfully!',
        'status': 'connected',
        'version': '1.0.0',
        'django_version': '4.2.7'
    })
