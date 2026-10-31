from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from accounts.views import (
    ChangeEmailView,
    ChangePasswordView,
    ProfileView,
)

from .views import (
    TrainPredictionModelsView,
    data_availability,
    data_day,
    data_hourly,
    hello,
    hourly_prediction,
    predict_employees,
    predict_patient_flow,
    prediction_models,
    sample_data_list,
    test_protected,
    upload_file,
    whoami,
)


urlpatterns = [
    path("hello/", hello),
    path("whoami", whoami),

    path(
        "profile/",
        ProfileView.as_view(),
        name="profile",
    ),
    path(
        "profile/change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "profile/change-email/",
        ChangeEmailView.as_view(),
        name="change-email",
    ),

    path("data/", sample_data_list),
    path("data/summary/", data_day),
    path("data/hourly/", data_hourly),
    path(
        "data/availability/",
        data_availability,
        name="data-availability",
    ),

    path("upload/", upload_file),

    path(
        "test-protected/",
        test_protected,
    ),

    path(
        "token/",
        TokenObtainPairView.as_view(),
    ),
    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
    ),

    path(
        "predict/",
        predict_patient_flow,
        name="predict-patient-flow",
    ),
    path(
        "predict/hourly/",
        hourly_prediction,
        name="hourly-prediction",
    ),
    path(
        "predict/employees/",
        predict_employees,
        name="predict-employees",
    ),

    path(
        "prediction-models/",
        prediction_models,
        name="prediction-models",
    ),

    path(
        "train-models/",
        TrainPredictionModelsView.as_view(),
        name="train-models",
    ),
]