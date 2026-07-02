from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncHour
import pandas as pd

from .models import SampleData
from .serializers import SampleDataSerializer
from .services.ingestion import process_file
from .services.finalization import create_records


@api_view(["GET"])
def hello(request):
    return Response({"message": "Backend toimii!"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def whoami(request):
    return Response({
        "username": request.user.username,
        "organization": (
            request.user.organization.name
            if request.user.organization
            else None
        ),
        "role": getattr(request.user, "role", None),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sample_data_list(request):
    queryset = SampleData.objects.filter(
        organization=request.user.organization
    ).order_by("-timestamp")

    page_number = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 100))

    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number)

    serializer = SampleDataSerializer(page.object_list, many=True)

    return Response({
        "results": serializer.data,
        "page": page_number,
        "page_size": page_size,
        "total_rows": paginator.count,
        "total_pages": paginator.num_pages,
        "has_next": page.has_next(),
        "has_previous": page.has_previous(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sample_data_summary(request):
    queryset = SampleData.objects.filter(
        organization=request.user.organization
    )

    start = request.GET.get("start")
    end = request.GET.get("end")
    locations = request.GET.get("locations")

    if start:
        queryset = queryset.filter(timestamp__date__gte=start)

    if end:
        queryset = queryset.filter(timestamp__date__lte=end)

    if locations:
        location_list = locations.split(",")
        queryset = queryset.filter(location__in=location_list)

    summary = (
        queryset
        .annotate(date=TruncDate("timestamp"))
        .values("date", "location")
        .annotate(
            realized=Sum("samples_taken"),
            employees_used=Sum("employees_used"),
        )
        .order_by("date", "location")
    )

    data = [
        {
            "date": row["date"],
            "location": row["location"],
            "realized": row["realized"] or 0,
            "forecast": row["realized"] or 0,
            "employees_used": row["employees_used"] or 0,
        }
        for row in summary
    ]

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sample_data_hourly(request):
    queryset = SampleData.objects.filter(
        organization=request.user.organization
    )

    start = request.GET.get("start")
    end = request.GET.get("end")
    locations = request.GET.get("locations")

    if start:
        queryset = queryset.filter(timestamp__date__gte=start)

    if end:
        queryset = queryset.filter(timestamp__date__lte=end)

    if locations:
        location_list = locations.split(",")
        queryset = queryset.filter(location__in=location_list)

    hourly = (
        queryset
        .annotate(hour=TruncHour("timestamp"))
        .values("hour", "location")
        .annotate(
            realized=Sum("samples_taken"),
            employees_used=Sum("employees_used"),
        )
        .order_by("hour", "location")
    )

    data = [
        {
            "date": row["hour"].date(),
            "hour": row["hour"],
            "location": row["location"],
            "realized": row["realized"] or 0,
            "forecast": row["realized"] or 0,
            "employees_used": row["employees_used"] or 0,
        }
        for row in hourly
    ]

    return Response(data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_file(request):
    if not request.user.organization:
        return Response(
            {"error": "User has no organization"},
            status=400
        )

    file = request.FILES.get("file")
    source = request.data.get("source")

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:
        if file.name.endswith(".csv"):
            df = pd.read_csv(file)
        elif file.name.endswith(".xlsx"):
            df = pd.read_excel(file)
        else:
            return Response({"error": "Unsupported file type"}, status=400)

        df, missing = process_file(df)

        if missing:
            return Response({
                "error": "Missing required columns",
                "missing": missing,
            }, status=400)

        records = create_records(df)

        for record in records:
            record["organization"] = request.user.organization.id

        serializer = SampleDataSerializer(data=records, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": "Data saved successfully",
            "rows_received": len(records),
            "rows_inserted": len(serializer.validated_data),
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
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
        "role": getattr(request.user, "role", None),
    })