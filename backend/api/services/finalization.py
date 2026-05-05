import numpy as np

def finalize_dataframe(df):
    # Keep only required columns
    required_columns = ["location", "timestamp", "samples_taken", "employees_used"]

    # If any column is missing, return the missing column so that the view can return a 400-response.
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        return None, missing

    df = df[required_columns]

    # Replace NaN with None (JSON-safe)
    df = df.replace([np.nan, np.inf, -np.inf], None)

    return df, missing

def create_records(df):
    
    # Convert to records (list of dicts)
    records = df.to_dict(orient="records")
    
    return records