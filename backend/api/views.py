import pandas as pd

from django.core.paginator import Paginator
from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncHour

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PredictionModel, SampleData
from .serializers import (
    PredictionModelSerializer,
    PredictionResultSerializer,
    SampleDataSerializer,
)
from .services.finalization import create_records
from .services.ingestion import process_file
from api.services.prediction import PredictionService
from api.services.hourly_prediction import HourlyPredictionService
from api.services.employee_estimation import (EmployeeEstimator)

from django.core.management import call_command
from rest_framework.views import APIView

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_availability(request):
    """
    Palauttaa päivät, joilta valitulla toimipisteellä on toteutunutta dataa.
    """

    location = request.query_params.get("location")

    queryset = SampleData.objects.filter(
        organization=request.user.organization
    )

    if location:
        queryset = queryset.filter(location=location)

    date_rows = (
        queryset
        .annotate(data_date=TruncDate("timestamp"))
        .values_list("data_date", flat=True)
        .distinct()
        .order_by("data_date")
    )

    dates = [
        date.isoformat()
        for date in date_rows
        if date is not None
    ]

    return Response({
        "location": location,
        "dates": dates,
        "first_date": dates[0] if dates else None,
        "last_date": dates[-1] if dates else None,
        "day_count": len(dates),
    })

@api_view(["GET"])
def hello(request):
    """
    Yksinkertainen test endpoint, jolla voidaan varmistaa,
    että Django-backend vastaa pyyntöihin.
    """
    return Response({
        "message": "Backend toimii!",
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def whoami(request):
    """
    Palauttaa kirjautuneen käyttäjän perustiedot.
    Käytetään esimerkiksi frontendissä käyttäjän ja organisaation
    tarkistamiseen JWT-kirjautumisen jälkeen.
    """
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
    """
    Palauttaa kirjautuneen käyttäjän organisaation SampleData-rivit
    sivutettuna.

    Query-parametrit:
    - page: sivunumero, oletus 1
    - page_size: rivien määrä sivulla, oletus 100, enintään 1000
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Käyttäjä saa nähdä vain oman organisaationsa datan.
    queryset = SampleData.objects.filter(
        organization=request.user.organization,
    ).order_by("-timestamp")

    try:
        # Sivunumero ei voi olla pienempi kuin 1.
        page_number = max(
            1,
            int(request.GET.get("page", 1)),
        )

        # Sivukoko rajataan välille 1–1000.
        page_size = min(
            1000,
            max(
                1,
                int(request.GET.get("page_size", 100)),
            ),
        )
    except (TypeError, ValueError):
        return Response(
            {
                "error": "page- ja page_size-arvojen pitää olla kokonaislukuja.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number)

    serializer = SampleDataSerializer(
        page.object_list,
        many=True,
    )

    return Response({
        "results": serializer.data,
        "page": page.number,
        "page_size": page_size,
        "total_rows": paginator.count,
        "total_pages": paginator.num_pages,
        "has_next": page.has_next(),
        "has_previous": page.has_previous(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_day(request):
    """
    Palauttaa näytedatan päivätasolle summattuna.

    Query-parametrit:
    - start: aikavälin alkupäivä muodossa YYYY-MM-DD
    - end: aikavälin loppupäivä muodossa YYYY-MM-DD
    - locations: pilkulla eroteltu lista toimipisteistä

    Esimerkki:
    /api/data/summary/?start=2026-01-01&end=2026-01-31&locations=Lab1,Lab2
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Kaikki haut rajataan käyttäjän omaan organisaatioon.
    queryset = SampleData.objects.filter(
        organization=request.user.organization,
    )

    start = request.GET.get("start")
    end = request.GET.get("end")
    locations = request.GET.get("locations")

    # Rajataan data alkupäivästä eteenpäin.
    if start:
        queryset = queryset.filter(
            timestamp__date__gte=start,
        )

    # Rajataan data loppupäivään asti.
    if end:
        queryset = queryset.filter(
            timestamp__date__lte=end,
        )

    # Muutetaan pilkulla eroteltu toimipistelista Python-listaksi.
    if locations:
        location_list = [
            location.strip()
            for location in locations.split(",")
            if location.strip()
        ]

        if location_list:
            queryset = queryset.filter(
                location__in=location_list,
            )

    # Ryhmitellään rivit päivämäärän ja toimipisteen mukaan.
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

    # Muodostetaan frontendin odottama vastausrakenne.
    data = [
        {
            "date": row["date"],
            "location": row["location"],
            "realized": row["realized"] or 0,
            "forecast": 0,
            "employees_used": row["employees_used"] or 0,
        }
        for row in summary
    ]

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_hourly(request):
    """
    Palauttaa näytedatan tuntitasolle summattuna.

    Query-parametrit ovat samat kuin data_day-endpointissa:
    - start
    - end
    - locations
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    queryset = SampleData.objects.filter(
        organization=request.user.organization,
    )

    start = request.GET.get("start")
    end = request.GET.get("end")
    locations = request.GET.get("locations")

    if start:
        queryset = queryset.filter(
            timestamp__date__gte=start,
        )

    if end:
        queryset = queryset.filter(
            timestamp__date__lte=end,
        )

    if locations:
        location_list = [
            location.strip()
            for location in locations.split(",")
            if location.strip()
        ]

        if location_list:
            queryset = queryset.filter(
                location__in=location_list,
            )

    # Ryhmitellään data tunnin ja toimipisteen mukaan.
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
            "forecast": 0,
            "employees_used": row["employees_used"] or 0,
        }
        for row in hourly
    ]

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_file(request):
    """
    Vastaanottaa CSV- tai XLSX-tiedoston, käsittelee sen
    ja tallentaa rivit SampleData-malliin.

    Prosessi:
    1. tarkistetaan tiedosto
    2. luetaan DataFrameksi
    3. validoidaan ja esikäsitellään process_file-funktiolla
    4. muunnetaan tietokantariveiksi create_records-funktiolla
    5. validoidaan serializerilla
    6. tallennetaan tietokantaan
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    uploaded_file = request.FILES.get("file")

    if not uploaded_file:
        return Response(
            {
                "error": "Tiedostoa ei lähetetty.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        filename = uploaded_file.name.lower()

        # Luetaan tiedosto Pandas DataFrameksi tiedostotyypin mukaan.
        if filename.endswith(".csv"):
            df = pd.read_csv(uploaded_file)
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(uploaded_file)
        else:
            return Response(
                {
                    "error": "Tiedostomuotoa ei tueta.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Esikäsitellään ja validoidaan tiedoston sarakkeet.
        df, missing = process_file(df)

        if missing:
            return Response(
                {
                    "error": "Pakollisia sarakkeita puuttuu.",
                    "missing": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Muunnetaan DataFrame serializerille sopiviksi tietueiksi.
        records = create_records(df)

        # Jokainen rivi sidotaan kirjautuneen käyttäjän organisaatioon.
        for record in records:
            record["organization"] = (
                request.user.organization.id
            )

        serializer = SampleDataSerializer(
            data=records,
            many=True,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        serializer.save()

        return Response(
            {
                "message": "Data tallennettiin onnistuneesti.",
                "rows_received": len(records),
                "rows_inserted": len(serializer.validated_data),
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        return Response(
            {
                "error": "Tiedoston käsittely epäonnistui.",
                "detail": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def test_protected(request):
    """
    Suojattu test endpoint JWT-autentikoinnin tarkistamiseen.
    """
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def predict_patient_flow(request):
    """
    Muodostaa ennusteen tulevalle potilas- tai näytteenottovirralle.

    Endpoint:
    GET /api/predict/?days=14&location=Lab1

    Query-parametrit:
    - days: ennustettavien päivien määrä, sallittu väli 1–180
    - location: toimipiste, esimerkiksi Lab1

    Jos location puuttuu tai sen arvo on "Kaikki näytteenotot",
    käytetään kaikkien toimipisteiden yhdistettyä mallia.
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
                "code": "ORGANIZATION_MISSING",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    location = request.query_params.get("location")

    if location:
        location = location.strip()

    # Frontendissä käytetty yleisvalinta muutetaan None-arvoksi,
    # jolloin PredictionService lataa yhdistetyn mallin.
    if location == "Kaikki näytteenotot":
        location = None

    try:
        days = int(
            request.query_params.get("days", 14)
        )
    except (TypeError, ValueError):
        return Response(
            {
                "error": "days-parametrin täytyy olla kokonaisluku.",
                "code": "INVALID_DAYS",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Rajataan ennusteen pituus kohtuulliseen ja tuettuun välille.
    if days < 1 or days > 180:
        return Response(
            {
                "error": "days-parametrin täytyy olla välillä 1–180.",
                "code": "INVALID_DAYS",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    service = PredictionService()

    try:
        # Ennustelogiikka pidetään erillisessä palveluluokassa.
        # View vastaa vain requestin validoinnista ja responsen muodostamisesta.
        predictions = service.predict(
            days=days,
            location=location,
        )
    except FileNotFoundError as exc:
        # Mallitiedostoa ei löytynyt valitulle toimipisteelle.
        return Response(
            {
                "error": str(exc),
                "detail": (
                    "Ennustemallia ei ole vielä koulutettu "
                    "valitulle toimipisteelle."
                ),
                "code": "MODEL_NOT_FOUND",
            },
            status=status.HTTP_409_CONFLICT,
        )
    except ValueError as exc:
        # Ennustamiseen ei esimerkiksi ole riittävästi historiadataa.
        return Response(
            {
                "error": str(exc),
                "code": "INSUFFICIENT_DATA",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        # Kaikki odottamattomat ennustevirheet palautetaan palvelinvirheenä.
        return Response(
            {
                "error": "Ennusteen muodostaminen epäonnistui.",
                "detail": str(exc),
                "code": "PREDICTION_FAILED",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Validoidaan ja muotoillaan PredictionServicen palauttamat rivit.
    serializer = PredictionResultSerializer(
        predictions,
        many=True,
    )

    return Response(
        {
            "days": days,
            "location": (
                location or "Kaikki näytteenotot"
            ),
            "predictions": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def prediction_models(request):
    """
    Palauttaa kirjautuneen käyttäjän organisaation aktiiviset
    ennustemallit.

    Valinnaisella location-parametrilla voidaan rajata tulos
    tietyn toimipisteen tai yhdistetyn mallin tietoihin.
    """
    if not request.user.organization:
        return Response(
            {
                "error": "Käyttäjällä ei ole organisaatiota.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    location = request.query_params.get("location")

    # Haetaan vain käyttäjän organisaation aktiiviset mallit.
    queryset = (
        PredictionModel.objects
        .select_related("organization")
        .filter(
            organization=request.user.organization,
            is_active=True,
        )
    )

    if location:
        location = location.strip()

        # Yhdistetyllä mallilla location on tietokannassa NULL.
        if location == "Kaikki näytteenotot":
            queryset = queryset.filter(
                location__isnull=True,
            )
        else:
            queryset = queryset.filter(
                location=location,
            )

    serializer = PredictionModelSerializer(
        queryset,
        many=True,
    )

    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hourly_prediction(request):
    try:
        days = int(
            request.query_params.get(
                "days",
                7,
            )
        )
    except (TypeError, ValueError):
        return Response(
            {
                "detail": (
                    "days-parametrin täytyy "
                    "olla kokonaisluku."
                )
            },
            status=400,
        )

    if days < 1:
        return Response(
            {
                "detail": (
                    "days-parametrin täytyy "
                    "olla vähintään 1."
                )
            },
            status=400,
        )

    location = request.query_params.get(
        "location"
    )

    if location in {
        "",
        "Kaikki toimipisteet",
        "Kaikki näytteenotot",
    }:
        location = None

    try:
        service = HourlyPredictionService(
            organization=(
                request.user.organization
            )
        )

        predictions = service.predict(
            days=days,
            location=location,
        )

        return Response({
            "predictions": predictions,
        })

    except ValueError as error:
        return Response(
            {
                "detail": str(error),
            },
            status=400,
        )

    except FileNotFoundError as error:
        return Response(
            {
                "detail": str(error),
            },
            status=404,
        )
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def predict_employees(request):
    """Palauttaa tuntiennusteen ja historiallisen henkilöstöarvion."""
    if not request.user.organization:
        return Response(
            {
                "error": (
                    "Käyttäjällä ei ole "
                    "organisaatiota."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    location = request.GET.get(
        "location"
    )

    try:
        days = int(
            request.GET.get(
                "days",
                1,
            )
        )
    except (TypeError, ValueError):
        return Response(
            {
                "error": (
                    "days-parametrin pitää "
                    "olla kokonaisluku."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not location:
        return Response(
            {
                "error": (
                    "Henkilöstöennuste tarvitsee "
                    "toimipisteen."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        prediction_service = (
            HourlyPredictionService(
                organization=(
                    request.user.organization
                )
            )
        )

        forecast_rows = (
            prediction_service.predict(
                days=days,
                location=location,
            )
        )

        estimator = EmployeeEstimator(
            organization=(
                request.user.organization
            ),
            location=location,
        )

        results = (
            estimator.estimate_forecast_rows(
                forecast_rows
            )
        )

        return Response(results)

    except ValueError as error:
        return Response(
            {
                "error": str(error),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

class TrainPredictionModelsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        locations = request.data.get("locations", [])

        if not isinstance(locations, list):
            return Response(
                {
                    "success": False,
                    "message": "Toimipisteet täytyy antaa listana.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        locations = [
            str(location).strip()
            for location in locations
            if str(location).strip()
        ]

        if not locations:
            return Response(
                {
                    "success": False,
                    "message": "Valitse vähintään yksi koulutettava toimipiste.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        trained_locations = []
        failed_locations = []

        for location in locations:
            try:
                call_command(
                    "train_prediction_models",
                    location=location,
                )

                trained_locations.append(location)

            except Exception as error:
                failed_locations.append(
                    {
                        "location": location,
                        "error": str(error),
                    }
                )

        if failed_locations and not trained_locations:
            return Response(
                {
                    "success": False,
                    "message": "Mallien koulutus epäonnistui.",
                    "trained_locations": [],
                    "failed_locations": failed_locations,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if failed_locations:
            return Response(
                {
                    "success": True,
                    "message": (
                        "Osa malleista koulutettiin onnistuneesti, "
                        "mutta joidenkin koulutus epäonnistui."
                    ),
                    "trained_locations": trained_locations,
                    "failed_locations": failed_locations,
                },
                status=status.HTTP_207_MULTI_STATUS,
            )

        return Response(
            {
                "success": True,
                "message": "Mallit koulutettiin onnistuneesti.",
                "trained_locations": trained_locations,
                "failed_locations": [],
            },
            status=status.HTTP_200_OK,
        )