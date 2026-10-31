# Tuottaa organisaatio 2:n päivittäiset asiakasmääräennusteet.
# Ennuste käyttää kalenteritietoja ja tulevaa ajanvarauskapasiteettia.

from datetime import date, timedelta

import pandas as pd

from api.services.services2.data2.repositories import (
    AppointmentDataRepository,
)
from api.services.services2.ml2.model_registry import (
    ModelRegistry,
)
from api.services.services2.ml2.training import (
    FEATURE_COLUMNS,
)


class PredictionService:
    """Tuottaa organisaatio 2:n päivittäiset asiakasmääräennusteet."""

    def __init__(self, organization):
        self.organization = organization

        self.appointment_repository = (
            AppointmentDataRepository(
                organization=organization
            )
        )

        self.registry = ModelRegistry(
            organization=organization
        )

    # Tuottaa päivittäiset ennusteet annetulle ajanjaksolle.
    def predict(
        self,
        days=14,
        location=None,
        start_date=None,
    ):
        self._validate_days(days)

        start_date = (
            start_date
            or date.today()
        )

        end_date = (
            start_date
            + timedelta(days=days - 1)
        )

        model = self.registry.load(
            location=location
        )

        capacity_data = (
            self._get_future_capacity(
                start_date=start_date,
                end_date=end_date,
                location=location,
            )
        )

        feature_data = (
            self._create_prediction_features(
                start_date=start_date,
                days=days,
                capacity_data=capacity_data,
                location=location,
            )
        )

        predictions = model.predict(
            feature_data[FEATURE_COLUMNS]
        )

        return self._format_predictions(
            feature_data,
            predictions,
            location,
        )

    # Hakee tulevan ajanvarauskapasiteetin tietokannasta.
    def _get_future_capacity(
        self,
        start_date,
        end_date,
        location=None,
    ):
        rows = (
            self.appointment_repository
            .get_daily_capacity(
                location=location,
                start=start_date,
                end=end_date,
            )
        )

        if not rows:
            return pd.DataFrame(
                columns=[
                    "date",
                    "location",
                    "appointment_slots",
                    "capacity_minutes",
                ]
            )

        df = pd.DataFrame(rows)

        df["date"] = pd.to_datetime(
            df["date"],
            errors="coerce",
        ).dt.date

        return df

    # Muodostaa ennustamiseen tarvittavat featuret jokaiselle päivälle.
    def _create_prediction_features(
        self,
        start_date,
        days,
        capacity_data,
        location=None,
    ):
        dates = [
            start_date + timedelta(days=offset)
            for offset in range(days)
        ]

        if location:
            return self._create_location_features(
                dates=dates,
                capacity_data=capacity_data,
                location=location,
            )

        return self._create_combined_features(
            dates=dates,
            capacity_data=capacity_data,
        )

    # Muodostaa yhden toimipisteen ennustefeaturet.
    def _create_location_features(
        self,
        dates,
        capacity_data,
        location,
    ):
        df = pd.DataFrame(
            {
                "date": dates,
                "location": location,
            }
        )

        if not capacity_data.empty:
            capacity_data = (
                capacity_data[
                    capacity_data["location"]
                    == location
                ]
                .copy()
            )

            df = df.merge(
                capacity_data[
                    [
                        "date",
                        "appointment_slots",
                        "capacity_minutes",
                    ]
                ],
                on="date",
                how="left",
            )

        return self._finalize_features(
            df
        )

    # Muodostaa kaikkien toimipisteiden yhteisen ennusteen featuret.
    def _create_combined_features(
        self,
        dates,
        capacity_data,
    ):
        df = pd.DataFrame(
            {
                "date": dates,
            }
        )

        if not capacity_data.empty:
            combined_capacity = (
                capacity_data
                .groupby(
                    "date",
                    as_index=False,
                )
                .agg(
                    appointment_slots=(
                        "appointment_slots",
                        "sum",
                    ),
                    capacity_minutes=(
                        "capacity_minutes",
                        "sum",
                    ),
                )
            )

            df = df.merge(
                combined_capacity,
                on="date",
                how="left",
            )

        df["location"] = None

        return self._finalize_features(
            df
        )

    # Lisää puuttuvat kapasiteetti- ja kalenterifeaturet.
    def _finalize_features(
        self,
        df,
    ):
        for column in [
            "appointment_slots",
            "capacity_minutes",
        ]:
            if column not in df.columns:
                df[column] = 0

            df[column] = (
                pd.to_numeric(
                    df[column],
                    errors="coerce",
                )
                .fillna(0)
            )

        dates = pd.to_datetime(
            df["date"]
        )

        df["year"] = dates.dt.year
        df["month"] = dates.dt.month

        df["week_of_year"] = (
            dates
            .dt
            .isocalendar()
            .week
            .astype(int)
        )

        df["day_of_week"] = (
            dates.dt.dayofweek
        )

        df["day_of_year"] = (
            dates.dt.dayofyear
        )

        return df

    # Muotoilee mallin ennusteet API:n käyttämään muotoon.
    def _format_predictions(
        self,
        feature_data,
        predictions,
        location,
    ):
        results = []

        for row, prediction in zip(
            feature_data.to_dict(
                orient="records"
            ),
            predictions,
        ):
            predicted_count = max(
                0,
                int(round(prediction)),
            )

            results.append(
                {
                    "date": row["date"],
                    "location": (
                        location
                        or "Kaikki toimipisteet"
                    ),
                    "predicted_patient_count": (
                        predicted_count
                    ),
                    "holiday": False,
                }
            )

        return results

    # Tarkistaa ennustettavien päivien määrän.
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