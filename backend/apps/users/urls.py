from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, TeacherStudentMappingViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='users')
router.register(r'mappings', TeacherStudentMappingViewSet, basename='mappings')

urlpatterns = [
    path('', include(router.urls)),
]
