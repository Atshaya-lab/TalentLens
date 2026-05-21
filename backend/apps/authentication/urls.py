from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    register,
    logout,
    user_profile,
    update_profile,
    change_password,
    test_api  # Add the test endpoint
)

urlpatterns = [
    path('test/', test_api, name='test_api'),  # Add test endpoint
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('signin/', CustomTokenObtainPairView.as_view(), name='signin'),  # Add signin alias
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', register, name='register'),
    path('logout/', logout, name='logout'),
    path('user/', user_profile, name='user_profile_alt'),  # Frontend expects this
    path('profile/', user_profile, name='user_profile'),
    path('profile/update/', update_profile, name='update_profile'),
    path('change-password/', change_password, name='change_password'),
]
