# Käsittelee organisaatio 2:n ajanvaraus- ja vuoronumerodatan
# tietokantaan tallennettavaan muotoon.

from .preprocessing import (
    preprocess_appointment_data,
    preprocess_queue_data,
)


APPOINTMENT_DATA_TYPE = "appointment"
QUEUE_DATA_TYPE = "queue"


# Käsittelee annetun lähdedatan sen tyypin mukaisesti.
def process_file(df, data_type):
    if data_type == APPOINTMENT_DATA_TYPE:
        return process_appointment_file(df)

    if data_type == QUEUE_DATA_TYPE:
        return process_queue_file(df)

    raise ValueError(
        f"Tuntematon datatyyppi: {data_type}"
    )


# Käsittelee ajanvarausdatan.
def process_appointment_file(df):
    processed_df = preprocess_appointment_data(df)

    return processed_df


# Käsittelee vuoronumerodatan.
def process_queue_file(df):
    processed_df = preprocess_queue_data(df)

    return processed_df


# Muuntaa käsitellyn datan tietueiksi tallennusta varten.
def create_records(df):
    return df.to_dict(
        orient="records"
    )