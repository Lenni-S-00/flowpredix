from django.urls import path
from .views import (
    hello,
    whoami,
    sample_data_list,
    sample_data_summary,
    sample_data_hourly,
    upload_file,
    test_protected,
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("hello/", hello),
    path("whoami", whoami),

    path("data/", sample_data_list),
    path("data/summary/", sample_data_summary),
    path("data/hourly/", sample_data_hourly),
    path("upload/", upload_file),

    path("test-protected/", test_protected),

    path("token/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
]