# api/services/training.py
# Vastaa ennustemallien kouluttamisesta ja arvioinnista.

import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from api.services.features import (
    TARGET_COLUMN,
    create_daily_features,
)
from api.services.model_registry import ModelRegistry
from api.services.repositories import SampleDataRepository


class PredictionTrainer:
    """
    Vastaa ennustemallin kouluttamisesta.

    Trainer hakee datan Repositoryn kautta, muodostaa featuret,
    kouluttaa mallin ja tallentaa sen ModelRegistryyn.

    Varsinainen mallin koulutus tapahtuu management commandin kautta,
    eikä REST API -kutsujen yhteydessä.
    """

    def __init__(self):
        self.repository = SampleDataRepository()
        self.registry = ModelRegistry()

    def train(self, location=None):
        """
        Kouluttaa yhden RandomForestRegressor-mallin.

        location=None tarkoittaa kaikkien toimipisteiden yhteistä mallia.
        Muussa tapauksessa koulutetaan toimipistekohtainen malli.
        """

        # Haetaan historiadata tietokannasta Repositoryn kautta.
        rows = self.repository.get_daily_data(location)

        # Muodostetaan yhtenäinen päiväkohtainen DataFrame.
        daily_df = self._prepare_dataframe(
            rows=rows,
            location=location,
        )

        # Liian pienellä aineistolla mallia ei kannata kouluttaa.
        if len(daily_df) < 30:
            raise ValueError(
                "Mallin kouluttamiseen tarvitaan "
                "vähintään 30 päivän data."
            )

        # Muodostetaan koneoppimismallin käyttämät featuret.
        feature_df = create_daily_features(daily_df)

        # Erotetaan selittävät muuttujat (X)
        # ja ennustettava muuttuja (y).
        x = feature_df.drop(
            columns=[TARGET_COLUMN]
        )
        y = feature_df[TARGET_COLUMN]

        # Jaetaan data aikajärjestyksessä:
        # 80 % koulutukseen, 20 % testaukseen.
        #
        # Aikasarjassa dataa ei sekoiteta satunnaisesti.
        split_point = int(len(feature_df) * 0.8)

        x_train = x.iloc[:split_point]
        x_test = x.iloc[split_point:]

        y_train = y.iloc[:split_point]
        y_test = y.iloc[split_point:]

        # Luodaan Random Forest -malli.
        model = RandomForestRegressor(
            n_estimators=200,
            random_state=42,
            min_samples_leaf=2,
            n_jobs=-1,
        )

        # Mallin koulutus.
        model.fit(x_train, y_train)

        # Ennuste testidatalle mallin arviointia varten.
        predictions = model.predict(x_test)

        # Tallennetaan koulutettu malli .joblib-tiedostona.
        path = self.registry.save(
            model=model,
            location=location,
        )

        # Palautetaan mallin metatiedot.
        #
        # Näitä käytetään PredictionModel-taulun täyttämiseen
        # management commandissa.
        return {
            "location": location,
            "model_path": str(path),
            "model_type": "RandomForestRegressor",
            "feature_version": 1,
            "training_start": daily_df.index.min().date(),
            "training_end": daily_df.index.max().date(),
            "r2": float(
                r2_score(
                    y_test,
                    predictions,
                )
            ),
            "mae": float(
                mean_absolute_error(
                    y_test,
                    predictions,
                )
            ),
            "mse": float(
                mean_squared_error(
                    y_test,
                    predictions,
                )
            ),
            "training_rows": len(x_train),
            "testing_rows": len(x_test),
        }

    def _prepare_dataframe(self, rows, location=None):
        """
        Muodostaa historiadatasta päiväkohtaisen DataFramen.

        Vaiheet:
        1. Muunnetaan tietokantarivit DataFrameksi.
        2. Ryhmitellään näytteet päivätasolle.
        3. Lisätään puuttuvat kalenteripäivät nolla-arvoilla.

        Lopputuloksena saadaan yhtenäinen aikasarja, jota voidaan
        käyttää feature engineeringissä.
        """

        if not rows:
            raise ValueError(
                "Koulutusdataa ei löytynyt."
            )

        df = pd.DataFrame(rows)

        # Muunnetaan päivämääräsarake datetime-muotoon.
        df["date"] = pd.to_datetime(df["date"])

        # Summataan saman päivän näytemäärät yhteen.
        #
        # Repository palauttaa jo oikean toimipisteen datan,
        # joten location-haaraa ei tällä hetkellä tarvita.
        daily = (
            df.groupby("date")["samples_taken"]
            .sum()
            .to_frame(TARGET_COLUMN)
        )

        # Luodaan täydellinen päivämääräindeksi ensimmäisestä
        # viimeiseen päivään.
        full_index = pd.date_range(
            daily.index.min(),
            daily.index.max(),
            freq="D",
        )

        # Lisätään mahdolliset puuttuvat päivät.
        #
        # Päivät, joilta ei ole näytteitä, täytetään arvolla 0,
        # jotta aikasarja on jatkuva.
        daily = daily.reindex(
            full_index,
            fill_value=0,
        )

        return daily