from django.db import models

class SampleData(models.Model):
    location = models.CharField(max_length=100)
    timestamp = models.DateTimeField()
    samples_taken = models.IntegerField()
    employees_used = models.IntegerField()

    def __str__(self):
        return f"{self.location} - {self.timestamp}"