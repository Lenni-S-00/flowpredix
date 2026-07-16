from rest_framework import serializers

from api.models import (
    Organization,
    PredictionModel,
    SampleData,
)


class SampleDataListSerializer(serializers.ListSerializer):
    """
    Käytetään silloin, kun serializerille annetaan monta SampleData-riviä.

    Oletuksena DRF loisi jokaisen rivin yksitellen, mutta bulk_create()
    tekee yhden tehokkaan tietokantaoperaation.

    ignore_conflicts=True ohittaa mahdolliset duplikaatit eikä keskeytä
    koko tuontia.
    """

    def create(self, validated_data):
        return SampleData.objects.bulk_create(
            [
                SampleData(**item)
                for item in validated_data
            ],
            ignore_conflicts=True,
        )


class SampleDataSerializer(serializers.ModelSerializer):
    """
    Serializer SampleData-mallille.

    Vastaa:
    - yksittäisten rivien validoinnista
    - bulk-tallennuksesta ListSerializerin kautta
    - API-vastausten muodostamisesta
    """

    class Meta:
        model = SampleData

        # Kentät, jotka sallitaan API:n kautta.
        fields = [
            "organization",
            "id",
            "location",
            "timestamp",
            "samples_taken",
            "employees_used",
        ]

        # Mallin omia validaattoreita ei käytetä tässä serializerissa.
        validators = []

        # Kun serializer saa many=True, käytetään tätä ListSerializeria.
        list_serializer_class = SampleDataListSerializer

    def validate_samples_taken(self, value):
        """
        Varmistaa, että näytemäärä on annettu
        eikä se voi olla negatiivinen.
        """
        if value is None:
            raise serializers.ValidationError(
                "Samples required"
            )

        if value < 0:
            raise serializers.ValidationError(
                "Must be >= 0"
            )

        return float(value)

    def validate_employees_used(self, value):
        """
        Varmistaa, ettei työntekijämäärä voi olla negatiivinen.
        """
        if value < 0:
            raise serializers.ValidationError(
                "Must be >= 0"
            )

        return float(value)

    def validate(self, data):
        """
        Kenttien välinen validointi.

        validate_<kenttä>() tarkistaa yksittäiset kentät.
        validate() tarkistaa useamman kentän välisiä sääntöjä.
        """

        samples = data.get("samples_taken")
        employees = data.get("employees_used")

        if samples is None or employees is None:
            raise serializers.ValidationError(
                "Missing numeric fields"
            )

        # Liiketoimintasääntö:
        # työntekijöitä ei voi olla enemmän kuin näytteitä.
        if employees > samples:
            raise serializers.ValidationError(
                "Employees cannot exceed samples"
            )

        return data


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer organisaation perustiedoille.
    """

    class Meta:
        model = Organization

        fields = [
            "id",
            "name",
            "created_at",
        ]

        # Näitä kenttiä ei voi muokata API:n kautta.
        read_only_fields = [
            "id",
            "created_at",
        ]


class PredictionResultSerializer(serializers.Serializer):
    """
    Serializer PredictionServicen palauttamille ennusteriveille.

    Huomio:
    Tämä EI ole ModelSerializer, koska ennusteita ei tallenneta
    tietokantaan. PredictionService muodostaa rivit Python-sanakirjoina,
    ja serializer vain validoi sekä muotoilee vastauksen.
    """

    date = serializers.DateField()

    location = serializers.CharField()

    predicted_patient_count = serializers.IntegerField(
        min_value=0,
    )

    holiday = serializers.BooleanField(
        default=False,
    )


class PredictionModelSerializer(serializers.ModelSerializer):
    """
    Serializer PredictionModel-mallille.

    Käytetään mallirekisterin tietojen näyttämiseen frontendissä.
    """

    # Näytetään organisaation nimi ilman erillistä frontend-hakua.
    organization_name = serializers.CharField(
        source="organization.name",
        read_only=True,
    )

    # Mallissa oleva property, joka palauttaa käyttäjäystävällisen
    # toimipisteen nimen.
    display_location = serializers.CharField(
        read_only=True,
    )

    class Meta:
        model = PredictionModel

        fields = [
            "id",
            "organization",
            "organization_name",
            "location",
            "display_location",
            "model_file",
            "model_type",
            "feature_version",
            "training_start",
            "training_end",
            "training_rows",
            "testing_rows",
            "r2",
            "mae",
            "mse",
            "is_active",
            "trained_at",
        ]

        # PredictionModelia luetaan API:n kautta,
        # mutta sitä ei muokata tämän serializerin avulla.
        read_only_fields = fields