# Kouluttaa organisaatio 2:n päivittäisen asiakasmäärän ennustemallin.
# Malli käyttää kalenteritietoja ja etukäteen tiedossa olevaa ajanvarauskapasiteettia.

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from api.services.services2.ml2.features import (
    TARGET_COLUMN,
    create_daily_features,
)


FEATURE_COLUMNS = [
    "year",
    "month",
    "week_of_year",
    "day_of_week",
    "day_of_year",
    "appointment_slots",
    "capacity_minutes",
]

MINIMUM_ROWS = 30
TEST_SHARE = 0.20
RANDOM_STATE = 42


class PredictionTrainer:
    """Kouluttaa organisaatio 2:n asiakasmäärän ennustemallin."""

    def __init__(self, organization):
        self.organization = organization

    # Kouluttaa mallin annetusta ajanvaraus- ja vuoronumerodatasta.
    def train(
        self,
        appointment_data,
        queue_data,
    ):
        df = self._prepare_training_data(
            appointment_data,
            queue_data,
        )

        self._validate_training_data(df)

        train_df, test_df = self._split_data(df)

        model = self._train_model(
            train_df
        )

        metrics = self._evaluate_model(
            model,
            test_df,
        )

        feature_importance = (
            self._get_feature_importance(
                model
            )
        )

        return {
            "model": model,
            "metrics": metrics,
            "training_start": train_df["date"].min(),
            "training_end": train_df["date"].max(),
            "training_rows": len(train_df),
            "testing_rows": len(test_df),
            "features": FEATURE_COLUMNS.copy(),
            "feature_importance": feature_importance,
        }

    # Muodostaa ja siistii mallin koulutusaineiston.
    def _prepare_training_data(
        self,
        appointment_data,
        queue_data,
    ):
        df = create_daily_features(
            appointment_data,
            queue_data,
        )

        df = df.copy()

        df["date"] = pd.to_datetime(
            df["date"],
            errors="coerce",
        )

        numeric_columns = (
            FEATURE_COLUMNS
            + [TARGET_COLUMN]
        )

        for column in numeric_columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            )

        df = df.replace(
            [np.inf, -np.inf],
            np.nan,
        )

        df = df.dropna(
            subset=[
                "date",
                TARGET_COLUMN,
                *FEATURE_COLUMNS,
            ]
        )

        return df.sort_values(
            ["date", "location"]
        ).reset_index(drop=True)

    # Tarkistaa, että koulutukseen on riittävästi dataa.
    def _validate_training_data(
        self,
        df,
    ):
        if len(df) < MINIMUM_ROWS:
            raise ValueError(
                "Prediction model requires at least "
                f"{MINIMUM_ROWS} daily observations. "
                f"Received {len(df)}."
            )

        if df[TARGET_COLUMN].nunique() < 2:
            raise ValueError(
                "Customer count does not contain "
                "enough variation for model training."
            )

    # Jakaa datan kronologisesti koulutus- ja testidataan.
    def _split_data(
        self,
        df,
    ):
        unique_dates = (
            df["date"]
            .drop_duplicates()
            .sort_values()
            .reset_index(drop=True)
        )

        split_index = int(
            len(unique_dates)
            * (1 - TEST_SHARE)
        )

        if (
            split_index <= 0
            or split_index >= len(unique_dates)
        ):
            raise ValueError(
                "Training or testing dataset is empty."
            )

        split_date = unique_dates.iloc[
            split_index
        ]

        train_df = df[
            df["date"] < split_date
        ].copy()

        test_df = df[
            df["date"] >= split_date
        ].copy()

        if train_df.empty or test_df.empty:
            raise ValueError(
                "Training or testing dataset is empty."
            )

        return train_df, test_df

    # Kouluttaa Random Forest -mallin.
    def _train_model(
        self,
        train_df,
    ):
        model = RandomForestRegressor(
            n_estimators=300,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )

        model.fit(
            train_df[FEATURE_COLUMNS],
            train_df[TARGET_COLUMN],
        )

        return model

    # Laskee mallin suorituskykymittarit testidatalla.
    def _evaluate_model(
        self,
        model,
        test_df,
    ):
        actual = test_df[
            TARGET_COLUMN
        ]

        predicted = model.predict(
            test_df[FEATURE_COLUMNS]
        )

        return {
            "r2": float(
                r2_score(
                    actual,
                    predicted,
                )
            ),
            "mae": float(
                mean_absolute_error(
                    actual,
                    predicted,
                )
            ),
            "mse": float(
                mean_squared_error(
                    actual,
                    predicted,
                )
            ),
        }

    # Palauttaa mallin featureiden suhteelliset tärkeydet.
    def _get_feature_importance(
        self,
        model,
    ):
        return {
            feature: float(importance)
            for feature, importance in zip(
                FEATURE_COLUMNS,
                model.feature_importances_,
            )
        }