import pandas as pd
from ..config import month_to_num

NUMERIC_COLUMNS = [
    "näytteenottajia",
    "näytteenottoja",
    "näytteitä/ottaja",
]

def prepare_dataframe(df, config):
    """Prepare raw hourly sample data."""

    df = fill_missing_group_values(df, config)
    df = keep_hourly_rows(df, config["hour_col"])
    df = convert_numeric_columns(df)
    df = normalize_months(df, config["month_col"])
    df = add_month_number(df, config["month_col"])
    df = add_start_time(df, config["hour_col"])
    df = add_timestamp(df, config)
    df = add_date(df, config)

    return df


def fill_missing_group_values(df, config):
    """Forward-fill location and date columns."""

    columns = [
        config["place_col"],
        config["year_col"],
        config["month_col"],
        config["day_col"],
    ]

    df = df.copy()
    df.loc[:, columns] = df[columns].ffill()

    return df


def keep_hourly_rows(df, hour_col):
    """Keep rows containing hourly data."""

    return df[df[hour_col].notna()].copy()


def convert_numeric_columns(df):
    """Convert numeric Excel values to floats."""

    for column in NUMERIC_COLUMNS:
        df[column] = (
            df[column]
            .astype(str)
            .str.replace(",", ".", regex=False)
            .replace(["", "nan"], pd.NA)
            .astype(float)
        )

    return df


def normalize_months(df, month_col):
    """Normalize month values."""

    df[month_col] = (
        df[month_col]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    # Normalize Finnish month names
    june_mask = df[month_col].str.contains("kes", na=False)
    july_mask = df[month_col].str.contains("hein", na=False)

    df.loc[june_mask, month_col] = "kesäkuu"
    df.loc[july_mask, month_col] = "heinäkuu"

    return df


def add_month_number(df, month_col):
    """Add numeric month column."""

    numeric_months = pd.to_numeric(df[month_col], errors="coerce")
    named_months = df[month_col].map(month_to_num)

    df["month_num"] = numeric_months.fillna(named_months)

    return df


def add_start_time(df, hour_col):
    """Extract start time from hourly time range."""

    df["Aloitusaika"] = (
        df[hour_col]
        .astype(str)
        .str.split("-")
        .str[0]
    )

    return df


def add_timestamp(df, config):
    """Create timestamp column."""

    year_col = config["year_col"]
    day_col = config["day_col"]

    year = pd.to_numeric(df[year_col], errors="coerce")
    month = pd.to_numeric(df["month_num"], errors="coerce")
    day = pd.to_numeric(df[day_col], errors="coerce")

    datetime_string = (
        year.astype("Int64").astype(str)
        + "-"
        + month.astype("Int64").astype(str).str.zfill(2)
        + "-"
        + day.astype("Int64").astype(str).str.zfill(2)
        + " "
        + df["Aloitusaika"]
    )

    df["timestamp"] = pd.to_datetime(
        datetime_string,
        format="%Y-%m-%d %H:%M",
        errors="coerce",
    )

    print("Invalid timestamps:", df["timestamp"].isna().sum())

    return df.dropna(subset=["timestamp"])


def add_date(df, config):
    """Create date column."""

    year_col = config["year_col"]
    day_col = config["day_col"]

    date_string = (
        df[year_col].astype(int).astype(str)
        + "-"
        + df["month_num"].astype(int).astype(str).str.zfill(2)
        + "-"
        + df[day_col].astype(int).astype(str).str.zfill(2)
    )

    df["Päivämäärä"] = pd.to_datetime(
        date_string,
        format="%Y-%m-%d",
    )

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