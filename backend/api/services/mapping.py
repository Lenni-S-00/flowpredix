def apply_mapping(df, column_mapping):
    
    df.rename(columns=column_mapping, inplace=True)

    return df