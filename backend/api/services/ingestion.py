from .preprocessing import prepare_dataframe, build_timestamp
from .finalization import finalize_dataframe
from .mapping import apply_mapping
from .config import DEFAULT_CONFIG, FINAL_COLUMN_MAPPING

def process_file(df):

    # Normalisoidaan otsikot
    df.columns = df.columns.str.strip().str.lower()

    df = prepare_dataframe(df, DEFAULT_CONFIG)

    df = build_timestamp(df, DEFAULT_CONFIG)

    df = apply_mapping(df, FINAL_COLUMN_MAPPING)

    df, missing = finalize_dataframe(df)

    return df, missing