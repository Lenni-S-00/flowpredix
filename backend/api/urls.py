from django.urls import path
from .views import (
    hello,
    whoami,
    sample_data_list,
    data_day,
    data_hourly,
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
    path("data/summary/", data_day),
    path("data/hourly/", data_hourly),
    path("upload/", upload_file),

    path("test-protected/", test_protected),

    path("token/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
]