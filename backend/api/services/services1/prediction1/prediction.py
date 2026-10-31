# Muodostaa päiväkohtaiset asiakasmääräennusteet historiadatan,
# säädatan, pyhäpäivien ja koulutetun ennustemallin perusteella.

import holidays
import pandas as pd
from django.core.cache import cache

from api.services.services1.ml1.features import (
    TARGET_COLUMN,
    WEATHER_FEATURE_COLUMNS,
    get_model_feature_columns,
)
from api.services.services1.ml1.model_registry import ModelRegistry
from api.services.services1.data1.repositories import SampleDataRepository
from api.services.weather import WeatherService


# Käytetään varsinaista sääennustetta tämän pituiselle jaksolle.
WEATHER_FORECAST_DAYS = 14

# Valmis ennuste säilytetään välimuistissa 30 minuuttia.
PREDICTION_CACHE_SECONDS = 30 * 60


class PredictionService:

    def __init__(self, organization):
        self.organization = organization
        self.repository = SampleDataRepository(organization=organization)
        self.registry = ModelRegistry(organization=organization)
        self.weather_service = WeatherService()

    # Muodostaa ennusteet annetulle määrälle tulevia päiviä.
    def predict(self, days=14, location=None):
        self._validate_days(days)

        history_df = self._load_history(location)
        self._validate_history(history_df)

        future_dates = self._create_future_dates(days)
        history = self._get_initial_history(history_df)

        cache_key = self._create_prediction_cache_key(
            days=days,
            location=location,
            future_dates=future_dates,
            history=history,
        )

        cached_predictions = cache.get(cache_key)

        if cached_predictions is not None:
            return cached_predictions

        model = self.registry.load(location)
        feature_columns = get_model_feature_columns()

        self._validate_model_features(model, feature_columns)

        finnish_holidays = self._get_holidays(future_dates)

        weather_by_date = self._get_weather_data(
            future_dates=future_dates,
            location=location,
        )

        predictions = self._predict_dates(
            model=model,
            future_dates=future_dates,
            history=history,
            feature_columns=feature_columns,
            finnish_holidays=finnish_holidays,
            weather_by_date=weather_by_date,
            location=location,
        )

        cache.set(
            cache_key,
            predictions,
            timeout=PREDICTION_CACHE_SECONDS,
        )

        return predictions

    # Hakee kaiken ennustamiseen käytettävän historiadatan.
    def _load_history(self, location):
        rows = self.repository.get_daily_data(location)
        return self._prepare_history(rows)

    # Muodostaa välimuistiavaimen ennusteen lähtötiedoista.
    def _create_prediction_cache_key(
        self,
        days,
        location,
        future_dates,
        history,
    ):
        model_path = self.registry.get_path(location)
        self._validate_model_path_for_cache(model_path)

        location_key = location or "all_units"
        history_key = "-".join(str(float(value)) for value in history)
        start_date = future_dates.min().date().isoformat()

        return (
            f"prediction:{self.organization.id}:"
            f"{location_key}:"
            f"{start_date}:{days}:"
            f"{model_path.stat().st_mtime_ns}:"
            f"{history_key}"
        )

    # Tarkistaa välimuistiavainta varten, että mallitiedosto löytyy.
    def _validate_model_path_for_cache(self, model_path):
        if not model_path.exists():
            raise FileNotFoundError(
                f"Ennustemallia ei löytynyt: {model_path}"
            )

    # Tarkistaa, että ennustepäivien määrä on kelvollinen.
    def _validate_days(self, days):
        if not isinstance(days, int):
            raise ValueError(
                "Ennustepäivien määrän täytyy olla kokonaisluku."
            )

        if days < 1:
            raise ValueError(
                "Ennustepäivien määrän täytyy olla vähintään yksi."
            )

    # Tarkistaa, että ennustamiseen on riittävästi historiadataa.
    def _validate_history(self, history_df):
        if len(history_df) < 7:
            raise ValueError(
                "Ennustamiseen tarvitaan vähintään seitsemän päivän historia."
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
            .astype(float)
            .values
        )

    # Tarkistaa, että tallennettu malli käyttää oikeita featureita.
    def _validate_model_features(self, model, feature_columns):
        model_columns = getattr(
            model,
            "feature_names_in_",
            None,
        )

        if model_columns is None:
            return

        if list(model_columns) != feature_columns:
            raise ValueError(
                "Tallennettu ennustemalli käyttää eri "
                "featureita kuin nykyinen sovellus. "
                "Kouluta malli uudelleen."
            )

    # Palauttaa ennustejakson suomalaiset pyhäpäivät.
    def _get_holidays(self, future_dates):
        return holidays.FI(
            years=range(
                future_dates.min().year,
                future_dates.max().year + 1,
            )
        )

    # Hakee sääarvot koko ennustejaksolle.
    def _get_weather_data(self, future_dates, location):
        forecast_dates = future_dates[:WEATHER_FORECAST_DAYS]
        long_range_dates = future_dates[WEATHER_FORECAST_DAYS:]

        weather_by_date = {}

        if len(forecast_dates) > 0:
            forecast_weather = self.weather_service.get_forecast(
                dates=forecast_dates,
                location=location,
            )
            weather_by_date.update(forecast_weather)

        if len(long_range_dates) > 0:
            long_range_weather = self._get_long_range_weather(
                future_dates=long_range_dates,
                location=location,
            )
            weather_by_date.update(long_range_weather)

        return self._fill_missing_weather(
            future_dates=future_dates,
            weather_by_date=weather_by_date,
            location=location,
        )

    # Käyttää pitkän aikavälin sääarviona edellisen vuoden säätä.
    def _get_long_range_weather(self, future_dates, location):
        proxy_date_mapping = self._create_proxy_date_mapping(future_dates)
        proxy_dates = list(proxy_date_mapping.values())

        historical_weather = self.weather_service.get_history(
            dates=proxy_dates,
            location=location,
        )

        weather_by_future_date = {}

        for future_date, proxy_date in proxy_date_mapping.items():
            weather = historical_weather.get(proxy_date)

            if weather is not None:
                weather_by_future_date[future_date] = weather

        return weather_by_future_date

    # Muodostaa tuleville päiville edellisen vuoden vertailupäivät.
    def _create_proxy_date_mapping(self, future_dates):
        mapping = {}

        for future_timestamp in future_dates:
            future_date = future_timestamp.date()
            proxy_date = self._get_previous_year_date(future_timestamp)

            mapping[future_date] = proxy_date

        return mapping

    # Palauttaa vastaavan päivän edelliseltä vuodelta.
    def _get_previous_year_date(self, timestamp):
        try:
            return timestamp.replace(
                year=timestamp.year - 1
            ).date()

        except ValueError:
            # Karkausvuoden 29.2. korvataan 28.2. päivällä.
            return timestamp.replace(
                year=timestamp.year - 1,
                day=28,
            ).date()

    # Täydentää mahdollisesti puuttuvat sääpäivät.
    def _fill_missing_weather(
        self,
        future_dates,
        weather_by_date,
        location,
    ):
        completed_weather = dict(weather_by_date)

        missing_dates = [
            timestamp
            for timestamp in future_dates
            if timestamp.date() not in completed_weather
        ]

        if missing_dates:
            fallback_weather = self._get_long_range_weather(
                future_dates=missing_dates,
                location=location,
            )
            completed_weather.update(fallback_weather)

        self._validate_weather_data(
            future_dates=future_dates,
            weather_by_date=completed_weather,
        )

        return completed_weather

    # Tarkistaa, että jokaiselle päivälle löytyvät tarvittavat sääarvot.
    def _validate_weather_data(
        self,
        future_dates,
        weather_by_date,
    ):
        for timestamp in future_dates:
            current_date = timestamp.date()
            weather = weather_by_date.get(current_date)

            if weather is None:
                raise ValueError(
                    "Säätietoa ei löytynyt päivälle "
                    f"{current_date.isoformat()}."
                )

            missing_columns = [
                column
                for column in WEATHER_FEATURE_COLUMNS
                if weather.get(column) is None
            ]

            if missing_columns:
                missing_text = ", ".join(missing_columns)

                raise ValueError(
                    "Säätiedosta puuttuvat arvot "
                    f"päivälle {current_date}: "
                    f"{missing_text}."
                )

    # Ennustaa kaikki tulevat päivät yksi kerrallaan.
    def _predict_dates(
        self,
        model,
        future_dates,
        history,
        feature_columns,
        finnish_holidays,
        weather_by_date,
        location,
    ):
        predictions = []

        for current_date in future_dates:
            weather = weather_by_date[current_date.date()]

            prediction = self._predict_single_date(
                model=model,
                current_date=current_date,
                history=history,
                weather=weather,
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
        weather,
        feature_columns,
        finnish_holidays,
        location,
    ):
        feature_row = self._create_feature_row(
            current_date=current_date,
            history=history,
            weather=weather,
        )

        prediction_input = self._create_prediction_input(
            feature_row=feature_row,
            feature_columns=feature_columns,
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
            weather=weather,
        )

    # Muodostaa yhden päivän feature-arvot.
    def _create_feature_row(
        self,
        current_date,
        history,
        weather,
    ):
        row = {
            "year": current_date.year,
            "month": current_date.month,
            "day_of_week": current_date.dayofweek,
            "day_of_year": current_date.dayofyear,
        }

        self._add_weather_features(
            row=row,
            weather=weather,
        )

        self._add_lag_features(
            row=row,
            history=history,
        )

        return row

    # Lisää päivän sääarvot featureihin.
    def _add_weather_features(self, row, weather):
        for column in WEATHER_FEATURE_COLUMNS:
            row[column] = float(weather[column])

    # Lisää seitsemän edellisen päivän arvot featureihin.
    def _add_lag_features(self, row, history):
        lags = history[-7:][::-1]

        for index, value in enumerate(lags, start=1):
            row[f"lag_{index}"] = float(value)

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
    def _predict_value(self, model, prediction_input):
        value = model.predict(prediction_input)[0]

        return max(0, int(round(value)))

    # Tarkistaa, onko päivä suomalainen pyhäpäivä.
    def _is_holiday(self, current_date, finnish_holidays):
        return current_date.date() in finnish_holidays

    # Asettaa pyhäpäivän ennusteen nollaksi.
    def _apply_holiday_rule(self, value, is_holiday):
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
        weather,
    ):
        return {
            "date": current_date.date().isoformat(),
            "location": location or "Kaikki näytteenotot",
            "predicted_patient_count": value,
            "holiday": is_holiday,
            "weather": {
                column: float(weather[column])
                for column in WEATHER_FEATURE_COLUMNS
            },
        }

    # Muodostaa historiadatasta jatkuvan päiväkohtaisen aikasarjan.
    def _prepare_history(self, rows):
        self._validate_rows(rows)

        totals_by_date = self._sum_rows_by_date(rows)
        daily = self._create_daily_dataframe(totals_by_date)

        return self._fill_missing_dates(daily)

    # Tarkistaa, että historiadataa löytyi.
    def _validate_rows(self, rows):
        if not rows:
            raise ValueError(
                "Historiadataa ei löytynyt."
            )

    # Laskee toimipistekohtaiset tietokantarivit yhteen päivittäin.
    def _sum_rows_by_date(self, rows):
        totals_by_date = {}

        for row in rows:
            current_date = pd.Timestamp(
                row["date"]
            ).normalize()

            totals_by_date[current_date] = (
                totals_by_date.get(current_date, 0)
                + float(row["samples_taken"])
            )

        return totals_by_date

    # Muodostaa päiväkohtaisista summista DataFramen.
    def _create_daily_dataframe(self, totals_by_date):
        daily = pd.DataFrame.from_dict(
            totals_by_date,
            orient="index",
            columns=[TARGET_COLUMN],
        )

        daily.index = pd.DatetimeIndex(daily.index)

        return daily.sort_index()

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