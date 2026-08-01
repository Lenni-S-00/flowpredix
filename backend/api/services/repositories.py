# api/services/repositories.py

from datetime import datetime, time, timedelta

from django.db.models import Max, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from api.models import SampleData


class SampleDataRepository:

    # Palauttaa päiväkohtaisen näytedatan valitusta toimipisteestä.
    @staticmethod
    def get_daily_data(
        location=None,
        days=None,
    ):
        queryset = (
            SampleDataRepository
            ._get_base_queryset()
        )

        queryset = (
            SampleDataRepository
            ._filter_by_location(
                queryset,
                location,
            )
        )

        queryset = (
            SampleDataRepository
            ._filter_recent_days(
                queryset,
                days,
            )
        )

        rows = (
            SampleDataRepository
            ._aggregate_daily_data(
                queryset
            )
        )

        return list(rows)

    # Palauttaa kaikki tietokannasta löytyvät toimipisteet.
    @staticmethod
    def get_locations():
        locations = (
            SampleData.objects
            .values_list(
                "location",
                flat=True,
            )
            .distinct()
            .order_by("location")
        )

        return list(locations)

    # Palauttaa SampleData-taulun peruskyselyn.
    @staticmethod
    def _get_base_queryset():
        return SampleData.objects.all()

    # Rajaa kyselyn annettuun toimipisteeseen.
    @staticmethod
    def _filter_by_location(
        queryset,
        location,
    ):
        if not location:
            return queryset

        return queryset.filter(
            location=location
        )

    # Rajaa kyselyn viimeisimpiin kalenteripäiviin.
    @staticmethod
    def _filter_recent_days(
        queryset,
        days,
    ):
        if days is None:
            return queryset

        SampleDataRepository._validate_days(
            days
        )

        latest_timestamp = (
            queryset.aggregate(
                latest_timestamp=Max(
                    "timestamp"
                )
            )["latest_timestamp"]
        )

        if latest_timestamp is None:
            return queryset.none()

        start_date = (
            latest_timestamp.date()
            - timedelta(
                days=days - 1
            )
        )

        start_timestamp = datetime.combine(
            start_date,
            time.min,
        )

        if (
            timezone.is_aware(
                latest_timestamp
            )
        ):
            start_timestamp = (
                timezone.make_aware(
                    start_timestamp,
                    timezone.get_current_timezone(),
                )
            )

        return queryset.filter(
            timestamp__gte=start_timestamp
        )

    # Tarkistaa, että päivien määrä on kelvollinen.
    @staticmethod
    def _validate_days(days):
        if not isinstance(days, int):
            raise ValueError(
                "Päivien määrän täytyy olla "
                "kokonaisluku."
            )

        if days < 1:
            raise ValueError(
                "Päivien määrän täytyy olla "
                "vähintään yksi."
            )

    # Ryhmittelee näytedatan päivämäärän ja toimipisteen mukaan.
    @staticmethod
    def _aggregate_daily_data(
        queryset,
    ):
        return (
            queryset
            .annotate(
                date=TruncDate(
                    "timestamp"
                )
            )
            .values(
                "date",
                "location",
            )
            .annotate(
                samples_taken=Sum(
                    "samples_taken"
                )
            )
            .order_by("date")
        )