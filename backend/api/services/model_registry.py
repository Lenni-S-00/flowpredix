# api/services/model_registry.py

from pathlib import Path

import joblib
from django.conf import settings


class ModelRegistry:

    # Alustaa mallien tallennushakemiston.
    def __init__(self):
        self.model_dir = self._create_model_directory()

    # Luo mallien tallennushakemiston tarvittaessa.
    def _create_model_directory(self):
        model_dir = (
            Path(settings.BASE_DIR)
            / "models"
            / "predictions"
        )

        model_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        return model_dir

    # Muodostaa mallitiedoston nimen.
    def get_model_name(self, location=None):
        if not location:
            return "all_units.joblib"

        safe_name = self._sanitize_location_name(
            location
        )

        return f"{safe_name}.joblib"

    # Muuntaa toimipisteen nimen tiedostonimeen sopivaksi.
    def _sanitize_location_name(self, location):
        return (
            location
            .replace("/", "_")
            .replace("\\", "_")
            .replace(":", "_")
            .replace(" ", "_")
        )

    # Palauttaa mallitiedoston täydellisen polun.
    def get_path(self, location=None):
        model_name = self.get_model_name(location)

        return self.model_dir / model_name

    # Tallentaa koulutetun mallin tiedostoon.
    def save(self, model, location=None):
        path = self.get_path(location)

        joblib.dump(model, path)

        return path

    # Lataa aiemmin tallennetun mallin.
    def load(self, location=None):
        path = self.get_path(location)

        self._validate_model_path(path)

        return joblib.load(path)

    # Tarkistaa, että mallitiedosto löytyy.
    def _validate_model_path(self, path):
        if not path.exists():
            raise FileNotFoundError(
                f"Ennustemallia ei löytynyt: {path}"
            )

    # Tarkistaa, löytyykö mallitiedosto.
    def exists(self, location=None):
        path = self.get_path(location)

        return path.exists()
