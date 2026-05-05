'''
LISÄKSI:
OrganizationSerializer
PredictionSerializer
ShiftSerializer (myöhemmin)
'''
from rest_framework import serializers
from .models import SampleData

class SampleDataListSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        return SampleData.objects.bulk_create([
            SampleData(**item) for item in validated_data
        ], ignore_conflicts=True)

class SampleDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleData
        fields = ["id", "location", "timestamp", "samples_taken", "employees_used"]
        validators = []
        list_serializer_class = SampleDataListSerializer

    def validate_samples_taken(self, value):
        if value is None:
            raise serializers.ValidationError("Samples required")
        if value < 0:
            raise serializers.ValidationError("Must be >= 0")
        return float(value)

    def validate_employees_used(self, value):
        if value < 0:
            raise serializers.ValidationError("Must be >= 0")
        return float(value)

    # Problem here
    def validate(self, data):
        samples = data.get("samples_taken")
        employees = data.get("employees_used")
        if samples is None or employees is None:
            raise serializers.ValidationError("Missing numeric fields")
        if employees > samples:
            raise serializers.ValidationError(
                "Employees cannot exceed samples"
            )

        return data
    '''
    def create(self, validated_data):
        objs = []
        for item in validated_data:
            if not isinstance(item, dict):
                raise TypeError(f"Expected dict, got {type(item)}: {item}")

            objs.append(SampleData(**item))
        # Ennen tätä voi vielä tarkistaa duplikaatit monimutkaisemmin, mutta tämä toimii myös.
        # ignore_conflicts = True hoitaa tämän nyt tällä erää.
        created = SampleData.objects.bulk_create(objs, ignore_conflicts=True)
        return created
    '''