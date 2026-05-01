'''
LISÄKSI:
OrganizationSerializer
PredictionSerializer
ShiftSerializer (myöhemmin)
'''
from rest_framework import serializers
from .models import SampleData

class SampleDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleData
        fields = '__all__'