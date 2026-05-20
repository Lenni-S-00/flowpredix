from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):

    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        ANALYST = "ANALYST", "Analyst"
        VIEWER = "VIEWER", "Viewer"
    
    organization = models.ForeignKey(
        'api.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users'
    )

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.VIEWER
    )