# Esikäsittelee organisaatio 2:n ajanvaraus- ja vuoronumerodatan
# tietokantaan tallennettavaan yhtenäiseen muotoon.

import pandas as pd

from ..config import (
    APPOINTMENT_BOOLEAN_COLUMNS,
    APPOINTMENT_COLUMN_MAPPING,
    APPOINTMENT_DATETIME_COLUMNS,
    QUEUE_BOOLEAN_COLUMNS,
    QUEUE_COLUMN_MAPPING,
    QUEUE_DATETIME_COLUMNS,
)


BOOLEAN_TRUE_VALUES = {
    "1",
    "true",
    "yes",
    "kyllä",
    "kylla",
    "x",
}

BOOLEAN_FALSE_VALUES = {
    "0",
    "false",
    "no",
    "ei",
}


# Esikäsittelee ajanvarausdatan.
def preprocess_appointment_data(df):
    df = _normalize_column_names(df)

    df = _prepare_dataframe(
        df,
        APPOINTMENT_COLUMN_MAPPING,
    )

    df = _convert_datetime_columns(
        df,
        APPOINTMENT_DATETIME_COLUMNS,
    )

    df = _convert_boolean_columns(
        df,
        APPOINTMENT_BOOLEAN_COLUMNS,
    )

    df = _clean_text_columns(
        df,
        [
            "location",
            "service",
            "reservation_id",
            "resource_id",
            "reservation_status",
            "reservation_status_modified",
        ],
    )

    df = _remove_empty_appointment_rows(df)

    return df.reset_index(drop=True)


# Esikäsittelee vuoronumerodatan.
def preprocess_queue_data(df):
    df = _normalize_column_names(df)

    df = _prepare_dataframe(
        df,
        QUEUE_COLUMN_MAPPING,
    )

    df = _convert_datetime_columns(
        df,
        QUEUE_DATETIME_COLUMNS,
    )

    df = _convert_numeric_column(
        df,
        "service_promise_minutes",
    )

    df = _convert_boolean_columns(
        df,
        QUEUE_BOOLEAN_COLUMNS,
    )

    df = _clean_text_columns(
        df,
        [
            "location",
            "queue",
            "event_id",
            "final_status",
            "coverage",
        ],
    )

    df = _remove_empty_queue_rows(df)

    df = _remove_queue_duplicates(df)

    return df.reset_index(drop=True)


# Normalisoi lähdedatan sarakenimet.
def _normalize_column_names(df):
    df = df.copy()

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.lower()
    )

    return df


# Valitsee tarvittavat sarakkeet ja nimeää ne tietokantamallin mukaisesti.
def _prepare_dataframe(df, column_map):
    _validate_required_columns(
        df,
        column_map,
    )

    df = df[
        list(column_map.keys())
    ].copy()

    return df.rename(
        columns=column_map
    )


# Tarkistaa, että kaikki tarvittavat lähdesarakkeet löytyvät datasta.
def _validate_required_columns(df, column_map):
    missing_columns = [
        column
        for column in column_map
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Datasta puuttuvat sarakkeet: "
            + ", ".join(missing_columns)
        )


# Muuntaa annetut sarakkeet aikaleimoiksi.
def _convert_datetime_columns(
    df,
    columns,
):
    for column in columns:
        df[column] = pd.to_datetime(
            df[column],
            errors="coerce",
        )

    return df


# Muuntaa sarakkeen numeeriseksi.
def _convert_numeric_column(
    df,
    column,
):
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce",
    )

    return df


# Muuntaa annetut boolean-sarakkeet True/False-muotoon.
def _convert_boolean_columns(
    df,
    columns,
):
    for column in columns:
        df[column] = df[column].apply(
            _parse_boolean
        )

    return df


# Muuntaa yksittäisen arvon boolean-arvoksi.
def _parse_boolean(value):
    if pd.isna(value):
        return None

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        if value == 1:
            return True

        if value == 0:
            return False

    normalized = str(value).strip().lower()

    if normalized in BOOLEAN_TRUE_VALUES:
        return True

    if normalized in BOOLEAN_FALSE_VALUES:
        return False

    return None


# Siistii tekstikenttien tyhjät arvot ja ylimääräiset välilyönnit.
def _clean_text_columns(
    df,
    columns,
):
    for column in columns:
        df[column] = df[column].apply(
            _clean_text_value
        )

    return df


# Siistii yksittäisen tekstiarvon.
def _clean_text_value(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value:
        return None

    return value


# Poistaa ajanvarausrivit, joita ei voida kohdistaa toimipisteeseen.
def _remove_empty_appointment_rows(df):
    return df[
        df["location"].notna()
    ].copy()


# Poistaa vuoronumerorivit, joilta puuttuu toimipiste tai tapahtuman tunniste.
def _remove_empty_queue_rows(df):
    return df[
        df["location"].notna()
        & df["event_id"].notna()
    ].copy()


# Poistaa saman vuoronumerotapahtuman mahdolliset duplikaatit.
def _remove_queue_duplicates(df):
    return df.drop_duplicates(
        subset=["event_id"],
        keep="last",
    )