# api/services/training.py

import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from api.services.features import (
    TARGET_COLUMN,
    WEATHER_FEATURE_COLUMNS,
    create_daily_features,
    get_model_feature_columns,
)
from api.services.model_registry import ModelRegistry
from api.services.repositories import SampleDataRepository
from api.services.weather import WeatherService


class PredictionTrainer:

    # Alustaa koulutuksessa käytettävät palvelut.
    def __init__(self):
        self.repository = SampleDataRepository()
        self.registry = ModelRegistry()
        self.weather_service = WeatherService()

    # Kouluttaa ja tallentaa yhden ennustemallin.
    def train(self, location=None):
        rows = self.repository.get_daily_data(
            location
        )

        daily_df = self._prepare_dataframe(
            rows
        )

        self._validate_training_data(
            daily_df
        )

        daily_df = self._add_weather_data(
            daily_df=daily_df,
            location=location,
        )

        feature_df = create_daily_features(
            daily_df
        )

        self._validate_feature_data(
            feature_df
        )

        x, y = self._separate_features_and_target(
            feature_df
        )

        (
            x_train,
            x_test,
            y_train,
            y_test,
        ) = self._split_training_data(
            x,
            y,
        )

        model = self._create_model()

        self._train_model(
            model,
            x_train,
            y_train,
        )

        predictions = self._predict_test_data(
            model,
            x_test,
        )

        path = self._save_model(
            model,
            location,
        )

        return self._create_training_result(
            model=model,
            feature_columns=list(x.columns),
            location=location,
            path=path,
            daily_df=daily_df,
            x_train=x_train,
            x_test=x_test,
            y_test=y_test,
            predictions=predictions,
        )

    # Tarkistaa, että koulutusdataa on riittävästi.
    def _validate_training_data(
        self,
        daily_df,
    ):
        if len(daily_df) < 30:
            raise ValueError(
                "Mallin kouluttamiseen tarvitaan "
                "vähintään 30 päivän data."
            )

    # Tarkistaa, että featureiden muodostamisen jälkeen dataa jäi riittävästi.
    def _validate_feature_data(
        self,
        feature_df,
    ):
        if len(feature_df) < 20:
            raise ValueError(
                "Koulutukseen jäi liian vähän rivejä "
                "featureiden muodostamisen jälkeen."
            )

    # Hakee historiallisen sään ja lisää sen päiväkohtaiseen dataan.
    def _add_weather_data(
        self,
        daily_df,
        location,
    ):
        weather_by_date = (
            self.weather_service.get_history(
                dates=daily_df.index,
                location=location,
            )
        )

        weather_df = self._create_weather_dataframe(
            weather_by_date
        )

        combined_df = daily_df.join(
            weather_df,
            how="left",
        )

        return self._handle_missing_weather(
            combined_df
        )

    # Muuntaa sääpalvelun vastauksen DataFrameksi.
    def _create_weather_dataframe(
        self,
        weather_by_date,
    ):
        if not weather_by_date:
            raise ValueError(
                "Historiallisia säätietoja ei löytynyt."
            )

        weather_df = pd.DataFrame.from_dict(
            weather_by_date,
            orient="index",
        )

        weather_df.index = pd.to_datetime(
            weather_df.index
        )

        weather_df.index.name = "date"

        return weather_df[
            WEATHER_FEATURE_COLUMNS
        ].sort_index()

    # Täydentää yksittäiset puuttuvat sääarvot.
    def _handle_missing_weather(
        self,
        dataframe,
    ):
        dataframe = dataframe.copy()

        missing_columns = [
            column
            for column in WEATHER_FEATURE_COLUMNS
            if column not in dataframe.columns
        ]

        if missing_columns:
            missing_text = ", ".join(
                missing_columns
            )

            raise ValueError(
                "Säädatasta puuttuvat sarakkeet: "
                f"{missing_text}."
            )

        dataframe["temperature_mean"] = (
            dataframe["temperature_mean"]
            .interpolate(
                method="time",
                limit_direction="both",
            )
        )

        dataframe["precipitation"] = (
            dataframe["precipitation"]
            .fillna(0.0)
        )

        dataframe["snowfall"] = (
            dataframe["snowfall"]
            .fillna(0.0)
        )

        self._validate_weather_data(
            dataframe
        )

        return dataframe

    # Tarkistaa, ettei koulutusdataan jää puuttuvia säätietoja.
    def _validate_weather_data(
        self,
        dataframe,
    ):
        missing_values = dataframe[
            WEATHER_FEATURE_COLUMNS
        ].isna().sum()

        columns_with_missing_values = (
            missing_values[
                missing_values > 0
            ].index.tolist()
        )

        if columns_with_missing_values:
            missing_text = ", ".join(
                columns_with_missing_values
            )

            raise ValueError(
                "Kaikkia sääarvoja ei voitu "
                f"muodostaa: {missing_text}."
            )

    # Erottelee featuret ja ennustettavan muuttujan.
    def _separate_features_and_target(
        self,
        feature_df,
    ):
        feature_columns = (
            get_model_feature_columns()
        )

        x = feature_df[
            feature_columns
        ]

        y = feature_df[
            TARGET_COLUMN
        ]

        return x, y

    # Jakaa datan koulutus- ja testiosiin.
    def _split_training_data(
        self,
        x,
        y,
    ):
        split_point = int(
            len(x) * 0.8
        )

        x_train = x.iloc[
            :split_point
        ]
        x_test = x.iloc[
            split_point:
        ]

        y_train = y.iloc[
            :split_point
        ]
        y_test = y.iloc[
            split_point:
        ]

        if x_train.empty or x_test.empty:
            raise ValueError(
                "Koulutus- ja testidataa ei voitu "
                "jakaa riittävän suuriin osiin."
            )

        return (
            x_train,
            x_test,
            y_train,
            y_test,
        )

    # Luo koulutettavan Random Forest -mallin.
    def _create_model(self):
        return RandomForestRegressor(
            n_estimators=200,
            random_state=42,
            min_samples_leaf=2,
            n_jobs=-1,
        )

    # Kouluttaa mallin annetulla datalla.
    def _train_model(
        self,
        model,
        x_train,
        y_train,
    ):
        model.fit(
            x_train,
            y_train,
        )

    # Muodostaa ennusteet testidatalle.
    def _predict_test_data(
        self,
        model,
        x_test,
    ):
        return model.predict(
            x_test
        )

    # Tallentaa koulutetun mallin tiedostoon.
    def _save_model(
        self,
        model,
        location,
    ):
        return self.registry.save(
            model=model,
            location=location,
        )

    # Laskee mallin arviointitulokset.
    def _calculate_metrics(
        self,
        y_test,
        predictions,
    ):
        return {
            "r2": float(
                r2_score(
                    y_test,
                    predictions,
                )
            ),
            "mae": float(
                mean_absolute_error(
                    y_test,
                    predictions,
                )
            ),
            "mse": float(
                mean_squared_error(
                    y_test,
                    predictions,
                )
            ),
        }
    # Laskee mallin feature importance -arvot.
    def _calculate_feature_importance(
        self,
        model,
        feature_columns,
    ):
        importance_values = model.feature_importances_

        return {
            feature: float(importance)
            for feature, importance in zip(
                feature_columns,
                importance_values,
            )
        }

    # Ryhmittelee featureiden tärkeydet historiaan, kalenteriin ja säähän.
    def _group_feature_importance(
        self,
        feature_importance,
    ):
        history_importance = sum(
            importance
            for feature, importance
            in feature_importance.items()
            if feature.startswith("lag_")
        )

        calendar_features = {
            "year",
            "month",
            "day_of_week",
            "day_of_year",
        }

        weather_features = {
            "temperature_mean",
            "precipitation",
            "snowfall",
        }

        calendar_importance = sum(
            importance
            for feature, importance
            in feature_importance.items()
            if feature in calendar_features
        )

        weather_importance = sum(
            importance
            for feature, importance
            in feature_importance.items()
            if feature in weather_features
        )

        return {
            "history": float(history_importance),
            "calendar": float(calendar_importance),
            "weather": float(weather_importance),
        }

    # Muodostaa koulutuksen palauttamat metatiedot.
    def _create_training_result(
        self,
        model,
        feature_columns,
        location,
        path,
        daily_df,
        x_train,
        x_test,
        y_test,
        predictions,
    ):
        metrics = self._calculate_metrics(
            y_test,
            predictions,
        )

        feature_importance = (
            self._calculate_feature_importance(
                model=model,
                feature_columns=feature_columns,
            )
        )

        grouped_importance = (
            self._group_feature_importance(
                feature_importance
            )
        )

        return {
            "location": location,
            "model_path": str(path),
            "model_type": (
                "RandomForestRegressor"
            ),
            "feature_version": 2,
            "weather_features": (
                WEATHER_FEATURE_COLUMNS.copy()
            ),
            "training_start": (
                daily_df.index
                .min()
                .date()
            ),
            "training_end": (
                daily_df.index
                .max()
                .date()
            ),
            **metrics,
            "training_rows": len(
                x_train
            ),
            "testing_rows": len(
                x_test
            ),
            "feature_importance": feature_importance,
            "feature_importance_groups": grouped_importance,
        }

    # Muodostaa historiadatasta jatkuvan päiväkohtaisen DataFramen.
    def _prepare_dataframe(
        self,
        rows,
    ):
        self._validate_rows(
            rows
        )

        dataframe = self._create_dataframe(
            rows
        )

        daily = self._group_data_by_date(
            dataframe
        )

        return self._fill_missing_dates(
            daily
        )

    # Tarkistaa, että historiadataa löytyi.
    def _validate_rows(
        self,
        rows,
    ):
        if not rows:
            raise ValueError(
                "Koulutusdataa ei löytynyt."
            )

    # Muuntaa tietokantarivit DataFrameksi.
    def _create_dataframe(
        self,
        rows,
    ):
        dataframe = pd.DataFrame(
            rows
        )

        dataframe["date"] = pd.to_datetime(
            dataframe["date"]
        )

        return dataframe

    # Ryhmittelee näytemäärät päivätasolle.
    def _group_data_by_date(
        self,
        dataframe,
    ):
        return (
            dataframe
            .groupby("date")[
                "samples_taken"
            ]
            .sum()
            .to_frame(
                TARGET_COLUMN
            )
            .sort_index()
        )

    # Lisää puuttuvat päivät aikasarjaan nolla-arvoilla.
    def _fill_missing_dates(
        self,
        daily,
    ):
        full_index = (
            self._create_date_index(
                daily
            )
        )

        return daily.reindex(
            full_index,
            fill_value=0,
        )

    # Luo jatkuvan päivämääräindeksin.
    def _create_date_index(
        self,
        daily,
    ):
        return pd.date_range(
            daily.index.min(),
            daily.index.max(),
            freq="D",
        )