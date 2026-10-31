# Muuntaa organisaatio 1:n päiväkohtaiset ennusteet tuntiennusteiksi
# edellisen vuoden toteutuneen tuntijakauman perusteella.

from collections import defaultdict
from datetime import datetime, time

import pandas as pd
from django.db.models import Sum
from django.db.models.functions import TruncHour
from django.utils import timezone

from api.models import SampleData
from api.services.services1.prediction1.prediction import PredictionService


class HourlyPredictionService:
    BUSINESS_HOURS = list(range(7, 15))

    def __init__(self, organization):
        self.organization = organization
        self.daily_prediction_service = PredictionService(
            organization=organization
        )

    # Muodostaa päiväennusteista tuntikohtaiset ennusteet.
    def predict(
        self,
        days=7,
        location=None,
    ):
        daily_predictions = (
            self.daily_prediction_service.predict(
                days=days,
                location=location,
            )
        )

        if not daily_predictions:
            return []

        results = []
        distributions_by_year = {}

        for daily_row in daily_predictions:
            hourly_rows = self._predict_daily_hours(
                daily_row=daily_row,
                location=location,
                distributions_by_year=distributions_by_year,
            )

            results.extend(hourly_rows)

        return results

    # Muodostaa yhden päivän tuntiennusteet.
    def _predict_daily_hours(
        self,
        daily_row,
        location,
        distributions_by_year,
    ):
        prediction_date = pd.Timestamp(
            daily_row["date"]
        ).date()

        daily_total = self._get_daily_prediction(
            daily_row
        )

        reference_year = (
            prediction_date.year - 1
        )

        year_distributions = (
            self._get_year_distributions(
                reference_year=reference_year,
                location=location,
                distributions_by_year=distributions_by_year,
            )
        )

        distribution = self._get_distribution(
            year_distributions=year_distributions,
            weekday=prediction_date.weekday(),
        )

        hourly_values = self._allocate_daily_total(
            daily_total=daily_total,
            distribution=distribution,
        )

        return self._create_hourly_results(
            prediction_date=prediction_date,
            daily_total=daily_total,
            hourly_values=hourly_values,
            reference_year=reference_year,
            location=location,
        )

    # Hakee vuoden tuntijakaumat tai muodostaa ne tarvittaessa.
    def _get_year_distributions(
        self,
        reference_year,
        location,
        distributions_by_year,
    ):
        if reference_year not in distributions_by_year:
            distributions_by_year[
                reference_year
            ] = self._build_year_distributions(
                year=reference_year,
                location=location,
            )

        return distributions_by_year[
            reference_year
        ]

    # Valitsee viikonpäivän jakauman ja tarvittaessa fallback-jakauman.
    def _get_distribution(
        self,
        year_distributions,
        weekday,
    ):
        distribution = (
            year_distributions["weekday"]
            .get(weekday)
        )

        if not distribution:
            distribution = (
                year_distributions["overall"]
            )

        if not distribution:
            distribution = (
                self._get_equal_distribution()
            )

        return distribution

    # Muodostaa yhden päivän API:lle palautettavat tuntirivit.
    def _create_hourly_results(
        self,
        prediction_date,
        daily_total,
        hourly_values,
        reference_year,
        location,
    ):
        results = []

        for hour in self.BUSINESS_HOURS:
            timestamp = self._create_hour_timestamp(
                prediction_date,
                hour,
            )

            value = hourly_values.get(
                hour,
                0,
            )

            results.append({
                "date": timestamp.isoformat(),
                "timestamp": timestamp.isoformat(),
                "hour": hour,
                "location": location,
                "prediction": value,
                "forecast": value,
                "daily_prediction": daily_total,
                "distribution_year": reference_year,
                "data_type": "forecast",
            })

        return results

    # Muodostaa tuntirivin aikaleiman.
    def _create_hour_timestamp(
        self,
        prediction_date,
        hour,
    ):
        return timezone.make_aware(
            datetime.combine(
                prediction_date,
                time(hour=hour),
            )
        )

    # Muodostaa vuoden toteutuneesta datasta tuntijakaumat.
    def _build_year_distributions(
        self,
        year,
        location=None,
    ):
        queryset = self._get_year_queryset(
            year=year,
            location=location,
        )

        rows = self._aggregate_hourly_data(
            queryset
        )

        (
            weekday_hour_totals,
            overall_hour_totals,
        ) = self._calculate_hour_totals(
            rows
        )

        weekday_distributions = (
            self._create_weekday_distributions(
                weekday_hour_totals
            )
        )

        overall_distribution = (
            self._normalize_distribution(
                overall_hour_totals
            )
        )

        return {
            "weekday": weekday_distributions,
            "overall": overall_distribution,
        }

    # Hakee vain organisaation valitun vuoden historiadatan.
    def _get_year_queryset(
        self,
        year,
        location,
    ):
        start_date = timezone.make_aware(
            datetime(
                year,
                1,
                1,
            )
        )

        end_date = timezone.make_aware(
            datetime(
                year + 1,
                1,
                1,
            )
        )

        queryset = SampleData.objects.filter(
            organization=self.organization,
            timestamp__gte=start_date,
            timestamp__lt=end_date,
        )

        if location:
            queryset = queryset.filter(
                location=location
            )

        return queryset

    # Ryhmittelee historiadatan tunneittain.
    def _aggregate_hourly_data(
        self,
        queryset,
    ):
        return (
            queryset
            .annotate(
                hour_timestamp=TruncHour(
                    "timestamp"
                )
            )
            .values(
                "hour_timestamp"
            )
            .annotate(
                total_samples=Sum(
                    "samples_taken"
                )
            )
            .order_by(
                "hour_timestamp"
            )
        )

    # Laskee näytemäärät viikonpäivittäin ja tunneittain.
    def _calculate_hour_totals(
        self,
        rows,
    ):
        weekday_hour_totals = defaultdict(
            lambda: defaultdict(float)
        )

        overall_hour_totals = defaultdict(
            float
        )

        for row in rows:
            hour_timestamp = row[
                "hour_timestamp"
            ]

            if not hour_timestamp:
                continue

            hour = hour_timestamp.hour

            if hour not in self.BUSINESS_HOURS:
                continue

            weekday = (
                hour_timestamp.weekday()
            )

            total_samples = float(
                row["total_samples"]
                or 0
            )

            weekday_hour_totals[
                weekday
            ][hour] += total_samples

            overall_hour_totals[
                hour
            ] += total_samples

        return (
            weekday_hour_totals,
            overall_hour_totals,
        )

    # Muodostaa normalisoidut jakaumat viikonpäiville.
    def _create_weekday_distributions(
        self,
        weekday_hour_totals,
    ):
        distributions = {}

        for (
            weekday,
            hour_totals,
        ) in weekday_hour_totals.items():

            distribution = (
                self._normalize_distribution(
                    hour_totals
                )
            )

            if distribution:
                distributions[
                    weekday
                ] = distribution

        return distributions

    # Normalisoi tuntimäärät suhteelliseksi jakaumaksi.
    def _normalize_distribution(
        self,
        hour_totals,
    ):
        total = sum(
            max(
                float(
                    hour_totals.get(
                        hour,
                        0,
                    )
                ),
                0,
            )
            for hour in self.BUSINESS_HOURS
        )

        if total <= 0:
            return {}

        return {
            hour: (
                max(
                    float(
                        hour_totals.get(
                            hour,
                            0,
                        )
                    ),
                    0,
                )
                / total
            )
            for hour in self.BUSINESS_HOURS
        }

    # Muodostaa tasaisen tuntijakauman.
    def _get_equal_distribution(self):
        weight = (
            1
            / len(self.BUSINESS_HOURS)
        )

        return {
            hour: weight
            for hour in self.BUSINESS_HOURS
        }

    # Jakaa päiväennusteen kokonaislukuarvot tunneille.
    def _allocate_daily_total(
        self,
        daily_total,
        distribution,
    ):
        daily_total = max(
            int(round(daily_total)),
            0,
        )

        if daily_total == 0:
            return {
                hour: 0
                for hour in self.BUSINESS_HOURS
            }

        raw_values = (
            self._calculate_raw_hourly_values(
                daily_total,
                distribution,
            )
        )

        allocated = (
            self._floor_hourly_values(
                raw_values
            )
        )

        self._allocate_remainder(
            daily_total=daily_total,
            raw_values=raw_values,
            allocated=allocated,
        )

        return allocated

    # Laskee tuntien pyöristämättömät ennustearvot.
    def _calculate_raw_hourly_values(
        self,
        daily_total,
        distribution,
    ):
        return {
            hour: (
                daily_total
                * distribution.get(
                    hour,
                    0,
                )
            )
            for hour in self.BUSINESS_HOURS
        }

    # Muuntaa tuntiarvot kokonaisluvuiksi alaspäin.
    def _floor_hourly_values(
        self,
        raw_values,
    ):
        return {
            hour: int(
                raw_values[hour]
            )
            for hour in self.BUSINESS_HOURS
        }

    # Jakaa pyöristyksestä jäävät asiakkaat suurimmille desimaaliosille.
    def _allocate_remainder(
        self,
        daily_total,
        raw_values,
        allocated,
    ):
        allocated_total = sum(
            allocated.values()
        )

        remaining = (
            daily_total
            - allocated_total
        )

        remainder_order = sorted(
            self.BUSINESS_HOURS,
            key=lambda hour: (
                raw_values[hour]
                - allocated[hour]
            ),
            reverse=True,
        )

        for hour in remainder_order[
            :remaining
        ]:
            allocated[hour] += 1

    # Palauttaa päiväennusteen tunnetuista ennustekentistä.
    def _get_daily_prediction(
        self,
        daily_row,
    ):
        value = (
            daily_row.get("prediction")
            or daily_row.get("forecast")
            or daily_row.get(
                "predicted_patient_count"
            )
            or daily_row.get(
                "predicted_samples"
            )
            or 0
        )

        return max(
            int(
                round(
                    float(value)
                )
            ),
            0,
        )