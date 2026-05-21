from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewSessionViewSet
from .professional_views import ProfessionalInterviewViewSet

router = DefaultRouter()
router.register(r'', InterviewSessionViewSet, basename='interviews')
router.register(r'professional', ProfessionalInterviewViewSet, basename='professional-interviews')

urlpatterns = [
    path('', include(router.urls)),
]
