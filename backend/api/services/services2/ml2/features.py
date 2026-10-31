# Muodostaa organisaatio 2:n ajanvaraus- ja vuoronumerodatasta
# ennustamisessa ja kuormitusanalyysissä käytettävät featuret.

import pandas as pd


TARGET_COLUMN = "customer_count"


# Muodostaa päivätason featuret ennustemallia varten.
def create_daily_features(
    appointment_data,
    queue_data,
):
    appointment_daily = _create_daily_appointment_features(
        appointment_data
    )

    queue_daily = _create_daily_queue_features(
        queue_data
    )

    df = _merge_daily_data(
        appointment_daily,
        queue_daily,
    )

    df = _add_customer_count(df)
    df = _add_calendar_features(df)

    return df.sort_values(
        ["location", "date"]
    ).reset_index(drop=True)


# Muodostaa tuntitason featuret kuormitusanalyysiä varten.
def create_hourly_features(
    appointment_data,
    queue_data,
):
    appointment_hourly = _create_hourly_appointment_features(
        appointment_data
    )

    queue_hourly = _create_hourly_queue_features(
        queue_data
    )

    df = _merge_hourly_data(
        appointment_hourly,
        queue_hourly,
    )

    df = _add_customer_count(df)
    df = _add_hourly_calendar_features(df)

    return df.sort_values(
        ["location", "timestamp"]
    ).reset_index(drop=True)


# Muodostaa ajanvarausdatan päivittäiset tunnusluvut.
def _create_daily_appointment_features(df):
    if df.empty:
        return _empty_daily_appointment_dataframe()

    customer_data = _create_daily_appointment_customers(
        df
    )

    capacity_data = _create_daily_appointment_capacity(
        df
    )

    result = customer_data.merge(
        capacity_data,
        on=["location", "date"],
        how="outer",
    )

    return _fill_appointment_columns(result)


# Laskee päivittäiset toteutuneet ajanvarausasiakkaat saapumisajan perusteella.
def _create_daily_appointment_customers(df):
    customer_data = df[
        df["arrival_timestamp"].notna()
    ].copy()

    if customer_data.empty:
        return pd.DataFrame(
            columns=[
                "location",
                "date",
                "appointment_customers",
            ]
        )

    customer_data["date"] = (
        customer_data["arrival_timestamp"].dt.date
    )

    return (
        customer_data
        .groupby(
            ["location", "date"],
            as_index=False,
        )
        .size()
        .rename(
            columns={
                "size": "appointment_customers",
            }
        )
    )


# Laskee päivittäisen ajanvarauskapasiteetin slotin perusteella.
def _create_daily_appointment_capacity(df):
    capacity_data = df[
        df["slot_start"].notna()
        & df["slot_end"].notna()
    ].copy()

    if capacity_data.empty:
        return pd.DataFrame(
            columns=[
                "location",
                "date",
                "appointment_slots",
                "capacity_minutes",
            ]
        )

    capacity_data["date"] = (
        capacity_data["slot_start"].dt.date
    )

    capacity_data["slot_minutes"] = _calculate_minutes(
        capacity_data["slot_start"],
        capacity_data["slot_end"],
    )

    return (
        capacity_data
        .groupby(
            ["location", "date"],
            as_index=False,
        )
        .agg(
            appointment_slots=(
                "slot_start",
                "count",
            ),
            capacity_minutes=(
                "slot_minutes",
                "sum",
            ),
        )
    )


# Muodostaa vuoronumerodatan päivittäiset tunnusluvut.
def _create_daily_queue_features(df):
    if df.empty:
        return _empty_daily_queue_dataframe()

    df = _get_completed_queue_data(df)

    if df.empty:
        return _empty_daily_queue_dataframe()

    df["date"] = (
        df["arrival_timestamp"].dt.date
    )

    return (
        df.groupby(
            ["location", "date"],
            as_index=False,
        )
        .size()
        .rename(
            columns={
                "size": "queue_customers",
            }
        )
    )


# Muodostaa ajanvarausdatan tuntikohtaiset tunnusluvut.
def _create_hourly_appointment_features(df):
    if df.empty:
        return _empty_hourly_appointment_dataframe()

    customer_data = _create_hourly_appointment_customers(
        df
    )

    capacity_data = _create_hourly_appointment_capacity(
        df
    )

    result = customer_data.merge(
        capacity_data,
        on=["location", "timestamp"],
        how="outer",
    )

    return _fill_appointment_columns(result)


# Laskee tuntikohtaiset toteutuneet ajanvarausasiakkaat saapumisajan perusteella.
def _create_hourly_appointment_customers(df):
    customer_data = df[
        df["arrival_timestamp"].notna()
    ].copy()

    if customer_data.empty:
        return pd.DataFrame(
            columns=[
                "location",
                "timestamp",
                "appointment_customers",
            ]
        )

    customer_data["timestamp"] = (
        customer_data["arrival_timestamp"]
        .dt.floor("h")
    )

    return (
        customer_data
        .groupby(
            ["location", "timestamp"],
            as_index=False,
        )
        .size()
        .rename(
            columns={
                "size": "appointment_customers",
            }
        )
    )


# Laskee tuntikohtaisen ajanvarauskapasiteetin slotin perusteella.
def _create_hourly_appointment_capacity(df):
    capacity_data = df[
        df["slot_start"].notna()
        & df["slot_end"].notna()
    ].copy()

    if capacity_data.empty:
        return pd.DataFrame(
            columns=[
                "location",
                "timestamp",
                "appointment_slots",
                "capacity_minutes",
            ]
        )

    capacity_data["timestamp"] = (
        capacity_data["slot_start"]
        .dt.floor("h")
    )

    capacity_data["slot_minutes"] = _calculate_minutes(
        capacity_data["slot_start"],
        capacity_data["slot_end"],
    )

    return (
        capacity_data
        .groupby(
            ["location", "timestamp"],
            as_index=False,
        )
        .agg(
            appointment_slots=(
                "slot_start",
                "count",
            ),
            capacity_minutes=(
                "slot_minutes",
                "sum",
            ),
        )
    )


# Muodostaa vuoronumerodatan tuntikohtaiset tunnusluvut.
def _create_hourly_queue_features(df):
    if df.empty:
        return _empty_hourly_queue_dataframe()

    df = _get_completed_queue_data(df)

    if df.empty:
        return _empty_hourly_queue_dataframe()

    df["timestamp"] = (
        df["arrival_timestamp"]
        .dt.floor("h")
    )

    return (
        df.groupby(
            ["location", "timestamp"],
            as_index=False,
        )
        .size()
        .rename(
            columns={
                "size": "queue_customers",
            }
        )
    )


# Palauttaa palvellut vuoronumerotapahtumat, joilla on saapumisaika.
def _get_completed_queue_data(df):
    result = df[
        df["final_status"]
        .fillna("")
        .str.upper()
        .eq("COMPLETED")
    ].copy()

    return result[
        result["arrival_timestamp"].notna()
    ].copy()


# Yhdistää päivittäisen ajanvaraus- ja vuoronumerodatan.
def _merge_daily_data(
    appointment_data,
    queue_data,
):
    df = appointment_data.merge(
        queue_data,
        on=["location", "date"],
        how="outer",
    )

    return _fill_count_columns(df)


# Yhdistää tuntikohtaisen ajanvaraus- ja vuoronumerodatan.
def _merge_hourly_data(
    appointment_data,
    queue_data,
):
    df = appointment_data.merge(
        queue_data,
        on=["location", "timestamp"],
        how="outer",
    )

    return _fill_count_columns(df)


# Täyttää ajanvarausdatan puuttuvat tunnusluvut nollilla.
def _fill_appointment_columns(df):
    columns = [
        "appointment_customers",
        "appointment_slots",
        "capacity_minutes",
    ]

    for column in columns:
        if column not in df.columns:
            df[column] = 0

        df[column] = df[column].fillna(0)

    return df


# Täyttää puuttuvat asiakas- ja kapasiteettimäärät nollilla.
def _fill_count_columns(df):
    columns = [
        "appointment_customers",
        "queue_customers",
        "appointment_slots",
        "capacity_minutes",
    ]

    for column in columns:
        if column not in df.columns:
            df[column] = 0

        df[column] = df[column].fillna(0)

    return df


# Laskee toteutuneiden asiakkaiden kokonaismäärän.
def _add_customer_count(df):
    df[TARGET_COLUMN] = (
        df["appointment_customers"]
        + df["queue_customers"]
    )

    return df


# Lisää päivätason kalenterifeaturet.
def _add_calendar_features(df):
    dates = pd.to_datetime(
        df["date"]
    )

    df["year"] = dates.dt.year
    df["month"] = dates.dt.month
    df["week_of_year"] = (
        dates.dt.isocalendar().week.astype(int)
    )
    df["day_of_week"] = dates.dt.dayofweek
    df["day_of_year"] = dates.dt.dayofyear

    return df


# Lisää tuntitason kalenterifeaturet.
def _add_hourly_calendar_features(df):
    timestamps = pd.to_datetime(
        df["timestamp"]
    )

    df["year"] = timestamps.dt.year
    df["month"] = timestamps.dt.month
    df["week_of_year"] = (
        timestamps.dt.isocalendar().week.astype(int)
    )
    df["day_of_week"] = timestamps.dt.dayofweek
    df["day_of_year"] = timestamps.dt.dayofyear
    df["hour"] = timestamps.dt.hour

    return df


# Laskee kahden aikaleiman välisen ajan minuutteina.
def _calculate_minutes(
    start,
    end,
):
    minutes = (
        end - start
    ).dt.total_seconds() / 60

    return minutes.where(
        minutes >= 0
    )


# Palauttaa tyhjän päivätason ajanvarausdatan.
def _empty_daily_appointment_dataframe():
    return pd.DataFrame(
        columns=[
            "location",
            "date",
            "appointment_customers",
            "appointment_slots",
            "capacity_minutes",
        ]
    )


# Palauttaa tyhjän päivätason vuoronumerodatan.
def _empty_daily_queue_dataframe():
    return pd.DataFrame(
        columns=[
            "location",
            "date",
            "queue_customers",
        ]
    )


# Palauttaa tyhjän tuntitason ajanvarausdatan.
def _empty_hourly_appointment_dataframe():
    return pd.DataFrame(
        columns=[
            "location",
            "timestamp",
            "appointment_customers",
            "appointment_slots",
            "capacity_minutes",
        ]
    )


# Palauttaa tyhjän tuntitason vuoronumerodatan.
def _empty_hourly_queue_dataframe():
    return pd.DataFrame(
        columns=[
            "location",
            "timestamp",
            "queue_customers",
        ]
    )