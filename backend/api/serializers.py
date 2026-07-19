from rest_framework import serializers

from api.models import (
    Organization,
    PredictionModel,
    SampleData,
)


class SampleDataListSerializer(serializers.ListSerializer):

    # Tallentaa useita SampleData-rivejä yhdellä tietokantaoperaatiolla.
    def create(self, validated_data):
        records = self._create_records(
            validated_data
        )

        return self._bulk_create(records)

    # Muuntaa validoidut tiedot SampleData-olioiksi.
    def _create_records(self, validated_data):
        return [
            SampleData(**item)
            for item in validated_data
        ]

    # Tallentaa SampleData-oliot tietokantaan.
    def _bulk_create(self, records):
        return SampleData.objects.bulk_create(
            records,
            ignore_conflicts=True,
        )


class SampleDataSerializer(serializers.ModelSerializer):

    class Meta:
        model = SampleData
        fields = [
            "organization",
            "id",
            "location",
            "timestamp",
            "samples_taken",
            "employees_used",
        ]
        validators = []
        list_serializer_class = (
            SampleDataListSerializer
        )

    # Validoi näytemäärän.
    def validate_samples_taken(self, value):
        self._validate_required_samples(value)
        self._validate_non_negative(value)

        return float(value)

    # Tarkistaa, että näytemäärä on annettu.
    def _validate_required_samples(self, value):
        if value is None:
            raise serializers.ValidationError(
                "Samples required"
            )

    # Validoi työntekijämäärän.
    def validate_employees_used(self, value):
        self._validate_non_negative(value)

        return float(value)

    # Tarkistaa, ettei arvo ole negatiivinen.
    def _validate_non_negative(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Must be >= 0"
            )

    # Validoi näyte- ja työntekijämäärien välisen säännön.
    def validate(self, data):
        samples, employees = (
            self._get_numeric_fields(data)
        )

        self._validate_numeric_fields(
            samples,
            employees,
        )
        self._validate_employee_limit(
            samples,
            employees,
        )

        return data

    # Palauttaa validoitavat numeeriset kentät.
    def _get_numeric_fields(self, data):
        return (
            data.get("samples_taken"),
            data.get("employees_used"),
        )

    # Tarkistaa, että numeeriset kentät ovat mukana.
    def _validate_numeric_fields(
        self,
        samples,
        employees,
    ):
        if samples is None or employees is None:
            raise serializers.ValidationError(
                "Missing numeric fields"
            )

    # Tarkistaa, etteivät työntekijät ylitä näytemäärää.
    def _validate_employee_limit(
        self,
        samples,
        employees,
    ):
        if employees > samples:
            raise serializers.ValidationError(
                "Employees cannot exceed samples"
            )


class OrganizationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class PredictionResultSerializer(serializers.Serializer):

    date = serializers.DateField()

    location = serializers.CharField()

    predicted_patient_count = (
        serializers.IntegerField(
            min_value=0,
        )
    )

    holiday = serializers.BooleanField(
        default=False,
    )


class PredictionModelSerializer(serializers.ModelSerializer):

    organization_name = serializers.CharField(
        source="organization.name",
        read_only=True,
    )

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
        read_only_fields = fields
