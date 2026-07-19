# api/services/repositories.py

from django.db.models import Sum
from django.db.models.functions import TruncDate

from api.models import SampleData


class SampleDataRepository:

    # Palauttaa päiväkohtaisen näytedatan valitusta toimipisteestä.
    @staticmethod
    def get_daily_data(location=None):
        queryset = SampleDataRepository._get_base_queryset()
        queryset = SampleDataRepository._filter_by_location(
            queryset,
            location,
        )
        rows = SampleDataRepository._aggregate_daily_data(
            queryset
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
    def _filter_by_location(queryset, location):
        if not location:
            return queryset

        return queryset.filter(location=location)

    # Ryhmittelee näytedatan päivämäärän ja toimipisteen mukaan.
    @staticmethod
    def _aggregate_daily_data(queryset):
        return (
            queryset
            .annotate(
                date=TruncDate("timestamp")
            )
            .values(
                "date",
                "location",
            )
            .annotate(
                samples_taken=Sum("samples_taken")
            )
            .order_by("date")
        )
