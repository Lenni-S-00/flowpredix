from django.db import models

class SampleData(models.Model):
    location = models.CharField(max_length=100)
    timestamp = models.DateTimeField()
    samples_taken = models.IntegerField()
    employees_used = models.IntegerField()
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["location", "timestamp"],
                name="unique_location_timestamp"
            )
        ]

    def __str__(self):
        return f"{self.location} - {self.timestamp}"