# Määrittelee organisaatiot, organisaatiokohtaiset lähdedatat
# sekä koulutettujen ennustemallien metatiedot.

from django.db import models


class Organization(models.Model):
    """Määrittelee sovelluksessa olevan asiakasorganisaation."""

    name = models.CharField(
        max_length=255,
        unique=True,
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
    """Tallentaa organisaatio 1:n toimipistekohtaisen näytedatan."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="sample_data",
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
                    "organization",
                    "location",
                    "timestamp",
                ],
                name="unique_org_location_timestamp",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "organization",
                    "location",
                    "timestamp",
                ],
                name="sample_org_location_idx",
            )
        ]

    # Palauttaa organisaation, toimipisteen ja aikaleiman.
    def __str__(self):
        return (
            f"{self.organization.name} - "
            f"{self.location} - "
            f"{self.timestamp}"
        )


class AppointmentData(models.Model):
    """Tallentaa organisaatio 2:n ajanvarausdatan analyysia varten."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="appointment_data",
    )

    # Toimipiste.
    location = models.CharField(
        max_length=255,
    )

    # Palvelutyyppi.
    service = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Varauksen tunniste. Voi puuttua varaamattomilta sloteilta.
    reservation_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Huoneen tai laitteen tunniste.
    resource_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Tarjotun ajanvarauskapasiteetin alku ja loppu.
    slot_start = models.DateTimeField(
        null=True,
        blank=True,
    )

    slot_end = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Kertoo, onko slotti varattavissa.
    available = models.BooleanField(
        null=True,
        blank=True,
    )

    # Lähdejärjestelmän varaustilat.
    reservation_status = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    reservation_status_modified = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Varauksen tekemisen ajankohta.
    reservation_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Asiakkaan saapumisen ajankohta.
    arrival_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Ensimmäisen palvelukutsun ajankohta.
    call_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Palvelun aloituksen ajankohta.
    service_start_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Palvelun valmistumisen ajankohta.
    completion_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        indexes = [
            # Nopeuttaa toimipiste- ja aikaperusteisia kapasiteettihakuja.
            models.Index(
                fields=[
                    "organization",
                    "location",
                    "slot_start",
                ],
                name="appt_org_location_idx",
            ),

            # Nopeuttaa varauksen tunnisteella tehtäviä hakuja.
            models.Index(
                fields=[
                    "organization",
                    "reservation_id",
                ],
                name="appt_reservation_idx",
            ),
        ]

    # Palauttaa toimipisteen ja varauksen tunnisteen.
    def __str__(self):
        return (
            f"{self.organization.name} - "
            f"{self.location} - "
            f"{self.reservation_id or 'Ei varausta'}"
        )


class QueueData(models.Model):
    """Tallentaa organisaatio 2:n vuoronumerodatan analyysia varten."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="queue_data",
    )

    # Laboratorio tai muu toimipiste.
    location = models.CharField(
        max_length=255,
    )

    # Vuoronumerojono.
    queue = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Palvelutapahtuman yksilöivä tunniste.
    event_id = models.CharField(
        max_length=255,
    )

    # Asiakkaan saapumisen ajankohta.
    arrival_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Palvelutapahtuman viimeinen tila.
    final_status = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Lähdejärjestelmän tieto aikaleimojen kattavuudesta.
    coverage = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # Ensimmäisen palvelukutsun ajankohta.
    first_call_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Palvelun aloituksen ajankohta.
    service_start_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Palvelun valmistumisen ajankohta.
    completion_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Jonolle määritelty palvelulupaus minuutteina.
    service_promise_minutes = models.FloatField(
        null=True,
        blank=True,
    )

    # Lähdejärjestelmän palvelulupaustiedot.
    service_promise_given = models.BooleanField(
        null=True,
        blank=True,
    )

    service_promise_fulfilled = models.BooleanField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        constraints = [
            # Sama tapahtuma voi esiintyä vain kerran organisaation sisällä.
            models.UniqueConstraint(
                fields=[
                    "organization",
                    "event_id",
                ],
                name="unique_org_queue_event",
            )
        ]

        indexes = [
            # Nopeuttaa toimipisteen saapumisdatan hakuja.
            models.Index(
                fields=[
                    "organization",
                    "location",
                    "arrival_timestamp",
                ],
                name="queue_org_location_idx",
            ),

            # Nopeuttaa jonokohtaisia hakuja.
            models.Index(
                fields=[
                    "organization",
                    "queue",
                ],
                name="queue_org_queue_idx",
            ),
        ]

    # Palauttaa toimipisteen ja tapahtuman tunnisteen.
    def __str__(self):
        return (
            f"{self.organization.name} - "
            f"{self.location} - "
            f"{self.event_id}"
        )


class PredictionModel(models.Model):
    """Tallentaa organisaatiolle koulutetun ennustemallin metatiedot."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="prediction_models",
    )

    # Tyhjä location tarkoittaa kaikkien toimipisteiden yhteistä mallia.
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

    # Palauttaa ennustemallin organisaation, toimipisteen ja koulutusajan.
    def __str__(self):
        return (
            f"{self.organization.name} – "
            f"{self.display_location} – "
            f"{self.trained_at:%Y-%m-%d %H:%M}"
        )