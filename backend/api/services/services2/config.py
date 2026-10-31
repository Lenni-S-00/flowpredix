# Määrittelee organisaatio 2:n lähdedatojen sarakemäppäykset.


# Ajanvarausdatan sarakkeet -> AppointmentData-mallin kentät.
APPOINTMENT_COLUMN_MAPPING = {
    "toimipiste": "location",
    "palvelu": "service",
    "varausid": "reservation_id",
    "resurssi_id": "resource_id",
    "slotin_alkuaika": "slot_start",
    "slotin_loppuaika": "slot_end",
    "varattavissa": "available",
    "varauksen tila": "reservation_status",
    "varauksen_tila_mod": "reservation_status_modified",
    "ajanvarauksen aikaleima": "reservation_timestamp",
    "saapunut_aikaleima": "arrival_timestamp",
    "kutsu_aikaleima": "call_timestamp",
    "tyon_alla_aikaleima": "service_start_timestamp",
    "valmis_aikaleima": "completion_timestamp",
}


# Vuoronumerodatan sarakkeet -> QueueData-mallin kentät.
QUEUE_COLUMN_MAPPING = {
    "laboratorio": "location",
    "vuoronumerojono": "queue",
    "tapahtuma_id": "event_id",
    "saapumisen_aika": "arrival_timestamp",
    "viimeinen_tila": "final_status",
    "kattavuus": "coverage",
    "ensi_kutsun_aika": "first_call_timestamp",
    "aloitus_aika": "service_start_timestamp",
    "valmistumisen_aika": "completion_timestamp",
    "palvelulupaus (min)": "service_promise_minutes",
    "palvelulupaus_annettu": "service_promise_given",
    "palvelulupaus_taytetty": "service_promise_fulfilled",
}


# Ajanvarausdatan aikaleimasarakkeet.
APPOINTMENT_DATETIME_COLUMNS = [
    "slot_start",
    "slot_end",
    "reservation_timestamp",
    "arrival_timestamp",
    "call_timestamp",
    "service_start_timestamp",
    "completion_timestamp",
]


# Vuoronumerodatan aikaleimasarakkeet.
QUEUE_DATETIME_COLUMNS = [
    "arrival_timestamp",
    "first_call_timestamp",
    "service_start_timestamp",
    "completion_timestamp",
]


# Ajanvarausdatan boolean-kentät.
APPOINTMENT_BOOLEAN_COLUMNS = [
    "available",
]


# Vuoronumerodatan boolean-kentät.
QUEUE_BOOLEAN_COLUMNS = [
    "service_promise_given",
    "service_promise_fulfilled",
]