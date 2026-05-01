from django.urls import path
from .views import hello, sample_data_list, upload_file

urlpatterns = [
    path('hello/', hello),
    path('data/', sample_data_list),
    path('upload/', upload_file),
]