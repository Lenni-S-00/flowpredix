from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SampleData(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='sample_data',
        null=True, # Nämä otetaan pois
        blank=True
    )

    location = models.CharField(max_length=100)
    timestamp = models.DateTimeField()
    samples_taken = models.IntegerField()
    employees_used = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["location", "timestamp"],
                name="unique_location_timestamp"
            )
        ]

    def __str__(self):
        return f"{self.location} - {self.timestamp}"
