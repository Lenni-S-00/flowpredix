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
    create_daily_features,
)
from api.services.model_registry import ModelRegistry
from api.services.repositories import SampleDataRepository


class PredictionTrainer:

    # Alustaa koulutuksessa käytettävät palvelut.
    def __init__(self):
        self.repository = SampleDataRepository()
        self.registry = ModelRegistry()

    # Kouluttaa ja tallentaa yhden ennustemallin.
    def train(self, location=None):
        rows = self.repository.get_daily_data(location)

        daily_df = self._prepare_dataframe(rows)

        self._validate_training_data(daily_df)

        feature_df = create_daily_features(daily_df)

        x, y = self._separate_features_and_target(
            feature_df
        )

        (
            x_train,
            x_test,
            y_train,
            y_test,
        ) = self._split_training_data(x, y)

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
            location=location,
            path=path,
            daily_df=daily_df,
            x_train=x_train,
            x_test=x_test,
            y_test=y_test,
            predictions=predictions,
        )

    # Tarkistaa, että koulutusdataa on riittävästi.
    def _validate_training_data(self, daily_df):
        if len(daily_df) < 30:
            raise ValueError(
                "Mallin kouluttamiseen tarvitaan "
                "vähintään 30 päivän data."
            )

    # Erottelee featuret ja ennustettavan muuttujan.
    def _separate_features_and_target(
        self,
        feature_df,
    ):
        x = feature_df.drop(
            columns=[TARGET_COLUMN]
        )
        y = feature_df[TARGET_COLUMN]

        return x, y

    # Jakaa datan koulutus- ja testiosiin.
    def _split_training_data(self, x, y):
        split_point = int(len(x) * 0.8)

        x_train = x.iloc[:split_point]
        x_test = x.iloc[split_point:]

        y_train = y.iloc[:split_point]
        y_test = y.iloc[split_point:]

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
        model.fit(x_train, y_train)

    # Muodostaa ennusteet testidatalle.
    def _predict_test_data(
        self,
        model,
        x_test,
    ):
        return model.predict(x_test)

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

    # Muodostaa koulutuksen palauttamat metatiedot.
    def _create_training_result(
        self,
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

        return {
            "location": location,
            "model_path": str(path),
            "model_type": "RandomForestRegressor",
            "feature_version": 1,
            "training_start": (
                daily_df.index.min().date()
            ),
            "training_end": (
                daily_df.index.max().date()
            ),
            **metrics,
            "training_rows": len(x_train),
            "testing_rows": len(x_test),
        }

    # Muodostaa historiadatasta jatkuvan päiväkohtaisen DataFramen.
    def _prepare_dataframe(self, rows):
        self._validate_rows(rows)

        dataframe = self._create_dataframe(rows)
        daily = self._group_data_by_date(dataframe)

        return self._fill_missing_dates(daily)

    # Tarkistaa, että historiadataa löytyi.
    def _validate_rows(self, rows):
        if not rows:
            raise ValueError(
                "Koulutusdataa ei löytynyt."
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
