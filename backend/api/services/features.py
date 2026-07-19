# api/services/features.py

import pandas as pd


TARGET_COLUMN = "patient_count"


# Muodostaa päiväkohtaiset featuret mallin käyttöön.
def create_daily_features(df):
    dataframe = _copy_dataframe(df)
    dataframe = _ensure_datetime_index(dataframe)

    dataframe = _add_calendar_features(dataframe)
    dataframe = _add_lag_features(dataframe)

    return _drop_missing_rows(dataframe)


# Luo kopion DataFramesta.
def _copy_dataframe(df):
    return df.copy()


# Varmistaa, että DataFramessa on DatetimeIndex.
def _ensure_datetime_index(df):
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    return df


# Lisää kalenteriin perustuvat featuret.
def _add_calendar_features(df):
    df["year"] = df.index.year
    df["month"] = df.index.month
    df["day_of_week"] = df.index.dayofweek
    df["day_of_year"] = df.index.dayofyear

    return df


# Lisää seitsemän edellisen päivän lag-featuret.
def _add_lag_features(df):
    for lag in range(1, 8):
        df[f"lag_{lag}"] = (
            df[TARGET_COLUMN].shift(lag)
        )

    return df


# Poistaa rivit, joilta puuttuu feature-arvoja.
def _drop_missing_rows(df):
    return df.dropna()
