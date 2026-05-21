from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, SystemAlertViewSet

router = DefaultRouter()
router.register(r'', DashboardViewSet, basename='dashboard')
router.register(r'alerts', SystemAlertViewSet, basename='alerts')

urlpatterns = [
    path('', include(router.urls)),
]
