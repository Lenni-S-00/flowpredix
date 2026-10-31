# Hakee ja aggregoi organisaatio 2:n ajanvaraus- ja vuoronumerodataa.
# Kaikki haut rajataan aina annettuun organisaatioon.

from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncHour

from api.models import AppointmentData, QueueData


class AppointmentDataRepository:
    """Käsittelee organisaation ajanvarausdatan tietokantahaut."""

    def __init__(self, organization):
        self.organization = organization

    # Palauttaa organisaation ajanvarausdatan peruskyselyn.
    def get_queryset(self):
        return AppointmentData.objects.filter(
            organization=self.organization
        )

    # Palauttaa organisaation toimipisteet.
    def get_locations(self):
        return list(
            self.get_queryset()
            .values_list(
                "location",
                flat=True,
            )
            .distinct()
            .order_by("location")
        )

    # Palauttaa yhden toimipisteen ajanvarausdatan.
    def get_by_location(self, location):
        return self.get_queryset().filter(
            location=location
        )

    # Palauttaa annetun aikavälin ajanvarausdatan.
    def get_by_date_range(
        self,
        start,
        end,
        location=None,
    ):
        queryset = self.get_queryset().filter(
            slot_start__date__gte=start,
            slot_start__date__lte=end,
        )

        return self._filter_location(
            queryset,
            location,
        )

    # Palauttaa päivittäiset saapuneiden asiakkaiden määrät.
    def get_daily_arrivals(
        self,
        location=None,
        start=None,
        end=None,
    ):
        queryset = self.get_queryset().filter(
            arrival_timestamp__isnull=False
        )

        queryset = self._filter_location(
            queryset,
            location,
        )

        queryset = self._filter_date_range(
            queryset,
            "arrival_timestamp",
            start,
            end,
        )

        return list(
            queryset
            .annotate(
                date=TruncDate(
                    "arrival_timestamp"
                )
            )
            .values(
                "date",
                "location",
            )
            .annotate(
                customer_count=Count("id")
            )
            .order_by(
                "date",
                "location",
            )
        )

    # Palauttaa tuntikohtaiset saapuneiden asiakkaiden määrät.
    def get_hourly_arrivals(
        self,
        location=None,
        start=None,
        end=None,
    ):
        queryset = self.get_queryset().filter(
            arrival_timestamp__isnull=False
        )

        queryset = self._filter_location(
            queryset,
            location,
        )

        queryset = self._filter_date_range(
            queryset,
            "arrival_timestamp",
            start,
            end,
        )

        return list(
            queryset
            .annotate(
                hour=TruncHour(
                    "arrival_timestamp"
                )
            )
            .values(
                "hour",
                "location",
            )
            .annotate(
                customer_count=Count("id")
            )
            .order_by(
                "hour",
                "location",
            )
        )

    # Palauttaa päivittäisen ajanvarauskapasiteetin.
    def get_daily_capacity(
        self,
        location=None,
        start=None,
        end=None,
    ):
        queryset = self.get_queryset().filter(
            slot_start__isnull=False,
            slot_end__isnull=False,
        )

        queryset = self._filter_location(
            queryset,
            location,
        )

        queryset = self._filter_date_range(
            queryset,
            "slot_start",
            start,
            end,
        )

        return list(
            queryset
            .annotate(
                date=TruncDate(
                    "slot_start"
                )
            )
            .values(
                "date",
                "location",
            )
            .annotate(
                slot_count=Count("id"),
                available_slot_count=Count(
                    "id",
                    filter=Q(
                        available=True
                    ),
                ),
            )
            .order_by(
                "date",
                "location",
            )
        )

    # Rajaa kyselyn toimipisteeseen.
    def _filter_location(
        self,
        queryset,
        location,
    ):
        if location:
            queryset = queryset.filter(
                location=location
            )

        return queryset

    # Rajaa kyselyn annetulle aikavälille.
    def _filter_date_range(
        self,
        queryset,
        field_name,
        start,
        end,
    ):
        filters = {}

        if start:
            filters[f"{field_name}__date__gte"] = start

        if end:
            filters[f"{field_name}__date__lte"] = end

        if filters:
            queryset = queryset.filter(
                **filters
            )

        return queryset


class QueueDataRepository:
    """Käsittelee organisaation vuoronumerodatan tietokantahaut."""

    COMPLETED_STATUS = "COMPLETED"

    def __init__(self, organization):
        self.organization = organization

    # Palauttaa organisaation vuoronumerodatan peruskyselyn.
    def get_queryset(self):
        return QueueData.objects.filter(
            organization=self.organization
        )

    # Palauttaa organisaation toimipisteet.
    def get_locations(self):
        return list(
            self.get_queryset()
            .values_list(
                "location",
                flat=True,
            )
            .distinct()
            .order_by("location")
        )

    # Palauttaa yhden toimipisteen vuoronumerodatan.
    def get_by_location(self, location):
        return self.get_queryset().filter(
            location=location
        )

    # Palauttaa annetun aikavälin vuoronumerodatan.
    def get_by_date_range(
        self,
        start,
        end,
        location=None,
    ):
        queryset = self.get_queryset().filter(
            arrival_timestamp__date__gte=start,
            arrival_timestamp__date__lte=end,
        )

        return self._filter_location(
            queryset,
            location,
        )

    # Palauttaa palvellut vuoronumerotapahtumat.
    def get_completed(self, location=None):
        queryset = self.get_queryset().filter(
            final_status__iexact=self.COMPLETED_STATUS
        )

        return self._filter_location(
            queryset,
            location,
        )

    # Palauttaa päivittäiset palveltujen asiakkaiden määrät.
    def get_daily_completed_counts(
        self,
        location=None,
        start=None,
        end=None,
    ):
        queryset = self.get_completed(
            location=location
        ).filter(
            arrival_timestamp__isnull=False
        )

        queryset = self._filter_date_range(
            queryset,
            "arrival_timestamp",
            start,
            end,
        )

        return list(
            queryset
            .annotate(
                date=TruncDate(
                    "arrival_timestamp"
                )
            )
            .values(
                "date",
                "location",
            )
            .annotate(
                customer_count=Count("id")
            )
            .order_by(
                "date",
                "location",
            )
        )

    # Palauttaa tuntikohtaiset palveltujen asiakkaiden määrät.
    def get_hourly_completed_counts(
        self,
        location=None,
        start=None,
        end=None,
    ):
        queryset = self.get_completed(
            location=location
        ).filter(
            arrival_timestamp__isnull=False
        )

        queryset = self._filter_date_range(
            queryset,
            "arrival_timestamp",
            start,
            end,
        )

        return list(
            queryset
            .annotate(
                hour=TruncHour(
                    "arrival_timestamp"
                )
            )
            .values(
                "hour",
                "location",
            )
            .annotate(
                customer_count=Count("id")
            )
            .order_by(
                "hour",
                "location",
            )
        )

    # Palauttaa jonokohtaiset palveltujen asiakkaiden määrät.
    def get_completed_counts_by_queue(
        self,
        location=None,
    ):
        queryset = self.get_completed(
            location=location
        )

        return list(
            queryset
            .values(
                "location",
                "queue",
            )
            .annotate(
                customer_count=Count("id")
            )
            .order_by(
                "location",
                "queue",
            )
        )

    # Palauttaa rivit, joista odotusaika voidaan laskea.
    def get_waiting_time_data(
        self,
        location=None,
    ):
        return self.get_completed(
            location=location
        ).filter(
            arrival_timestamp__isnull=False,
            first_call_timestamp__isnull=False,
        )

    # Palauttaa rivit, joista palveluaika voidaan laskea.
    def get_service_time_data(
        self,
        location=None,
    ):
        return self.get_completed(
            location=location
        ).filter(
            service_start_timestamp__isnull=False,
            completion_timestamp__isnull=False,
        )

    # Palauttaa palvelulupauksen analysointiin soveltuvat rivit.
    def get_service_promise_data(
        self,
        location=None,
    ):
        return self.get_completed(
            location=location
        ).filter(
            service_promise_minutes__isnull=False
        )

    # Rajaa kyselyn toimipisteeseen.
    def _filter_location(
        self,
        queryset,
        location,
    ):
        if location:
            queryset = queryset.filter(
                location=location
            )

        return queryset

    # Rajaa kyselyn annetulle aikavälille.
    def _filter_date_range(
        self,
        queryset,
        field_name,
        start,
        end,
    ):
        filters = {}

        if start:
            filters[f"{field_name}__date__gte"] = start

        if end:
            filters[f"{field_name}__date__lte"] = end

        if filters:
            queryset = queryset.filter(
                **filters
            )

        return queryset