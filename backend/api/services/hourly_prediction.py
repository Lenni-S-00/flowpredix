from collections import defaultdict
from datetime import datetime, time

import pandas as pd
from django.db.models import Sum
from django.db.models.functions import TruncHour
from django.utils import timezone

from api.models import SampleData
from api.services.prediction import PredictionService


class HourlyPredictionService:
    BUSINESS_HOURS = list(range(7, 15))

    def __init__(self, organization=None):
        self.organization = organization
        self.daily_prediction_service = PredictionService()

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
            prediction_date = pd.Timestamp(
                daily_row["date"]
            ).date()

            daily_total = self._get_daily_prediction(
                daily_row
            )

            reference_year = prediction_date.year - 1

            if reference_year not in distributions_by_year:
                distributions_by_year[
                    reference_year
                ] = self._build_year_distributions(
                    year=reference_year,
                    location=location,
                )

            year_distributions = (
                distributions_by_year[
                    reference_year
                ]
            )

            weekday = prediction_date.weekday()

            distribution = (
                year_distributions[
                    "weekday"
                ].get(weekday)
            )

            if not distribution:
                distribution = (
                    year_distributions[
                        "overall"
                    ]
                )

            if not distribution:
                distribution = (
                    self._get_equal_distribution()
                )

            hourly_values = (
                self._allocate_daily_total(
                    daily_total=daily_total,
                    distribution=distribution,
                )
            )

            for hour in self.BUSINESS_HOURS:
                timestamp = timezone.make_aware(
                    datetime.combine(
                        prediction_date,
                        time(hour=hour),
                    )
                )

                results.append({
                    "date": timestamp.isoformat(),
                    "timestamp": timestamp.isoformat(),
                    "hour": hour,
                    "location": location,
                    "prediction": hourly_values.get(
                        hour,
                        0,
                    ),
                    "forecast": hourly_values.get(
                        hour,
                        0,
                    ),
                    "daily_prediction": daily_total,
                    "distribution_year": reference_year,
                    "data_type": "forecast",
                })

        return results

    def _build_year_distributions(
        self,
        year,
        location=None,
    ):
        start_date = timezone.make_aware(
            datetime(year, 1, 1)
        )

        end_date = timezone.make_aware(
            datetime(year + 1, 1, 1)
        )

        queryset = SampleData.objects.filter(
            timestamp__gte=start_date,
            timestamp__lt=end_date,
        )

        if self.organization is not None:
            queryset = queryset.filter(
                organization=self.organization
            )

        if location:
            queryset = queryset.filter(
                location=location
            )

        rows = (
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
                row["total_samples"] or 0
            )

            weekday_hour_totals[
                weekday
            ][hour] += total_samples

            overall_hour_totals[
                hour
            ] += total_samples

        weekday_distributions = {}

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
                weekday_distributions[
                    weekday
                ] = distribution

        overall_distribution = (
            self._normalize_distribution(
                overall_hour_totals
            )
        )

        return {
            "weekday": weekday_distributions,
            "overall": overall_distribution,
        }

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

    def _get_equal_distribution(self):
        weight = (
            1 / len(self.BUSINESS_HOURS)
        )

        return {
            hour: weight
            for hour in self.BUSINESS_HOURS
        }

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

        raw_values = {
            hour: (
                daily_total
                * distribution.get(
                    hour,
                    0,
                )
            )
            for hour in self.BUSINESS_HOURS
        }

        allocated = {
            hour: int(raw_values[hour])
            for hour in self.BUSINESS_HOURS
        }

        allocated_total = sum(
            allocated.values()
        )

        remaining = (
            daily_total - allocated_total
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

        return allocated

    def _get_daily_prediction(
        self,
        daily_row,
    ):
        value = (
            daily_row.get(
                "prediction"
            )
            or daily_row.get(
                "forecast"
            )
            or daily_row.get(
                "predicted_patient_count"
            )
            or daily_row.get(
                "predicted_samples"
            )
            or 0
        )

        return max(
            int(round(float(value))),
            0,
        )