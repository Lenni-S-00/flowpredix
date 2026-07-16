# api/services/model_registry.py
# Vastaa ennustemallien tiedostonimistä, tallennuksesta ja latauksesta.

from pathlib import Path

import joblib
from django.conf import settings


class ModelRegistry:
    """
    Hallitsee sklearn-mallien tallennusta ja latausta.

    Mallit tallennetaan .joblib-tiedostoina hakemistoon:

        backend/models/predictions/

    PredictionTrainer käyttää tätä mallin tallentamiseen ja
    PredictionService mallin lataamiseen.
    """

    def __init__(self):
        # Määritetään hakemisto, johon kaikki ennustemallit tallennetaan.
        self.model_dir = (
            Path(settings.BASE_DIR)
            / "models"
            / "predictions"
        )

        # Luodaan hakemisto automaattisesti, jos sitä ei vielä ole.
        self.model_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

    def get_model_name(self, location=None):
        """
        Muodostaa mallitiedoston nimen.

        location=None tarkoittaa kaikkien toimipisteiden yhteistä mallia.

        Esimerkkejä:
            None  -> all_units.joblib
            Lab1  -> Lab1.joblib
        """

        if not location:
            return "all_units.joblib"

        # Korvataan tiedostonimelle ongelmalliset merkit.
        safe_name = (
            location
            .replace("/", "_")
            .replace("\\", "_")
            .replace(":", "_")
            .replace(" ", "_")
        )

        return f"{safe_name}.joblib"

    def get_path(self, location=None):
        """
        Palauttaa mallitiedoston täydellisen polun.

        Esimerkiksi:

            backend/models/predictions/Lab1.joblib
        """
        return self.model_dir / self.get_model_name(location)

    def save(self, model, location=None):
        """
        Tallentaa koulutetun sklearn-mallin .joblib-tiedostoksi.

        Palauttaa tallennetun tiedoston polun.
        """
        path = self.get_path(location)

        joblib.dump(model, path)

        return path

    def load(self, location=None):
        """
        Lataa aiemmin tallennetun sklearn-mallin.

        Jos mallia ei löydy, nostetaan FileNotFoundError.
        PredictionService käsittelee tämän virheen ja palauttaa
        siitä sopivan API-virhevastauksen frontendille.
        """
        path = self.get_path(location)

        if not path.exists():
            raise FileNotFoundError(
                f"Ennustemallia ei löytynyt: {path}"
            )

        return joblib.load(path)

    def exists(self, location=None):
        """
        Tarkistaa, löytyykö mallitiedosto annetulle toimipisteelle.

        Palauttaa:
            True  -> malli löytyy
            False -> mallia ei ole tallennettu
        """
        return self.get_path(location).exists()