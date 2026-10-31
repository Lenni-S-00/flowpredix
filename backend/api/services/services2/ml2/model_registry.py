# Hallinnoi organisaatio 2:n koulutettujen ennustemallien tallennusta,
# lataamista ja organisaatiokohtaista mallivälimuistia.

from pathlib import Path
from threading import Lock

import joblib

from django.conf import settings


class ModelRegistry:
    """Hallinnoi organisaation koulutettujen ennustemallien tiedostoja."""

    _model_cache = {}
    _cache_lock = Lock()

    def __init__(self, organization):
        self.organization = organization
        self.model_dir = self._create_model_directory()

    # Luo organisaatiolle oman mallihakemiston.
    def _create_model_directory(self):
        model_dir = (
            Path(settings.BASE_DIR)
            / "models"
            / "predictions"
            / f"organization_{self.organization.id}"
        )

        model_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        return model_dir

    # Palauttaa mallin tiedostonimen.
    def get_model_name(
        self,
        location=None,
    ):
        if not location:
            return "all_units.joblib"

        safe_name = self._sanitize_location_name(
            location
        )

        return f"{safe_name}.joblib"

    # Muuntaa toimipisteen nimen turvalliseksi tiedostonimeksi.
    def _sanitize_location_name(
        self,
        location,
    ):
        safe_name = "".join(
            character
            if character.isalnum()
            or character in ("-", "_")
            else "_"
            for character in str(location)
        )

        return (
            safe_name.strip("_")
            or "location"
        )

    # Palauttaa mallin tiedostopolun.
    def get_path(
        self,
        location=None,
    ):
        model_name = self.get_model_name(
            location
        )

        return (
            self.model_dir
            / model_name
        )

    # Tallentaa koulutetun mallin tiedostoon.
    def save(
        self,
        model,
        location=None,
    ):
        path = self.get_path(
            location
        )

        joblib.dump(
            model,
            path,
        )

        self._remove_cached_versions(
            path
        )

        return path

    # Lataa mallin cachesta tai tiedostosta.
    def load(
        self,
        location=None,
    ):
        path = self.get_path(
            location
        )

        self._validate_model_path(
            path
        )

        cache_key = self._create_cache_key(
            path
        )

        with self._cache_lock:
            cached_model = self._model_cache.get(
                cache_key
            )

            if cached_model is not None:
                return cached_model

            self._remove_cached_versions(
                path,
                use_lock=False,
            )

            model = joblib.load(
                path
            )

            self._model_cache[
                cache_key
            ] = model

            return model

    # Muodostaa malliversion huomioivan cache-avaimen.
    def _create_cache_key(
        self,
        path,
    ):
        return (
            self.organization.id,
            str(path.resolve()),
            path.stat().st_mtime_ns,
        )

    # Poistaa saman mallin vanhat versiot cachesta.
    def _remove_cached_versions(
        self,
        path,
        use_lock=True,
    ):
        if use_lock:
            with self._cache_lock:
                self._remove_cached_versions(
                    path,
                    use_lock=False,
                )

            return

        resolved_path = str(
            path.resolve()
        )

        cache_keys = [
            cache_key
            for cache_key in self._model_cache
            if (
                cache_key[0]
                == self.organization.id
                and cache_key[1]
                == resolved_path
            )
        ]

        for cache_key in cache_keys:
            self._model_cache.pop(
                cache_key,
                None,
            )

    # Poistaa organisaation kaikki mallit cachesta.
    def clear_organization_cache(self):
        organization_id = (
            self.organization.id
        )

        with self._cache_lock:
            cache_keys = [
                cache_key
                for cache_key in self._model_cache
                if cache_key[0]
                == organization_id
            ]

            for cache_key in cache_keys:
                self._model_cache.pop(
                    cache_key,
                    None,
                )

    # Tarkistaa mallin tiedostopolun.
    def _validate_model_path(
        self,
        path,
    ):
        if not path.exists():
            raise FileNotFoundError(
                f"Ennustemallia ei löytynyt: {path}"
            )

    # Tarkistaa, löytyykö organisaatiolle koulutettu malli.
    def exists(
        self,
        location=None,
    ):
        return self.get_path(
            location
        ).exists()

    # Poistaa mallin tiedostosta ja cachesta.
    def delete(
        self,
        location=None,
    ):
        path = self.get_path(
            location
        )

        if path.exists():
            path.unlink()

        self._remove_cached_versions(
            path
        )