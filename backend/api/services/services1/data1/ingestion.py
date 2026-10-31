from .preprocessing import prepare_dataframe, build_timestamp
from ..prediction1.finalization import finalize_dataframe
from ..config import DEFAULT_CONFIG, FINAL_COLUMN_MAPPING


def process_file(df):
    """Process raw data into the final format."""

    df = normalize_column_names(df)
    df = prepare_dataframe(df, DEFAULT_CONFIG)
    df = build_timestamp(df, DEFAULT_CONFIG)
    df = apply_mapping(df, FINAL_COLUMN_MAPPING)
    df, missing = finalize_dataframe(df)

    return df, missing


def normalize_column_names(df):
    """Normalize column names."""

    df.columns = df.columns.str.strip().str.lower()

    return df


def apply_mapping(df, column_mapping):
    """Rename columns using the configured mapping."""

    return df.rename(columns=column_mapping)