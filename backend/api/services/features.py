# api/services/features.py
# Vastaa ennustemallin feature engineeringistä.

import pandas as pd


# Ennustettava muuttuja.
#
# Sekä PredictionTrainer että PredictionService käyttävät samaa
# sarakenimeä, jolloin se määritellään vain yhdessä paikassa.
TARGET_COLUMN = "patient_count"


def create_daily_features(df):
    """
    Muodostaa päiväkohtaisesta aikasarjasta koneoppimismallin
    tarvitsemat featuret.

    Luotavat featuret:
    - year
    - month
    - day_of_week
    - day_of_year
    - lag_1 ... lag_7

    Lopuksi poistetaan rivit, joilta lag-featureita ei vielä voida
    muodostaa.
    """

    # Tehdään kopio DataFramesta, jotta alkuperäistä dataa
    # ei muokata vahingossa.
    df = df.copy()

    # Varmistetaan, että DataFramen indeksi on datetime-muodossa.
    # Päivämääräominaisuudet voidaan muodostaa vain DatetimeIndexistä.
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    # Kalenteriin perustuvat featuret.
    df["year"] = df.index.year
    df["month"] = df.index.month
    df["day_of_week"] = df.index.dayofweek
    df["day_of_year"] = df.index.dayofyear

    # Muodostetaan seitsemän edellisen päivän arvot.
    #
    # Esimerkiksi:
    # lag_1 = eilisen näytemäärä
    # lag_2 = toissapäivän näytemäärä
    # ...
    # lag_7 = viikon takainen näytemäärä
    for lag in range(1, 8):
        df[f"lag_{lag}"] = df[TARGET_COLUMN].shift(lag)

    # Ensimmäisiltä seitsemältä riviltä puuttuu osa lag-arvoista,
    # joten ne poistetaan ennen mallin koulutusta.
    return df.dropna()