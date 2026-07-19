from django.db import models


class Organization(models.Model):

    name = models.CharField(
        max_length=255,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["name"]

    # Palauttaa organisaation nimen tekstiesityksenä.
    def __str__(self):
        return self.name


class SampleData(models.Model):

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="sample_data",
        null=True,
        blank=True,
    )

    location = models.CharField(
        max_length=100,
    )

    timestamp = models.DateTimeField()

    samples_taken = models.IntegerField()

    employees_used = models.IntegerField()

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "location",
                    "timestamp",
                ],
                name="unique_location_timestamp",
            )
        ]

    # Palauttaa toimipisteen ja aikaleiman tekstiesityksenä.
    def __str__(self):
        return (
            f"{self.location} - "
            f"{self.timestamp}"
        )


class PredictionModel(models.Model):

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="prediction_models",
        null=True,
        blank=True,
    )

    location = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
    )

    model_file = models.CharField(
        max_length=500,
    )

    model_type = models.CharField(
        max_length=100,
        default="RandomForestRegressor",
    )

    feature_version = models.PositiveIntegerField(
        default=1,
    )

    training_start = models.DateField()

    training_end = models.DateField()

    training_rows = models.PositiveIntegerField(
        default=0,
    )

    testing_rows = models.PositiveIntegerField(
        default=0,
    )

    r2 = models.FloatField(
        null=True,
        blank=True,
    )

    mae = models.FloatField(
        null=True,
        blank=True,
    )

    mse = models.FloatField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    trained_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-trained_at"]

        indexes = [
            models.Index(
                fields=[
                    "organization",
                    "location",
                    "is_active",
                ],
                name="prediction_active_idx",
            )
        ]

    # Palauttaa käyttöliittymässä näytettävän toimipisteen nimen.
    @property
    def display_location(self):
        return (
            self.location
            or "Kaikki näytteenotot"
        )

    # Palauttaa ennustemallin tekstiesityksen.
    def __str__(self):
        organization = (
            self.organization.name
            if self.organization
            else "Ei organisaatiota"
        )

        return (
            f"{organization} – "
            f"{self.display_location} – "
            f"{self.trained_at:%Y-%m-%d %H:%M}"
        )
