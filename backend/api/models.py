from django.db import models


class Organization(models.Model):
    """
    Organisaatio, johon käyttäjät, näytedata ja ennustemallit kuuluvat.

    Kaikki sovelluksen data on organisaatiokohtaista, jolloin eri
    organisaatioiden tiedot pysyvät erillään.
    """

    name = models.CharField(max_length=255)

    # Tallennetaan automaattisesti organisaation luontiaika.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Organisaatiot näytetään aina aakkosjärjestyksessä.
        ordering = ["name"]

    def __str__(self):
        return self.name


class SampleData(models.Model):
    """
    Yksi tietokantaan tallennettu näytedatarivi.

    Jokainen rivi kuvaa yhden toimipisteen näytemäärää
    tietyllä ajanhetkellä.
    """

    # Näytedata kuuluu yhdelle organisaatiolle.
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="sample_data",
        null=True,      # Voidaan myöhemmin poistaa, kun kaikki data on organisaatiokohtaista.
        blank=True,
    )

    # Toimipiste, esimerkiksi Lab1.
    location = models.CharField(max_length=100)

    # Mittaushetki.
    timestamp = models.DateTimeField()

    # Otettujen näytteiden määrä.
    samples_taken = models.IntegerField()

    # Näytteenottoon käytetty henkilöstömäärä.
    employees_used = models.IntegerField()

    # Tallennushetki tietokantaan.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Samalle toimipisteelle ei voi olla kahta täysin samaa aikaleimaa.
        constraints = [
            models.UniqueConstraint(
                fields=["location", "timestamp"],
                name="unique_location_timestamp",
            )
        ]

    def __str__(self):
        return f"{self.location} - {self.timestamp}"


class PredictionModel(models.Model):
    """
    Tallentaa koulutetun ennustemallin metatiedot.

    Itse sklearn-mallia ei tallenneta tietokantaan, vaan .joblib-tiedostona.
    Tietokannassa säilytetään tiedot siitä, mitä mallia käytetään,
    millä datalla se on koulutettu ja kuinka hyvin se suoriutui.
    """

    # Organisaatio, jolle ennustemalli kuuluu.
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="prediction_models",
        null=True,
        blank=True,
    )

    # Toimipiste, jolle malli on koulutettu.
    #
    # None tarkoittaa kaikkien toimipisteiden yhteistä mallia.
    location = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
    )

    # Tallennetun .joblib-tiedoston nimi tai polku.
    model_file = models.CharField(
        max_length=500,
    )

    # Käytetty koneoppimismalli.
    #
    # Mahdollistaa myöhemmin esimerkiksi XGBoost- tai LightGBM-mallien
    # käyttöönoton ilman tietokantarakenteen muuttamista.
    model_type = models.CharField(
        max_length=100,
        default="RandomForestRegressor",
    )

    # Feature engineering -version tunniste.
    #
    # Jos featuret muuttuvat tulevaisuudessa, voidaan helposti nähdä,
    # millä feature-versiolla kukin malli on koulutettu.
    feature_version = models.PositiveIntegerField(
        default=1,
    )

    # Datan aikaväli, jolla malli on koulutettu.
    training_start = models.DateField()
    training_end = models.DateField()

    # Koulutus- ja testidatan rivimäärät.
    training_rows = models.PositiveIntegerField(
        default=0,
    )

    testing_rows = models.PositiveIntegerField(
        default=0,
    )

    # Mallin arviointimittarit.
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

    # Käytetäänkö tätä mallia ennustamiseen.
    #
    # Vanhoja malleja ei tarvitse poistaa tietokannasta,
    # vaan ne voidaan merkitä epäaktiivisiksi.
    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    # Mallin koulutusajankohta.
    trained_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        # Uusin malli näytetään ensimmäisenä.
        ordering = ["-trained_at"]

        # Nopeuttaa aktiivisen mallin hakemista organisaation
        # ja toimipisteen perusteella.
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

    @property
    def display_location(self):
        """
        Palauttaa käyttöliittymässä näytettävän toimipisteen nimen.

        Jos location on None, kyseessä on kaikkien toimipisteiden
        yhteinen ennustemalli.
        """
        return self.location or "Kaikki näytteenotot"

    def __str__(self):
        """
        Mallin tekstiesitys esimerkiksi Django Adminissa.

        Esimerkki:
        HYKS – Lab1 – 2026-07-16 14:30
        """
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