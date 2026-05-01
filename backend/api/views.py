from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import SampleData
from .serializers import SampleDataSerializer

import pandas as pd
import numpy as np

# TÄÄLLÄ ON ENDPOINTIT

# Tää on epärelevantti. Voi poistaa tästä ja sit urlista.
@api_view(['GET'])
def hello(request):
    return Response({"message": "Viesti backendistä:\nBackend toimii!"})

# Tässä on datan näyttämiseen endpointti
'''
@api_view(['GET'])
def sample_data_list(request):
    data = SampleData.objects.all().values()
    return Response(data)
'''

# Create your views here.

@api_view(['GET', 'POST'])
def sample_data_list(request):
    if request.method == 'GET':
        data = SampleData.objects.all().order_by('-timestamp')
        serializer = SampleDataSerializer(data, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = SampleDataSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

# Tällä lisätään dataa
@api_view(['POST'])
def upload_file(request):
    file = request.FILES.get('file')
    source = request.data.get('source')  # optional metadata

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        # Detect file type
        # Tätä tweakkaillaan vielä. Mites vaikka .xls?
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.name.endswith('.xlsx'):
            df = pd.read_excel(file)
        else:
            return Response({"error": "Unsupported file type"}, status=400)

        # Normalisoidaan otsikot
        df.columns = df.columns.str.strip().str.lower()

        # Example mapping (adjust to your data)
        column_mapping = {
            "näytteenottopaikka": "location",
            "näytteenottoja": "samples_taken",
            "näytteenottajia": "employees_used",
        }

        df.rename(columns=column_mapping, inplace=True)

        # Combine time columns if needed
        if {"näytteenottovuosi", "näytteenottokk", "näytteenottopv", "näytteenottotunti"}.issubset(df.columns):
            df["timestamp"] = pd.to_datetime({
                "year": df["näytteenottovuosi"], "month": df["näytteenottokk"], "day": df["näytteenottopv"], "hour": df["näytteenottotunti"],}
            )

        # Keep only required columns
        required_columns = ["location", "timestamp", "samples_taken", "employees_used"]
        df = df[required_columns]

        missing = [col for col in required_columns if col not in df.columns]

        if missing:
            return Response({
                "error": "Missing required columns",
                "missing": missing,
                "available": df.columns.tolist()
            }, status=400)

        # Replace NaN with None (JSON-safe)
        df = df.replace([np.nan, np.inf, -np.inf], None)

        # Convert to records (list of dicts)
        records = df.to_dict(orient="records")

        serializer = SampleDataSerializer(data=records, many=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Data saved successfully",
                "rows_saved": len(records)
            })
        else:
            print(serializer.errors)
            return Response(serializer.errors, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)