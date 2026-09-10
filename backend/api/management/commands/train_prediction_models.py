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

    help = (
        "Kouluttaa potilasvirran ennustemallit "
        "SampleData-taulun datasta."
    )

    # Lisää komennon komentoriviargumentit.
    # Lisää komennon komentoriviargumentit.
    def add_arguments(self, parser):
        group = (
            parser.add_mutually_exclusive_group()
        )

        self._add_location_argument(group)
        self._add_all_locations_argument(group)
        self._add_combined_argument(group)

        # Organisaation ID ei kuulu mutually exclusive
        # -ryhmään, koska se voidaan antaa yhdessä
        # minkä tahansa koulutustavan kanssa.
        parser.add_argument(
            "--organization-id",
            type=int,
            required=False,
            help=(
                "Organisaation ID, johon "
                "koulutettu malli kuuluu."
            ),
        )

    # Lisää yhden toimipisteen koulutusargumentin.
    def _add_location_argument(self, group):
        group.add_argument(
            "--location",
            type=str,
            help=(
                "Kouluta vain yhden toimipisteen malli, "
                "esimerkiksi --location Lab1."
            ),
        )

    # Lisää kaikkien toimipisteiden koulutusargumentin.
    def _add_all_locations_argument(self, group):
        group.add_argument(
            "--all-locations",
            action="store_true",
            help=(
                "Kouluta erillinen malli jokaiselle "
                "toimipisteelle."
            ),
        )

    # Lisää yhdistetyn mallin koulutusargumentin.
    def _add_combined_argument(self, group):
        group.add_argument(
            "--combined",
            action="store_true",
            help=(
                "Kouluta kaikkien toimipisteiden "
                "yhteinen malli."
            ),
        )

    # Valitsee komentoriviargumenttien mukaisen koulutustavan.
    def handle(self, *args, **options):
        trainer = PredictionTrainer()
        repository = SampleDataRepository()

        # Luetaan komennolle annetut argumentit.
        location = options.get("location")
        all_locations = options.get(
            "all_locations"
        )
        combined = options.get("combined")

        # Organisaation ID tulee esimerkiksi
        # käyttöliittymän TrainPredictionModelsView:stä.
        organization_id = options.get(
            "organization_id"
        )

        # Tallennetaan organisaation ID command-olioon,
        # jotta sitä voidaan käyttää myöhemmin
        # PredictionModel-rivin tallennuksessa.
        self.organization_id = organization_id

        if location:
            self._train_location(
                trainer,
                location,
            )
            return

        if all_locations:
            self._train_all_locations(
                trainer,
                repository,
            )
            return

        if combined or not any(
            [
                location,
                all_locations,
            ]
        ):
            self._train_combined(trainer)

    # Kouluttaa yhden valitun toimipisteen mallin.
    def _train_location(
        self,
        trainer,
        location,
    ):
        self._train_one(
            trainer=trainer,
            location=location.strip(),
        )

    # Kouluttaa erillisen mallin jokaiselle toimipisteelle.
    def _train_all_locations(
        self,
        trainer,
        repository,
    ):
        locations = repository.get_locations()

        self._validate_locations(locations)

        successful, failed = self._train_locations(
            trainer,
            locations,
        )

        self._write_training_summary(
            successful,
            failed,
        )

    # Tarkistaa, että tietokannasta löytyi toimipisteitä.
    def _validate_locations(self, locations):
        if not locations:
            raise CommandError(
                "Tietokannasta ei löytynyt toimipisteitä."
            )

    # Kouluttaa annetut toimipisteet ja laskee tulokset.
    def _train_locations(
        self,
        trainer,
        locations,
    ):
        successful = 0
        failed = 0

        for location in locations:
            if self._try_train_location(
                trainer,
                location,
            ):
                successful += 1
            else:
                failed += 1

        return successful, failed

    # Yrittää kouluttaa yhden toimipisteen mallin.
    def _try_train_location(
        self,
        trainer,
        location,
    ):
        try:
            self._train_one(
                trainer=trainer,
                location=location,
            )
            return True
        except Exception as exc:
            self._write_training_warning(
                location,
                exc,
            )
            return False

    # Tulostaa toimipistekohtaisen koulutusvirheen.
    def _write_training_warning(
        self,
        location,
        error,
    ):
        self.stdout.write(
            self.style.WARNING(
                f"{location}: {error}"
            )
        )

    # Tulostaa kaikkien mallien koulutusyhteenvedon.
    def _write_training_summary(
        self,
        successful,
        failed,
    ):
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

    # Kouluttaa kaikkien toimipisteiden yhteisen mallin.
    def _train_combined(self, trainer):
        self._train_one(
            trainer=trainer,
            location=None,
        )

    # Kouluttaa yhden mallin ja tallentaa sen metatiedot.
    def _train_one(
        self,
        trainer,
        location,
    ):
        self._write_training_start(location)

        result = self._run_training(
            trainer,
            location,
        )
        metadata = self._normalize_result(
            result=result,
            location=location,
        )

        self._save_metadata(metadata)
        self._write_training_result(metadata)
        self._write_feature_importance(result)

    # Tulostaa koulutettavan mallin nimen.
    def _write_training_start(self, location):
        display_name = (
            location or "Kaikki näytteenotot"
        )

        self.stdout.write(
            f"Koulutetaan malli: {display_name}"
        )

    # Suorittaa mallin koulutuksen.
    def _run_training(
        self,
        trainer,
        location,
    ):
        try:
            return trainer.train(
                location=location
            )
        except ValueError as exc:
            raise CommandError(
                f"Mallin koulutus epäonnistui: {exc}"
            ) from exc

    # Tulostaa koulutetun mallin yhteenvedon.
    def _write_training_result(self, metadata):
        self.stdout.write(
            self.style.SUCCESS(
                self._format_result(metadata)
            )
        )

    # Tulostaa mallin featureiden suhteelliset tärkeydet.
    def _write_feature_importance(self, result):
        feature_importance = result.get(
            "feature_importance",
            {},
        )

        grouped_importance = result.get(
            "feature_importance_groups",
            {},
        )

        if not feature_importance:
            self.stdout.write(
                self.style.WARNING(
                    "Feature importance -arvoja "
                    "ei löytynyt."
                )
            )
            return

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "Feature importance:"
            )
        )

        sorted_features = sorted(
            feature_importance.items(),
            key=lambda item: item[1],
            reverse=True,
        )

        for feature, importance in sorted_features:
            percentage = importance * 100

            self.stdout.write(
                f"  {feature}: "
                f"{percentage:.2f} %"
            )

        if grouped_importance:
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    "Feature-ryhmien tärkeys:"
                )
            )

            history_percentage = (
                grouped_importance.get(
                    "history",
                    0,
                )
                * 100
            )

            calendar_percentage = (
                grouped_importance.get(
                    "calendar",
                    0,
                )
                * 100
            )

            weather_percentage = (
                grouped_importance.get(
                    "weather",
                    0,
                )
                * 100
            )

            self.stdout.write(
                "  Mennyt kävijädata: "
                f"{history_percentage:.2f} %"
            )

            self.stdout.write(
                "  Kalenteritiedot: "
                f"{calendar_percentage:.2f} %"
            )

            self.stdout.write(
                "  Säätiedot: "
                f"{weather_percentage:.2f} %"
            )

    # Validoi ja normalisoi koulutuksen tuloksen.
    def _normalize_result(
        self,
        result,
        location,
    ):
        self._validate_result(result)

        return {
            "location": location,
            "model_file": self._get_model_file(result),
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

    # Tarkistaa koulutustuloksen pakolliset kentät.
    def _validate_result(self, result):
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

    # Muuntaa mallitiedoston polun merkkijonoksi.
    def _get_model_file(self, result):
        return str(
            Path(result["model_path"])
        )

    # Tallentaa uuden mallin metatiedot transaktiossa.
    @transaction.atomic
    def _save_metadata(self, metadata):
        self._deactivate_previous_model(
            metadata["location"]
        )
        self._create_prediction_model(metadata)

    # Poistaa saman organisaation vanhan mallin
    # aktiivisesta käytöstä.
    def _deactivate_previous_model(
        self,
        location,
    ):
        PredictionModel.objects.filter(

            # Rajataan vain tähän organisaatioon.
            organization_id=(
                self.organization_id
            ),

            # Rajataan samaan toimipisteeseen.
            location=location,

            # Vain aktiivinen malli poistetaan käytöstä.
            is_active=True,
        ).update(
            is_active=False
        )

    # Luo uuden mallin metatietorivin.
    def _create_prediction_model(
        self,
        metadata,
    ):
        PredictionModel.objects.create(

            # Liitetään malli organisaatioon.
            #
            # organization_id voidaan antaa suoraan
            # ilman että Organization-oliota tarvitsee
            # hakea erikseen tietokannasta.
            organization_id=(
                self.organization_id
            ),

            # Toimipiste.
            # Yhdistetyllä mallilla arvo voi olla None.
            location=metadata["location"],

            # Tallennetun mallin tiedosto.
            model_file=metadata[
                "model_file"
            ],

            # Käytetty mallityyppi.
            model_type=metadata[
                "model_type"
            ],

            # Feature-rakenteen versio.
            feature_version=metadata[
                "feature_version"
            ],

            # Koulutukseen käytetyn datan aikaväli.
            training_start=metadata[
                "training_start"
            ],
            training_end=metadata[
                "training_end"
            ],

            # Koulutus- ja testidatan rivimäärät.
            training_rows=metadata[
                "training_rows"
            ],
            testing_rows=metadata[
                "testing_rows"
            ],

            # Mallin testidatalla lasketut
            # tarkkuusmittarit.
            r2=metadata["r2"],
            mae=metadata["mae"],
            mse=metadata["mse"],

            # Uusi malli otetaan aktiiviseksi.
            is_active=True,
        )
        
    # Muodostaa koulutustuloksen komentoriviyhteenvedon.
    def _format_result(self, metadata):
        location = self._get_display_name(
            metadata["location"]
        )
        metrics = self._format_metrics(metadata)

        return (
            f"Malli koulutettu: {location}\n"
            f"Tiedosto: {metadata['model_file']}\n"
            f"Koulutusjakso: "
            f"{metadata['training_start']} – "
            f"{metadata['training_end']}\n"
            f"R²: {metrics['r2']}, "
            f"MAE: {metrics['mae']}, "
            f"MSE: {metrics['mse']}"
        )

    # Palauttaa toimipisteen näytettävän nimen.
    def _get_display_name(self, location):
        return (
            location or "Kaikki näytteenotot"
        )

    # Muotoilee kaikki mallin arviointimittarit.
    def _format_metrics(self, metadata):
        return {
            "r2": self._format_metric(
                metadata["r2"]
            ),
            "mae": self._format_metric(
                metadata["mae"]
            ),
            "mse": self._format_metric(
                metadata["mse"]
            ),
        }

    # Muotoilee arviointimittarin kolmen desimaalin tarkkuudella.
    @staticmethod
    def _format_metric(value):
        if value is None:
            return "ei saatavilla"

        return f"{value:.3f}"