# api/services/prediction.py
# Vastaa tallennetun ennustemallin käyttämisestä ja tulevien päivien
# ennusteiden muodostamisesta.

import holidays
import pandas as pd

from api.services.features import TARGET_COLUMN
from api.services.model_registry import ModelRegistry
from api.services.repositories import SampleDataRepository


class PredictionService:
    """
    Palveluluokka ennusteiden muodostamiseen.

    Luokka:
    - lataa valmiiksi koulutetun mallin ModelRegistryn kautta
    - hakee historiadatan Repositoryn kautta
    - muodostaa mallin tarvitsemat featuret
    - ennustaa tulevat päivät yksi kerrallaan

    Mallia ei kouluteta tässä luokassa.
    """

    def __init__(self):
        self.repository = SampleDataRepository()
        self.registry = ModelRegistry()

    def predict(self, days=14, location=None):
        """
        Muodostaa ennusteen annetulle määrälle tulevia päiviä.

        Parametrit:
        - days: ennustettavien päivien määrä
        - location: yksittäinen toimipiste tai None

        location=None tarkoittaa kaikkien toimipisteiden yhteistä mallia.
        """

        # Ladataan valmiiksi koulutettu sklearn-malli.
        model = self.registry.load(location)

        # Haetaan historiadata tietokannasta Repositoryn kautta.
        rows = self.repository.get_daily_data(location)

        # Muutetaan tietokantarivit yhtenäiseksi päiväkohtaiseksi aikasarjaksi.
        history_df = self._prepare_history(rows)

        # Malli käyttää seitsemän edellisen päivän lag-featureita,
        # joten historiaa täytyy olla vähintään seitsemän päivää.
        if len(history_df) < 7:
            raise ValueError(
                "Ennustamiseen tarvitaan vähintään "
                "seitsemän päivän historia."
            )

        # Ennuste alkaa nykyisestä päivästä.
        # normalize() poistaa kellonajan ja asettaa sen päivän alkuun.
        start_date = pd.Timestamp.today().normalize()

        # Luodaan ennustettavien päivien päivämäärät.
        future_dates = pd.date_range(
            start=start_date,
            periods=days,
            freq="D",
        )

        # Otetaan historiasta viimeiset seitsemän toteutunutta arvoa.
        # Näitä käytetään ensimmäisen ennustepäivän lag-featureina.
        history = list(
            history_df[TARGET_COLUMN]
            .iloc[-7:]
            .values
        )

        # Tänne kerätään API:lle palautettavat ennusterivit.
        predictions = []

        # Sarakkeiden järjestyksen täytyy vastata mallin koulutuksessa
        # käytettyä feature-järjestystä.
        feature_columns = [
            "year",
            "month",
            "day_of_week",
            "day_of_year",
            "lag_1",
            "lag_2",
            "lag_3",
            "lag_4",
            "lag_5",
            "lag_6",
            "lag_7",
        ]

        # Haetaan Suomen pyhäpäivät ennustejakson vuosille.
        finnish_holidays = holidays.FI(
            years=range(
                future_dates.min().year,
                future_dates.max().year + 1,
            )
        )

        # Ennustetaan jokainen tuleva päivä erikseen.
        for current_date in future_dates:
            # history-listan viimeisin arvo on lag_1,
            # toiseksi viimeisin lag_2 ja niin edelleen.
            lags = history[-7:][::-1]

            # Muodostetaan päivämäärään perustuvat featuret.
            row = {
                "year": current_date.year,
                "month": current_date.month,
                "day_of_week": current_date.dayofweek,
                "day_of_year": current_date.dayofyear,
            }

            # Lisätään seitsemän edellisen päivän arvot featureihin.
            for index, value in enumerate(
                lags,
                start=1,
            ):
                row[f"lag_{index}"] = value

            # Muutetaan yhden päivän featuret DataFrameksi,
            # koska sklearn-malli odottaa taulukkomuotoista syötettä.
            prediction_input = pd.DataFrame(
                [row],
                columns=feature_columns,
            )

            # Muodostetaan ennuste yhdelle päivälle.
            value = model.predict(
                prediction_input
            )[0]

            # Pyöristetään ennuste kokonaisluvuksi ja estetään
            # negatiivisten määrien palautuminen.
            value = max(0, int(round(value)))

            # Tarkistetaan, osuuko päivä suomalaiselle pyhäpäivälle.
            is_holiday = (
                current_date.date()
                in finnish_holidays
            )

            # Liiketoimintasääntö:
            # pyhäpäivien ennuste asetetaan nollaksi.
            if is_holiday:
                value = 0

            # Lisätään valmis ennusterivi vastauslistaan.
            predictions.append(
                {
                    "date": (
                        current_date
                        .date()
                        .isoformat()
                    ),
                    "location": (
                        location
                        or "Kaikki näytteenotot"
                    ),
                    "predicted_patient_count": value,
                    "holiday": is_holiday,
                }
            )

            # Lisätään tämän päivän ennuste historiaan.
            #
            # Seuraavan päivän lag-featuret käyttävät siis aiempien
            # ennustepäivien tuloksia toteutuneen datan jatkona.
            history.append(value)

        return predictions

    def _prepare_history(self, rows):
        """
        Muuttaa Repositoryn palauttamat rivit päiväkohtaiseksi aikasarjaksi.

        Vaiheet:
        1. muunnetaan rivit DataFrameksi
        2. summataan näytemäärät päivätasolle
        3. lisätään puuttuvat kalenteripäivät nolla-arvoilla
        """

        if not rows:
            raise ValueError(
                "Historiadataa ei löytynyt."
            )

        df = pd.DataFrame(rows)

        # Varmistetaan, että päivämääräsarake on datetime-muodossa.
        df["date"] = pd.to_datetime(df["date"])

        # Summataan saman päivän näytemäärät yhteen.
        #
        # Yhdistetyssä ennusteessa tässä summataan kaikki toimipisteet
        # päivätasolle. Toimipistekohtaisessa ennusteessa Repository on
        # jo rajannut datan valittuun toimipisteeseen.
        daily = (
            df.groupby("date")["samples_taken"]
            .sum()
            .to_frame(TARGET_COLUMN)
        )

        # Luodaan täydellinen päiväindeksi ensimmäisestä
        # historiapäivästä viimeiseen.
        full_index = pd.date_range(
            daily.index.min(),
            daily.index.max(),
            freq="D",
        )

        # Lisätään puuttuvat päivät nolla-arvoilla,
        # jotta aikasarja on jatkuva.
        return daily.reindex(
            full_index,
            fill_value=0,
        )