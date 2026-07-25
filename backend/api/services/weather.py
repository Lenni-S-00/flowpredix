# api/services/weather.py

import os
from datetime import date

import pandas as pd
import requests


class WeatherService:
    FORECAST_URL = (
        "https://api.open-meteo.com/v1/forecast"
    )
    HISTORY_URL = (
        "https://archive-api.open-meteo.com/v1/archive"
    )

    DAILY_VARIABLES = [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "rain_sum",
        "snowfall_sum",
    ]

    REQUEST_TIMEOUT_SECONDS = 15

    # Alustaa sääpalvelun ja käytettävät koordinaatit.
    def __init__(self):
        self.latitude = 60.4518
        self.longitude = 22.2666

    # Hakee tulevien päivien sääennusteen.
    def get_forecast(
        self,
        dates,
        location=None,
    ):
        normalized_dates = self._normalize_dates(dates)

        self._validate_dates(normalized_dates)

        response_data = self._request_weather(
            url=self.FORECAST_URL,
            start_date=normalized_dates.min(),
            end_date=normalized_dates.max(),
        )

        return self._create_weather_by_date(
            response_data
        )

    # Hakee historialliset säätiedot annetuille päiville.
    def get_history(
        self,
        dates,
        location=None,
    ):
        normalized_dates = self._normalize_dates(dates)

        self._validate_dates(normalized_dates)

        response_data = self._request_weather(
            url=self.HISTORY_URL,
            start_date=normalized_dates.min(),
            end_date=normalized_dates.max(),
        )

        return self._create_weather_by_date(
            response_data
        )

    # Valitsee parametrina tai ympäristömuuttujana annetun koordinaatin.
    def _resolve_coordinate(
        self,
        value,
        environment_name,
    ):
        coordinate = (
            value
            if value is not None
            else os.getenv(environment_name)
        )

        if coordinate is None:
            raise ValueError(
                f"Koordinaatti puuttuu. Aseta "
                f"{environment_name}-ympäristömuuttuja."
            )

        try:
            return float(coordinate)
        except (TypeError, ValueError) as error:
            raise ValueError(
                f"{environment_name} ei ole kelvollinen "
                f"koordinaatti."
            ) from error

    # Muuntaa päivämäärät Pandasin päivämääräindeksiksi.
    def _normalize_dates(self, dates):
        normalized_dates = pd.DatetimeIndex(
            pd.to_datetime(dates)
        ).normalize()

        return normalized_dates.sort_values()

    # Tarkistaa, että säähaulle annettiin päivämääriä.
    def _validate_dates(self, dates):
        if len(dates) == 0:
            raise ValueError(
                "Säätietojen hakemiseen tarvitaan "
                "vähintään yksi päivämäärä."
            )

    # Tekee pyynnön Open-Meteon rajapintaan.
    def _request_weather(
        self,
        url,
        start_date,
        end_date,
    ):
        parameters = self._create_request_parameters(
            start_date=start_date,
            end_date=end_date,
        )

        try:
            response = requests.get(
                url,
                params=parameters,
                timeout=self.REQUEST_TIMEOUT_SECONDS,
            )

            response.raise_for_status()
        except requests.RequestException as error:
            raise RuntimeError(
                "Säätietojen hakeminen Open-Meteolta "
                "epäonnistui."
            ) from error

        response_data = response.json()

        self._validate_response(response_data)

        return response_data

    # Muodostaa Open-Meteolle lähetettävät parametrit.
    def _create_request_parameters(
        self,
        start_date,
        end_date,
    ):
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "start_date": self._to_api_date(
                start_date
            ),
            "end_date": self._to_api_date(
                end_date
            ),
            "daily": ",".join(
                self.DAILY_VARIABLES
            ),
            "timezone": "Europe/Helsinki",
        }

    # Muuntaa päivämäärän API:n käyttämään muotoon.
    def _to_api_date(self, value):
        return pd.Timestamp(value).date().isoformat()

    # Tarkistaa, että vastaus sisältää päiväkohtaiset säätiedot.
    def _validate_response(self, response_data):
        if response_data.get("error"):
            reason = response_data.get(
                "reason",
                "Tuntematon Open-Meteo-virhe.",
            )

            raise RuntimeError(
                f"Open-Meteo palautti virheen: {reason}"
            )

        daily = response_data.get("daily")

        if not daily:
            raise RuntimeError(
                "Open-Meteo ei palauttanut "
                "päiväkohtaisia säätietoja."
            )

        if not daily.get("time"):
            raise RuntimeError(
                "Open-Meteon vastauksesta puuttuvat "
                "päivämäärät."
            )

    # Muuntaa API-vastauksen päivämäärällä haettavaksi sanakirjaksi.
    def _create_weather_by_date(
        self,
        response_data,
    ):
        daily = response_data["daily"]
        dates = daily["time"]

        weather_by_date = {}

        for index, date_string in enumerate(dates):
            weather_by_date[
                date.fromisoformat(date_string)
            ] = self._create_weather_row(
                daily=daily,
                index=index,
            )

        return weather_by_date

    # Muodostaa yhden päivän sääfeaturet.
    def _create_weather_row(
        self,
        daily,
        index,
    ):
        temperature_max = self._get_daily_value(
            daily=daily,
            variable="temperature_2m_max",
            index=index,
        )
        temperature_min = self._get_daily_value(
            daily=daily,
            variable="temperature_2m_min",
            index=index,
        )

        return {
            "temperature_max": temperature_max,
            "temperature_min": temperature_min,
            "temperature_mean": self._calculate_mean_temperature(
                temperature_min=temperature_min,
                temperature_max=temperature_max,
            ),
            "precipitation": self._get_daily_value(
                daily=daily,
                variable="precipitation_sum",
                index=index,
            ),
            "rain": self._get_daily_value(
                daily=daily,
                variable="rain_sum",
                index=index,
            ),
            "snowfall": self._get_daily_value(
                daily=daily,
                variable="snowfall_sum",
                index=index,
            ),
        }

    # Palauttaa yhden säämuuttujan arvon turvallisesti.
    def _get_daily_value(
        self,
        daily,
        variable,
        index,
    ):
        values = daily.get(variable)

        if values is None:
            return 0.0

        value = values[index]

        if value is None:
            return 0.0

        return float(value)

    # Laskee vuorokauden keskimääräisen lämpötilan.
    def _calculate_mean_temperature(
        self,
        temperature_min,
        temperature_max,
    ):
        return (
            temperature_min + temperature_max
        ) / 2