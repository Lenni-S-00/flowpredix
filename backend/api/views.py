from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import SampleData
from .serializers import SampleDataSerializer
from .services.ingestion import process_file
from .services.finalization import create_records

import pandas as pd

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

        df, missing = process_file(df)

        if missing:
            return Response({
                "error": "Missing required columns",
                "missing": missing
            }, status=400)

        records = create_records(df)
        #print("DF SHAPE:", df.shape)
        #print("COLUMNS:", df.columns.tolist())
        #print(df.head())
        #print(df.dtypes)
        #print("records:", records)
        #print("TYPE:", type(records))
        '''
        for i, r in enumerate(records):
            print(i, type(r), r)
        '''
        serializer = SampleDataSerializer(data=records, many=True)
        
        serializer.is_valid(raise_exception=True)
        print("\n")
        print(serializer.errors)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Data saved successfully",
                "rows_received": len(records),
                "rows_inserted": len(serializer.validated_data)
            })
        else:
            print(serializer.errors)
            return Response(serializer.errors, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)