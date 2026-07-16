from pathlib import Path

from django.core.management.base import (
    BaseCommand,
    CommandError,
)
from django.db import transaction

from api.models import PredictionModel
from api.services.repositories import SampleDataRepository
from api.services.training import PredictionTrainer


class Command(BaseCommand):
    """
    Django management command ennustemallien kouluttamiseen.

    Komentoa voidaan käyttää kolmella tavalla:

    python manage.py train_prediction_models --location Lab1
    python manage.py train_prediction_models --all-locations
    python manage.py train_prediction_models --combined

    Jos mitään valintaa ei anneta, koulutetaan oletuksena
    kaikkien toimipisteiden yhteinen malli.
    """

    help = (
        "Kouluttaa potilasvirran ennustemallit "
        "SampleData-taulun datasta."
    )

    def add_arguments(self, parser):
        """
        Määrittelee komentorivillä käytettävät argumentit.

        Vaihtoehdot ovat toisensa poissulkevia, joten käyttäjä voi
        antaa vain yhden koulutustavan kerrallaan.
        """
        group = parser.add_mutually_exclusive_group()

        group.add_argument(
            "--location",
            type=str,
            help=(
                "Kouluta vain yhden toimipisteen malli, "
                "esimerkiksi --location Lab1."
            ),
        )

        group.add_argument(
            "--all-locations",
            action="store_true",
            help=(
                "Kouluta erillinen malli jokaiselle "
                "toimipisteelle."
            ),
        )

        group.add_argument(
            "--combined",
            action="store_true",
            help=(
                "Kouluta kaikkien toimipisteiden "
                "yhteinen malli."
            ),
        )

    def handle(self, *args, **options):
        """
        Komennon päälogiikka.

        Valitsee annetun argumentin perusteella, koulutetaanko:
        - yksi toimipiste
        - kaikki toimipisteet erikseen
        - kaikkien toimipisteiden yhteinen malli
        """
        trainer = PredictionTrainer()
        repository = SampleDataRepository()

        location = options.get("location")
        all_locations = options.get("all_locations")
        combined = options.get("combined")

        # Koulutetaan vain yksi käyttäjän antama toimipiste.
        if location:
            self._train_one(
                trainer=trainer,
                location=location.strip(),
            )
            return

        # Koulutetaan erillinen malli jokaiselle tietokannasta
        # löytyvälle toimipisteelle.
        if all_locations:
            locations = repository.get_locations()

            if not locations:
                raise CommandError(
                    "Tietokannasta ei löytynyt toimipisteitä."
                )

            successful = 0
            failed = 0

            for current_location in locations:
                try:
                    self._train_one(
                        trainer=trainer,
                        location=current_location,
                    )
                    successful += 1
                except Exception as exc:
                    # Yhden toimipisteen virhe ei keskeytä kaikkien
                    # muiden mallien kouluttamista.
                    failed += 1

                    self.stdout.write(
                        self.style.WARNING(
                            f"{current_location}: {exc}"
                        )
                    )

            self.stdout.write("")

            self.stdout.write(
                self.style.SUCCESS(
                    f"Valmiit mallit: {successful}"
                )
            )

            if failed:
                self.stdout.write(
                    self.style.WARNING(
                        f"Epäonnistuneet mallit: {failed}"
                    )
                )

            return

        # Koulutetaan yhdistetty malli joko --combined-valinnalla
        # tai oletuksena silloin, kun mitään argumenttia ei annettu.
        if combined or not any(
            [
                location,
                all_locations,
            ]
        ):
            self._train_one(
                trainer=trainer,
                location=None,
            )

    def _train_one(
        self,
        trainer,
        location,
    ):
        """
        Kouluttaa yhden mallin ja tallentaa sen metatiedot.

        location=None tarkoittaa kaikkien toimipisteiden
        yhteistä mallia.
        """
        display_name = (
            location or "Kaikki näytteenotot"
        )

        self.stdout.write(
            f"Koulutetaan malli: {display_name}"
        )

        try:
            result = trainer.train(
                location=location
            )
        except ValueError as exc:
            raise CommandError(
                f"Mallin koulutus epäonnistui: {exc}"
            ) from exc

        # Yhdenmukaistetaan trainerin palauttama sanakirja
        # ennen tietokantaan tallentamista.
        metadata = self._normalize_result(
            result=result,
            location=location,
        )

        # Tallennetaan mallin metatiedot PredictionModel-tauluun.
        self._save_metadata(
            metadata=metadata,
        )

        self.stdout.write(
            self.style.SUCCESS(
                self._format_result(metadata)
            )
        )

    def _normalize_result(
        self,
        result,
        location,
    ):
        """
        Validoi ja normalisoi PredictionTrainerin palauttaman tuloksen.

        Tämän avulla management command ei ole täysin riippuvainen
        trainerin palauttaman sanakirjan kaikista oletusarvoista.
        """
        required_fields = [
            "model_path",
            "training_start",
            "training_end",
        ]

        missing = [
            field
            for field in required_fields
            if not result.get(field)
        ]

        if missing:
            raise CommandError(
                "PredictionTrainer ei palauttanut "
                f"kenttiä: {', '.join(missing)}"
            )

        return {
            "location": location,
            "model_file": str(
                Path(result["model_path"])
            ),
            "model_type": result.get(
                "model_type",
                "RandomForestRegressor",
            ),
            "feature_version": result.get(
                "feature_version",
                1,
            ),
            "training_start": result[
                "training_start"
            ],
            "training_end": result[
                "training_end"
            ],
            "training_rows": result.get(
                "training_rows",
                0,
            ),
            "testing_rows": result.get(
                "testing_rows",
                0,
            ),
            "r2": result.get("r2"),
            "mae": result.get("mae"),
            "mse": result.get("mse"),
        }

    @transaction.atomic
    def _save_metadata(
        self,
        metadata,
    ):
        """
        Tallentaa koulutetun mallin metatiedot tietokantaan.

        Tallennus tehdään transaktion sisällä, jotta vanhan mallin
        deaktivointi ja uuden mallin luonti onnistuvat yhtenä kokonaisuutena.
        """
        location = metadata["location"]

        # Poistetaan saman toimipisteen vanha aktiivinen malli
        # aktiivisesta käytöstä, mutta säilytetään se historiassa.
        PredictionModel.objects.filter(
            location=location,
            is_active=True,
        ).update(
            is_active=False
        )

        # Luodaan uuden koulutetun mallin metatietorivi.
        PredictionModel.objects.create(
            location=location,
            model_file=metadata["model_file"],
            model_type=metadata["model_type"],
            feature_version=metadata[
                "feature_version"
            ],
            training_start=metadata[
                "training_start"
            ],
            training_end=metadata[
                "training_end"
            ],
            training_rows=metadata[
                "training_rows"
            ],
            testing_rows=metadata[
                "testing_rows"
            ],
            r2=metadata["r2"],
            mae=metadata["mae"],
            mse=metadata["mse"],
            is_active=True,
        )

    def _format_result(
        self,
        metadata,
    ):
        """
        Muodostaa komentoriville tulostettavan yhteenvedon
        koulutetusta mallista.
        """
        location = (
            metadata["location"]
            or "Kaikki näytteenotot"
        )

        r2 = self._format_metric(
            metadata["r2"]
        )
        mae = self._format_metric(
            metadata["mae"]
        )
        mse = self._format_metric(
            metadata["mse"]
        )

        return (
            f"Malli koulutettu: {location}\n"
            f"Tiedosto: {metadata['model_file']}\n"
            f"Koulutusjakso: "
            f"{metadata['training_start']} – "
            f"{metadata['training_end']}\n"
            f"R²: {r2}, MAE: {mae}, MSE: {mse}"
        )

    @staticmethod
    def _format_metric(value):
        """
        Muotoilee mallin arviointimittarin kolmen desimaalin tarkkuudella.
        """
        if value is None:
            return "ei saatavilla"

        return f"{value:.3f}"