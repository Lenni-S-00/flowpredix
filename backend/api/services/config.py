
# Sarakkeiden mappaus
DEFAULT_CONFIG = {
    "place_col": "näytteenottopaikka",
    "year_col": "näytteenottovuosi",
    "month_col": "näytteenottokk",
    "day_col": "näytteenottopv",
    "hour_col": "näytteenottotunti",
}

# Lopulliset sarakkeet
FINAL_COLUMN_MAPPING = {
        "paikka": "location",
        "näytteenottopaikka": "location",
        "näytteenottoja": "samples_taken",
        "näytteenottajia": "employees_used",
    }

# Needed in preprocessing
# Map months to numbers
month_to_num = {
    "tammikuu": 1,
    "Tammikuu": 1,
    "helmikuu": 2,
    "Helmikuu": 2,
    "maaliskuu": 3,
    "Maaliskuu": 3,
    "huhtikuu": 4,
    "Huhtikuu": 4,
    "toukokuu": 5,
    "Toukokuu": 5,
    "kesäkuu": 6,
    "Kesäkuu": 6,
    "heinäkuu": 7,
    "Heinäkuu": 7,
    "elokuu": 8,
    "Elokuu": 8,
    "syyskuu": 9,
    "Syyskuu": 9,
    "lokakuu": 10,
    "Lokakuu": 10,
    "marraskuu": 11,
    "Marraskuu": 11,
    "joulukuu": 12,
    "Joulukuu": 12,
}