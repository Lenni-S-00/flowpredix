from statistics import median

from django.db.models import Sum
from django.db.models.functions import TruncHour

from api.models import SampleData


class EmployeeEstimator:
    """Arvioi henkilöstötarpeen historiallisen tuntidatan perusteella."""

    def __init__(
        self,
        organization,
        location=None,
        neighbor_count=10,
    ):
        self.organization = organization
        self.location = location
        self.neighbor_count = neighbor_count
        self.history = self._load_history()

    def _load_history(self):
        """Hakee henkilöstöarvion käyttämän historiallisen tuntidatan."""
        queryset = SampleData.objects.filter(
            organization=self.organization,
            samples_taken__gt=0,
            employees_used__gt=0,
        )

        if self.location:
            queryset = queryset.filter(
                location=self.location,
            )

        rows = (
            queryset
            .annotate(hour=TruncHour("timestamp"))
            .values("hour", "location")
            .annotate(
                samples=Sum("samples_taken"),
                employees=Sum("employees_used"),
            )
            .order_by("hour")
        )

        return [
            {
                "samples": float(row["samples"] or 0),
                "employees": float(row["employees"] or 0),
            }
            for row in rows
            if (
                row["samples"]
                and row["employees"]
            )
        ]

    def _get_productivity_values(self):
        """Laskee historialliset asiakasmäärät työntekijää kohden."""
        return [
            row["samples"] / row["employees"]
            for row in self.history
            if row["employees"] > 0
        ]

    def _get_fallback_productivity(self):
        """Palauttaa mediaanituottavuuden varalaskentaa varten."""
        productivity_values = (
            self._get_productivity_values()
        )

        if not productivity_values:
            return 10.0

        return median(productivity_values)

    def _find_nearest_rows(
        self,
        predicted_samples,
    ):
        """Palauttaa asiakasmäärältään lähimmät historialliset tunnit."""
        sorted_rows = sorted(
            self.history,
            key=lambda row: abs(
                row["samples"] -
                predicted_samples
            ),
        )

        return sorted_rows[
            :self.neighbor_count
        ]

    def _calculate_weight(
        self,
        historical_samples,
        predicted_samples,
    ):
        """Laskee painon ennusteen ja historiarivin etäisyyden perusteella."""
        distance = abs(
            historical_samples -
            predicted_samples
        )

        return 1 / (distance + 1)

    def _calculate_weighted_average(
        self,
        rows,
        predicted_samples,
    ):
        """Laskee lähimpien historiatuntien painotetun henkilöstömäärän."""
        weighted_employee_sum = 0
        total_weight = 0

        for row in rows:
            weight = self._calculate_weight(
                row["samples"],
                predicted_samples,
            )

            weighted_employee_sum += (
                row["employees"] * weight
            )

            total_weight += weight

        if total_weight == 0:
            return None

        return (
            weighted_employee_sum /
            total_weight
        )

    def _round_employee_requirement(
        self,
        employee_estimate,
    ):
        """Pyöristää henkilöstöarvion ylöspäin kokonaisluvuksi."""
        if employee_estimate <= 0:
            return 0

        integer_part = int(
            employee_estimate
        )

        if employee_estimate > integer_part:
            return integer_part + 1

        return integer_part

    def estimate(
        self,
        predicted_samples,
    ):
        """Arvioi yhden ennustetunnin työntekijätarpeen."""
        predicted_samples = float(
            predicted_samples or 0
        )

        if predicted_samples <= 0:
            return {
                "recommended_employees": 0,
                "raw_employee_estimate": 0,
                "estimation_method": (
                    "no_customers"
                ),
                "comparison_rows": 0,
            }

        nearest_rows = (
            self._find_nearest_rows(
                predicted_samples
            )
        )

        if nearest_rows:
            raw_estimate = (
                self._calculate_weighted_average(
                    nearest_rows,
                    predicted_samples,
                )
            )

            method = (
                "historical_nearest_hours"
            )

        else:
            productivity = (
                self._get_fallback_productivity()
            )

            raw_estimate = (
                predicted_samples /
                productivity
            )

            method = (
                "historical_productivity"
            )

        recommended_employees = (
            self._round_employee_requirement(
                raw_estimate
            )
        )

        return {
            "recommended_employees":
                recommended_employees,
            "raw_employee_estimate":
                round(raw_estimate, 2),
            "estimation_method": method,
            "comparison_rows":
                len(nearest_rows),
        }

    def estimate_forecast_rows(
        self,
        forecast_rows,
    ):
        """Lisää henkilöstöarvion kaikkiin tuntiennusteen riveihin."""
        results = []

        for row in forecast_rows:
            predicted_samples = (
                row.get("prediction")
                or row.get("predicted_samples")
                or row.get("forecast")
                or 0
            )

            employee_estimate = (
                self.estimate(
                    predicted_samples
                )
            )

            results.append({
                **row,
                **employee_estimate,
            })

        return results