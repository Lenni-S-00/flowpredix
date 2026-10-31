# Yhdistää organisaatio 2:n tietokantadatan, mallin koulutuksen
# ja koulutetun mallin tallennuksen yhdeksi palveluksi.

import pandas as pd

from api.services.services2.data2.repositories import (
    AppointmentDataRepository,
    QueueDataRepository,
)
from api.services.services2.ml2.model_registry import (
    ModelRegistry,
)
from api.services.services2.ml2.training import (
    PredictionTrainer,
)


class TrainingService:
    """Kouluttaa ja tallentaa organisaatio 2:n ennustemalleja."""

    def __init__(self, organization):
        self.organization = organization

        self.appointment_repository = (
            AppointmentDataRepository(
                organization=organization
            )
        )

        self.queue_repository = (
            QueueDataRepository(
                organization=organization
            )
        )

        self.trainer = PredictionTrainer(
            organization=organization
        )

        self.registry = ModelRegistry(
            organization=organization
        )

    # Kouluttaa yhden toimipisteen tai kaikkien toimipisteiden mallin.
    def train(
        self,
        location=None,
    ):
        appointment_data = (
            self._load_appointment_data(
                location=location
            )
        )

        queue_data = (
            self._load_queue_data(
                location=location
            )
        )

        result = self.trainer.train(
            appointment_data=appointment_data,
            queue_data=queue_data,
        )

        model_path = self.registry.save(
            model=result["model"],
            location=location,
        )

        return {
            **result,
            "location": location,
            "model_path": model_path,
        }

    # Hakee ajanvarausdatan tietokannasta DataFrameksi.
    def _load_appointment_data(
        self,
        location=None,
    ):
        if location:
            queryset = (
                self.appointment_repository
                .get_by_location(location)
            )
        else:
            queryset = (
                self.appointment_repository
                .get_queryset()
            )

        return self._queryset_to_dataframe(
            queryset
        )

    # Hakee vuoronumerodatan tietokannasta DataFrameksi.
    def _load_queue_data(
        self,
        location=None,
    ):
        if location:
            queryset = (
                self.queue_repository
                .get_by_location(location)
            )
        else:
            queryset = (
                self.queue_repository
                .get_queryset()
            )

        return self._queryset_to_dataframe(
            queryset
        )

    # Muuntaa Django QuerySetin pandas DataFrameksi.
    def _queryset_to_dataframe(
        self,
        queryset,
    ):
        return pd.DataFrame.from_records(
            queryset.values()
        )