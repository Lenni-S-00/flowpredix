# api/services/prediction.py

import holidays
import pandas as pd

from api.services.features import TARGET_COLUMN
from api.services.model_registry import ModelRegistry
from api.services.repositories import SampleDataRepository


class PredictionService:

    # Alustaa ennustamisessa käytettävät palvelut.
    def __init__(self):
        self.repository = SampleDataRepository()
        self.registry = ModelRegistry()

    # Muodostaa ennusteet annetulle määrälle tulevia päiviä.
    def predict(self, days=14, location=None):
        model = self.registry.load(location)
        rows = self.repository.get_daily_data(location)

        history_df = self._prepare_history(rows)

        self._validate_history(history_df)

        future_dates = self._create_future_dates(days)
        history = self._get_initial_history(history_df)
        feature_columns = self._get_feature_columns()
        finnish_holidays = self._get_holidays(
            future_dates
        )

        return self._predict_dates(
            model=model,
            future_dates=future_dates,
            history=history,
            feature_columns=feature_columns,
            finnish_holidays=finnish_holidays,
            location=location,
        )

    # Tarkistaa, että ennustamiseen on riittävästi historiadataa.
    def _validate_history(self, history_df):
        if len(history_df) < 7:
            raise ValueError(
                "Ennustamiseen tarvitaan vähintään "
                "seitsemän päivän historia."
            )

    # Luo ennustettavien päivien päivämäärät.
    def _create_future_dates(self, days):
        start_date = pd.Timestamp.today().normalize()

        return pd.date_range(
            start=start_date,
            periods=days,
            freq="D",
        )

    # Palauttaa historian viimeiset seitsemän arvoa.
    def _get_initial_history(self, history_df):
        return list(
            history_df[TARGET_COLUMN]
            .iloc[-7:]
            .values
        )

    # Palauttaa mallin käyttämät feature-sarakkeet.
    def _get_feature_columns(self):
        return [
            "year",
            "month",
            "day_of_week",
            "day_of_year",
            "lag_1",
            "lag_2",
            "lag_3",
            "lag_4",
            "lag_5",
            "lag_6",
            "lag_7",
        ]

    # Palauttaa ennustejakson suomalaiset pyhäpäivät.
    def _get_holidays(self, future_dates):
        return holidays.FI(
            years=range(
                future_dates.min().year,
                future_dates.max().year + 1,
            )
        )

    # Ennustaa kaikki tulevat päivät yksi kerrallaan.
    def _predict_dates(
        self,
        model,
        future_dates,
        history,
        feature_columns,
        finnish_holidays,
        location,
    ):
        predictions = []

        for current_date in future_dates:
            prediction = self._predict_single_date(
                model=model,
                current_date=current_date,
                history=history,
                feature_columns=feature_columns,
                finnish_holidays=finnish_holidays,
                location=location,
            )

            predictions.append(prediction)
            history.append(
                prediction["predicted_patient_count"]
            )

        return predictions

    # Muodostaa ennusteen yhdelle päivälle.
    def _predict_single_date(
        self,
        model,
        current_date,
        history,
        feature_columns,
        finnish_holidays,
        location,
    ):
        feature_row = self._create_feature_row(
            current_date,
            history,
        )
        prediction_input = self._create_prediction_input(
            feature_row,
            feature_columns,
        )
        value = self._predict_value(
            model,
            prediction_input,
        )
        is_holiday = self._is_holiday(
            current_date,
            finnish_holidays,
        )
        value = self._apply_holiday_rule(
            value,
            is_holiday,
        )

        return self._create_prediction_result(
            current_date=current_date,
            location=location,
            value=value,
            is_holiday=is_holiday,
        )

    # Muodostaa yhden päivän feature-arvot.
    def _create_feature_row(
        self,
        current_date,
        history,
    ):
        row = {
            "year": current_date.year,
            "month": current_date.month,
            "day_of_week": current_date.dayofweek,
            "day_of_year": current_date.dayofyear,
        }

        self._add_lag_features(
            row,
            history,
        )

        return row

    # Lisää seitsemän edellisen päivän arvot featureihin.
    def _add_lag_features(self, row, history):
        lags = history[-7:][::-1]

        for index, value in enumerate(
            lags,
            start=1,
        ):
            row[f"lag_{index}"] = value

    # Muuntaa yhden päivän featuret DataFrameksi.
    def _create_prediction_input(
        self,
        feature_row,
        feature_columns,
    ):
        return pd.DataFrame(
            [feature_row],
            columns=feature_columns,
        )

    # Muodostaa ja pyöristää mallin ennusteen.
    def _predict_value(
        self,
        model,
        prediction_input,
    ):
        value = model.predict(
            prediction_input
        )[0]

        return max(0, int(round(value)))

    # Tarkistaa, onko päivä suomalainen pyhäpäivä.
    def _is_holiday(
        self,
        current_date,
        finnish_holidays,
    ):
        return (
            current_date.date()
            in finnish_holidays
        )

    # Asettaa pyhäpäivän ennusteen nollaksi.
    def _apply_holiday_rule(
        self,
        value,
        is_holiday,
    ):
        if is_holiday:
            return 0

        return value

    # Muodostaa API:lle palautettavan ennusterivin.
    def _create_prediction_result(
        self,
        current_date,
        location,
        value,
        is_holiday,
    ):
        return {
            "date": (
                current_date
                .date()
                .isoformat()
            ),
            "location": (
                location
                or "Kaikki näytteenotot"
            ),
            "predicted_patient_count": value,
            "holiday": is_holiday,
        }

    # Muodostaa historiadatasta jatkuvan päiväkohtaisen aikasarjan.
    def _prepare_history(self, rows):
        self._validate_rows(rows)

        dataframe = self._create_dataframe(rows)
        daily = self._group_data_by_date(dataframe)

        return self._fill_missing_dates(daily)

    # Tarkistaa, että historiadataa löytyi.
    def _validate_rows(self, rows):
        if not rows:
            raise ValueError(
                "Historiadataa ei löytynyt."
            )

    # Muuntaa tietokantarivit DataFrameksi.
    def _create_dataframe(self, rows):
        dataframe = pd.DataFrame(rows)

        dataframe["date"] = pd.to_datetime(
            dataframe["date"]
        )

        return dataframe

    # Ryhmittelee näytemäärät päivätasolle.
    def _group_data_by_date(self, dataframe):
        return (
            dataframe
            .groupby("date")["samples_taken"]
            .sum()
            .to_frame(TARGET_COLUMN)
        )

    # Lisää puuttuvat päivät aikasarjaan nolla-arvoilla.
    def _fill_missing_dates(self, daily):
        full_index = self._create_date_index(daily)

        return daily.reindex(
            full_index,
            fill_value=0,
        )

    # Luo jatkuvan päivämääräindeksin.
    def _create_date_index(self, daily):
        return pd.date_range(
            daily.index.min(),
            daily.index.max(),
            freq="D",
        )
