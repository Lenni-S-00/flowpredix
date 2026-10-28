# Viimeistelee käsitellyn datan tallennusta varten ja muuntaa sen tietueiksi.

import numpy as np


REQUIRED_COLUMNS = [
    "location",
    "timestamp",
    "samples_taken",
    "employees_used",
]


def finalize_dataframe(df):
    # Tarkistetaan vaaditut sarakkeet.
    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing:
        return None, missing

    df = df[REQUIRED_COLUMNS].copy()

    # Korvataan JSON-yhteensopimattomat arvot.
    df = df.replace(
        [np.nan, np.inf, -np.inf],
        None,
    )

    return df, missing


def create_records(df):
    return df.to_dict(orient="records")