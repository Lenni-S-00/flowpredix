# Hakee ja aggregoi organisaatio 1:n näytedataa tietokannasta.
# Kaikki tietokantahaut rajataan aina annettuun organisaatioon.

from datetime import datetime, time, timedelta

from django.db.models import Max, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from api.models import SampleData


class SampleDataRepository:

    def __init__(self, organization):
        self.organization = organization

    # Palauttaa päiväkohtaisen näytedatan valitusta toimipisteestä.
    def get_daily_data(
        self,
        location=None,
        days=None,
    ):
        queryset = self._get_base_queryset()
        queryset = self._filter_by_location(
            queryset,
            location,
        )
        queryset = self._filter_recent_days(
            queryset,
            days,
        )

        rows = self._aggregate_daily_data(
            queryset
        )

        return list(rows)

    # Palauttaa organisaation kaikki tietokannasta löytyvät toimipisteet.
    def get_locations(self):
        locations = (
            self._get_base_queryset()
            .values_list(
                "location",
                flat=True,
            )
            .distinct()
            .order_by("location")
        )

        return list(locations)

    # Palauttaa vain organisaation SampleData-rivit.
    def _get_base_queryset(self):
        return SampleData.objects.filter(
            organization=self.organization
        )

    # Rajaa kyselyn annettuun toimipisteeseen.
    def _filter_by_location(
        self,
        queryset,
        location,
    ):
        if not location:
            return queryset

        return queryset.filter(
            location=location
        )

    # Rajaa kyselyn viimeisimpiin kalenteripäiviin.
    def _filter_recent_days(
        self,
        queryset,
        days,
    ):
        if days is None:
            return queryset

        self._validate_days(days)

        latest_timestamp = (
            self._get_latest_timestamp(
                queryset
            )
        )

        if latest_timestamp is None:
            return queryset.none()

        start_timestamp = (
            self._get_start_timestamp(
                latest_timestamp,
                days,
            )
        )

        return queryset.filter(
            timestamp__gte=start_timestamp
        )

    # Palauttaa kyselyn uusimman aikaleiman.
    def _get_latest_timestamp(
        self,
        queryset,
    ):
        return queryset.aggregate(
            latest_timestamp=Max(
                "timestamp"
            )
        )["latest_timestamp"]

    # Laskee aikaleiman, josta päiväkohtainen rajaus alkaa.
    def _get_start_timestamp(
        self,
        latest_timestamp,
        days,
    ):
        start_date = (
            latest_timestamp.date()
            - timedelta(days=days - 1)
        )

        start_timestamp = datetime.combine(
            start_date,
            time.min,
        )

        if timezone.is_aware(
            latest_timestamp
        ):
            start_timestamp = timezone.make_aware(
                start_timestamp,
                timezone.get_current_timezone(),
            )

        return start_timestamp

    # Tarkistaa, että päivien määrä on kelvollinen.
    def _validate_days(
        self,
        days,
    ):
        if not isinstance(days, int):
            raise ValueError(
                "Päivien määrän täytyy olla kokonaisluku."
            )

        if days < 1:
            raise ValueError(
                "Päivien määrän täytyy olla vähintään yksi."
            )

    # Ryhmittelee näytedatan päivämäärän ja toimipisteen mukaan.
    def _aggregate_daily_data(
        self,
        queryset,
    ):
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
                samples_taken=Sum(
                    "samples_taken"
                )
            )
            .order_by("date")
        )