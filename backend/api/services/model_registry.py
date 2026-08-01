# api/services/model_registry.py

from pathlib import Path
from threading import Lock

import joblib
from django.conf import settings


class ModelRegistry:

    _model_cache = {}
    _cache_lock = Lock()

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

        self._remove_from_cache(path)

        return path

    # Lataa aiemmin tallennetun mallin.
    def load(self, location=None):
        path = self.get_path(location)

        self._validate_model_path(path)

        cache_key = self._create_cache_key(path)

        with self._cache_lock:
            cached_model = self._model_cache.get(
                cache_key
            )

            if cached_model is not None:
                return cached_model

            self._remove_old_cache_versions(
                path
            )

            model = joblib.load(path)

            self._model_cache[
                cache_key
            ] = model

            return model

    # Muodostaa välimuistiavaimen tiedostopolusta ja muokkausajasta.
    def _create_cache_key(self, path):
        return (
            str(path.resolve()),
            path.stat().st_mtime_ns,
        )

    # Poistaa tietyn mallitiedoston välimuistista.
    def _remove_from_cache(self, path):
        resolved_path = str(
            path.resolve()
        )

        with self._cache_lock:
            cache_keys = [
                cache_key
                for cache_key
                in self._model_cache
                if cache_key[0] ==
                resolved_path
            ]

            for cache_key in cache_keys:
                self._model_cache.pop(
                    cache_key,
                    None,
                )

    # Poistaa saman tiedoston vanhat välimuistiversiot.
    def _remove_old_cache_versions(
        self,
        path,
    ):
        resolved_path = str(
            path.resolve()
        )

        cache_keys = [
            cache_key
            for cache_key
            in self._model_cache
            if cache_key[0] ==
            resolved_path
        ]

        for cache_key in cache_keys:
            self._model_cache.pop(
                cache_key,
                None,
            )

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