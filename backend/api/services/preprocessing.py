from .config import month_to_num

import pandas as pd

# Data preparation
# requires: dataframe to be prepared (formatted correctly)
# returns: dataframe with columns ['Näytteenottopaikka', 'Näytteenottovuosi', 'Näytteenottokk', 'Näytteenottopv', 'Näytteenottotunti', 'Näytteenottajia', 'Näytteenottoja', 'Näytteitä/ottaja', 'month_num', 'Aloitusaika', 'Aika', 'Päivämäärä']
def prepare_dataframe(df, config):
    print("PREPARE")
    # Checking units and possible repeats

    # Process the dataframe piece by piece
    # Ei tee mitään / ei käytetä mihinkään (listaa vain noi paikat)
    # df["näytteenottopaikka"].dropna().unique()

    df, place_col, year_col, month_col, day_col, hour_col, num_cols = fillcolumns(df, config)

    # Tässä saattaa lähteä tietoa.
    df_hours = clean_commas_and_empty(df, hour_col, num_cols)

    df_hours = fix_months(df_hours, month_col)

    # Fixed month numbers added as a new column
    df_hours["month_num"] = df_hours[month_col].map(month_to_num)

    # Ei vissiin käytetä tätä riviä mihinkään. Pidetään, jos keksitään käyttöä.
    # df_hours[[month_col, "month_num"]].drop_duplicates()

    # Change time window to show only starting time "07:00-07:59" -> "07:00"
    df_hours["Aloitusaika"] = df_hours[hour_col].astype(str).str.split("-").str[0]

    # Add columns to the dataframe piece by piece

    df_hours = create_time_column(df_hours)

    df_hours = create_date_column(df_hours)

    # df_hours on käsitelty dataframe. Palautetaan siis se.
    return df_hours

# -------
# Seuraavat 5 funktiota on eritelty ylemmästä.
# -------

# Funktio, joka täyttää tyhjiin kohtiin tarvittavat tiedot.

def fillcolumns(df, config):
    # Create headers
    place_col = config["place_col"]
    year_col  = config["year_col"]
    month_col = config["month_col"]
    day_col   = config["day_col"]
    hour_col  = config["hour_col"]
    num_cols = ["näytteenottajia", "näytteenottoja", "näytteitä/ottaja"] #these headers contain numeric values
    
    # Fill in place, year, month and day to empty spaces vertically
    cols_ffill = [place_col, year_col, month_col, day_col]
    df = df.copy()
    df.loc[:, cols_ffill] = df[cols_ffill].ffill()

    return df, place_col, year_col, month_col, day_col, hour_col, num_cols

# Change excel commas into dots and handle empty cells

def clean_commas_and_empty(df, hour_col, num_cols):
    
    mask_hour = df[hour_col].notna()
    #mask_hour = df[hour_col].astype(str).str.match(r"^\d{2}:\d{2}-\d{2}:\d{2}$")
    df_hours = df[mask_hour].copy()
    for c in num_cols:
        df_hours[c] = (
            df_hours[c]
            .astype(str)
            .str.replace(",", ".", regex=False)
            .replace(["", "nan"], pd.NA)
            .astype(float)
        )

    return df_hours

def fix_months(df, month_col):

    df[month_col] = (
        df[month_col]
        .astype(str)
        .str.strip()
        .str.lower()
    )
    # Manually changing headlines of two months
    # kesäkuu
    mask_kes = df[month_col].astype(str).str.contains("kes", na=False)
    df.loc[mask_kes, month_col] = "kesäkuu"
    # heinäkuu
    mask_hein = df[month_col].astype(str).str.contains("hein", na=False)
    df.loc[mask_hein, month_col] = "heinäkuu"

    df["month_num"] = pd.to_numeric(df[month_col], errors="coerce")
    mask = df["month_num"].isna()
    df.loc[mask, "month_num"] = df.loc[mask, month_col].map(month_to_num)

    return df

# Change time format to "year-month-day hour:minute"
# Luodaan aika
def create_time_column(df):
    
    df["year"] = pd.to_numeric(df["näytteenottovuosi"], errors="coerce")
    df["month"] = pd.to_numeric(df["month_num"], errors="coerce")
    df["day"] = pd.to_numeric(df["näytteenottopv"], errors="coerce")

    # Extract hour from "07:00-07:59" → "07:00"
    df["hour_clean"] = (
        df["Aloitusaika"]
        .astype(str)
        .str.split("-")
        .str[0]
        
    )

    # Combine into datetime string
    dt_str = (
        df["year"].astype("Int64").astype(str) + "-" +
        df["month"].astype("Int64").astype(str).str.zfill(2) + "-" +
        df["day"].astype("Int64").astype(str).str.zfill(2) + " " +
        df["hour_clean"]
    )

    # Convert to datetime safely

    df["timestamp"] = pd.to_datetime(dt_str, format="%Y-%m-%d %H:%M", errors="coerce")
    print("Invalid timestamps:", df["timestamp"].isna().sum())
    # Drop invalid timestamps
    df = df.dropna(subset=["timestamp"])

    return df

# Luodaan päivämäärä
def create_date_column(df):
    dt_str_date = (
        df["näytteenottovuosi"].astype(int).astype(str) + "-" +
        df["month_num"].astype(int).astype(str).str.zfill(2) + "-" +
        df["näytteenottopv"].astype(int).astype(str).str.zfill(2)
    )

    df["Päivämäärä"] = pd.to_datetime(dt_str_date, format="%Y-%m-%d") # Voi lisätä errors="coerce" tarvittaessa.

    return df


# Erillinen kaveri timestampin rakentamiseen
def build_timestamp(df, config):
    year = config["year_col"]
    day = config["day_col"]
    hour = config["hour_col"]

    # putsataan vieläkin.
    df["hour_clean"] = (
        df["hour_clean"]
        .astype(str)
        .str.split(":")
        .str[0]
    )

    if {year, day, hour}.issubset(df.columns) and "month_num" in df.columns:
        df["timestamp"] = pd.to_datetime({
            "year": df[year],
            "month": df["month_num"],
            "day": df[day],
            "hour": df["hour_clean"],
        })
    
        df["timestamp"] = df["timestamp"].astype(str)

    return df
# Vastaa toiminnoiltaan seuraavaa.
'''
# Combine time columns if needed
        if {"näytteenottovuosi", "näytteenottokk", "näytteenottopv", "näytteenottotunti"}.issubset(df.columns):
            df["timestamp"] = pd.to_datetime({
                "year": df["näytteenottovuosi"], "month": df["näytteenottokk"], "day": df["näytteenottopv"], "hour": df["näytteenottotunti"],}
            )
'''