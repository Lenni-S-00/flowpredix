from django.urls import path
from .views import hello, sample_data_list, upload_file, test_protected, whoami

# AUTH
from django.contrib import admin

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Data-jutut
    path('hello/', hello),
    path('data/', sample_data_list),
    path('whoami', whoami),
    path('upload/', upload_file),
    # Testilogin
    path('test-protected/', test_protected),

    # Login-jutut
    path('admin/', admin.site.urls),

    path('token/', TokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
]