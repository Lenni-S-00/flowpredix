# api/services/repositories.py
# Repository-luokat vastaavat tietokantahauista.
#
# Muu sovellus (esim. PredictionTrainer ja PredictionService)
# käyttää Repositorya eikä tee ORM-kyselyitä itse.

from django.db.models import Sum
from django.db.models.functions import TruncDate

from api.models import SampleData


class SampleDataRepository:
    """
    Repository SampleData-taulun lukemiseen.

    Luokan tehtävä on kapseloida kaikki tietokantahaut yhteen paikkaan,
    jolloin palveluluokkien ei tarvitse tuntea Django ORM:ää.
    """

    @staticmethod
    def get_daily_data(location=None):
        """
        Palauttaa päiväkohtaisen näytedatan.

        Jos location annetaan, palautetaan vain kyseisen toimipisteen data.
        Muussa tapauksessa palautetaan kaikkien toimipisteiden data.

        Palautusmuoto:

        [
            {
                "date": ...,
                "location": "Lab1",
                "samples_taken": 123,
            },
            ...
        ]
        """

        # Aloitetaan kaikesta SampleData-datasta.
        queryset = SampleData.objects.all()

        # Rajataan haku yhteen toimipisteeseen tarvittaessa.
        if location:
            queryset = queryset.filter(location=location)

        # Ryhmitellään data päivätasolle ja lasketaan saman päivän
        # näytemäärät yhteen.
        rows = (
            queryset
            .annotate(date=TruncDate("timestamp"))
            .values("date", "location")
            .annotate(
                samples_taken=Sum("samples_taken")
            )
            .order_by("date")
        )

        # Palautetaan QuerySet tavallisena Python-listana,
        # jolloin kutsuva koodi ei ole riippuvainen Django ORM:stä.
        return list(rows)

    @staticmethod
    def get_locations():
        """
        Palauttaa kaikki tietokannasta löytyvät toimipisteet.

        Esimerkki:

        [
            "Lab1",
            "Lab2",
            "Lab3",
        ]
        """

        return list(
            SampleData.objects
            .values_list(
                "location",
                flat=True,
            )
            .distinct()
            .order_by("location")
        )