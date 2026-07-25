# api/services/features.py

import pandas as pd


TARGET_COLUMN = "patient_count"

CALENDAR_FEATURE_COLUMNS = [
    "year",
    "month",
    "day_of_week",
    "day_of_year",
]

WEATHER_FEATURE_COLUMNS = [
    "temperature_mean",
    "precipitation",
    "snowfall",
]

LAG_FEATURE_COLUMNS = [
    f"lag_{lag}"
    for lag in range(1, 8)
]

MODEL_FEATURE_COLUMNS = [
    *CALENDAR_FEATURE_COLUMNS,
    *WEATHER_FEATURE_COLUMNS,
    *LAG_FEATURE_COLUMNS,
]


# Muodostaa päiväkohtaiset featuret mallin käyttöön.
def create_daily_features(df):
    dataframe = _copy_dataframe(df)
    dataframe = _ensure_datetime_index(dataframe)

    _validate_target_column(dataframe)
    _validate_weather_columns(dataframe)

    dataframe = _normalize_weather_features(
        dataframe
    )
    dataframe = _add_calendar_features(
        dataframe
    )
    dataframe = _add_lag_features(
        dataframe
    )

    return _drop_missing_rows(dataframe)


# Palauttaa mallin käyttämien featureiden nimet.
def get_model_feature_columns():
    return MODEL_FEATURE_COLUMNS.copy()


# Luo kopion DataFramesta.
def _copy_dataframe(df):
    return df.copy()


# Varmistaa, että DataFramessa on DatetimeIndex.
def _ensure_datetime_index(df):
    if not isinstance(
        df.index,
        pd.DatetimeIndex,
    ):
        df.index = pd.to_datetime(df.index)

    return df.sort_index()


# Tarkistaa, että ennustettava sarake löytyy.
def _validate_target_column(df):
    if TARGET_COLUMN not in df.columns:
        raise ValueError(
            f"DataFramesta puuttuu "
            f"{TARGET_COLUMN}-sarake."
        )


# Tarkistaa, että kaikki sääfeaturet löytyvät.
def _validate_weather_columns(df):
    missing_columns = [
        column
        for column in WEATHER_FEATURE_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        missing_text = ", ".join(
            missing_columns
        )

        raise ValueError(
            "DataFramesta puuttuvat seuraavat "
            f"sääfeaturet: {missing_text}."
        )


# Muuntaa sääfeaturet numeeriseen muotoon.
def _normalize_weather_features(df):
    for column in WEATHER_FEATURE_COLUMNS:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    return df


# Lisää kalenteriin perustuvat featuret.
def _add_calendar_features(df):
    df["year"] = df.index.year
    df["month"] = df.index.month
    df["day_of_week"] = (
        df.index.dayofweek
    )
    df["day_of_year"] = (
        df.index.dayofyear
    )

    return df


# Lisää seitsemän edellisen päivän lag-featuret.
def _add_lag_features(df):
    for lag in range(1, 8):
        df[f"lag_{lag}"] = (
            df[TARGET_COLUMN].shift(lag)
        )

    return df


# Poistaa rivit, joilta puuttuu mallin tarvitsemia arvoja.
def _drop_missing_rows(df):
    required_columns = [
        TARGET_COLUMN,
        *MODEL_FEATURE_COLUMNS,
    ]

    return df.dropna(
        subset=required_columns
    )