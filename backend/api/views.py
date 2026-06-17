from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

# Test view endpointti
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_protected(request):
    return Response({
        "message": "Authenticated successfully",
        "user": request.user.username,
        "organization": (
            request.user.organization.name
            if request.user.organization
            else None
        ),
        "role": request.user.role,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def whoami(request):
    return Response({
        "username": request.user.username,
        "organization": request.user.organization.name,
    })

# Tässä on datan näyttämiseen endpointti
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sample_data_list(request):

    queryset = SampleData.objects.filter(
        organization=request.user.organization
    )

    serializer = SampleDataSerializer(queryset, many=True)

    return Response(serializer.data)

# Create your views here.

# Tällä lisätään dataa
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):

    # Tarkistetaan, onko käyttäjällä organisaatiota.
    if not request.user.organization:
        return Response(
            {"error": "User has no organization"},
            status=400
        )

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
        
        # Lisätään pyynnön tekijän organisaatio organisaatio-sarakkeeksi.
        for record in records:
            record['organization'] = request.user.organization.id
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
    
# LEGACYA
'''
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
'''