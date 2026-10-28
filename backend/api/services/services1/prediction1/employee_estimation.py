# Arvioi tuntikohtaisen henkilöstötarpeen ennustetun asiakasmäärän
# ja historiallisen henkilöstö- ja asiakasmäärädatan perusteella.

from statistics import median

from django.db.models import Sum
from django.db.models.functions import TruncHour

from api.models import SampleData


class EmployeeEstimator:

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

    # Hakee henkilöstöarvion käyttämän historiallisen tuntidatan.
    def _load_history(self):
        queryset = self._get_history_queryset()
        rows = self._aggregate_history(queryset)

        return self._format_history(rows)

    # Hakee henkilöstöarvioon soveltuvan historiadatan.
    def _get_history_queryset(self):
        queryset = SampleData.objects.filter(
            organization=self.organization,
            samples_taken__gt=0,
            employees_used__gt=0,
        )

        if self.location:
            queryset = queryset.filter(
                location=self.location,
            )

        return queryset

    # Ryhmittelee historiadatan tunneittain.
    def _aggregate_history(self, queryset):
        return (
            queryset
            .annotate(hour=TruncHour("timestamp"))
            .values("hour", "location")
            .annotate(
                samples=Sum("samples_taken"),
                employees=Sum("employees_used"),
            )
            .order_by("hour")
        )

    # Muuntaa historiadatan laskennassa käytettävään muotoon.
    def _format_history(self, rows):
        return [
            {
                "samples": float(row["samples"] or 0),
                "employees": float(row["employees"] or 0),
            }
            for row in rows
            if row["samples"] and row["employees"]
        ]

    # Laskee historialliset asiakasmäärät työntekijää kohden.
    def _get_productivity_values(self):
        return [
            row["samples"] / row["employees"]
            for row in self.history
            if row["employees"] > 0
        ]

    # Palauttaa mediaanituottavuuden varalaskentaa varten.
    def _get_fallback_productivity(self):
        productivity_values = self._get_productivity_values()

        if not productivity_values:
            return 10.0

        return median(productivity_values)

    # Palauttaa asiakasmäärältään lähimmät historialliset tunnit.
    def _find_nearest_rows(self, predicted_samples):
        sorted_rows = sorted(
            self.history,
            key=lambda row: abs(
                row["samples"] - predicted_samples
            ),
        )

        return sorted_rows[:self.neighbor_count]

    # Laskee painon ennusteen ja historiarivin etäisyyden perusteella.
    def _calculate_weight(
        self,
        historical_samples,
        predicted_samples,
    ):
        distance = abs(
            historical_samples - predicted_samples
        )

        return 1 / (distance + 1)

    # Laskee lähimpien historiatuntien painotetun henkilöstömäärän.
    def _calculate_weighted_average(
        self,
        rows,
        predicted_samples,
    ):
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

        return weighted_employee_sum / total_weight

    # Pyöristää henkilöstöarvion ylöspäin kokonaisluvuksi.
    def _round_employee_requirement(self, employee_estimate):
        if employee_estimate <= 0:
            return 0

        integer_part = int(employee_estimate)

        if employee_estimate > integer_part:
            return integer_part + 1

        return integer_part

    # Arvioi yhden ennustetunnin työntekijätarpeen.
    def estimate(self, predicted_samples):
        predicted_samples = float(
            predicted_samples or 0
        )

        if predicted_samples <= 0:
            return self._create_empty_estimate()

        nearest_rows = self._find_nearest_rows(
            predicted_samples
        )

        if nearest_rows:
            raw_estimate = self._calculate_weighted_average(
                nearest_rows,
                predicted_samples,
            )
            method = "historical_nearest_hours"

        else:
            productivity = self._get_fallback_productivity()
            raw_estimate = predicted_samples / productivity
            method = "historical_productivity"

        return self._create_estimate_result(
            raw_estimate=raw_estimate,
            method=method,
            comparison_rows=len(nearest_rows),
        )

    # Muodostaa arvion tilanteessa, jossa asiakkaita ei ole.
    def _create_empty_estimate(self):
        return {
            "recommended_employees": 0,
            "raw_employee_estimate": 0,
            "estimation_method": "no_customers",
            "comparison_rows": 0,
        }

    # Muodostaa henkilöstöarvion palautettavan tuloksen.
    def _create_estimate_result(
        self,
        raw_estimate,
        method,
        comparison_rows,
    ):
        recommended_employees = (
            self._round_employee_requirement(
                raw_estimate
            )
        )

        return {
            "recommended_employees": recommended_employees,
            "raw_employee_estimate": round(
                raw_estimate,
                2,
            ),
            "estimation_method": method,
            "comparison_rows": comparison_rows,
        }

    # Lisää henkilöstöarvion kaikkiin tuntiennusteen riveihin.
    def estimate_forecast_rows(self, forecast_rows):
        results = []

        for row in forecast_rows:
            predicted_samples = (
                row.get("prediction")
                or row.get("predicted_samples")
                or row.get("forecast")
                or 0
            )

            employee_estimate = self.estimate(
                predicted_samples
            )

            results.append({
                **row,
                **employee_estimate,
            })

        return results