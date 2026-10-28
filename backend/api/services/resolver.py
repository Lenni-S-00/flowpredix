# Tähän tulee logiikka, jolla oikea datan käsittely tapa 
# valitaan organisaation perusteella.

from api.services.services1.prediction1.prediction import PredictionService
from api.services.services1.prediction1.hourly_prediction import HourlyPredictionService
from api.services.services1.prediction1.employee_estimation import EmployeeEstimator


# Organisaation nimi -> käytettävät servicet
SERVICE_MAP = {
    "Test Org 1": {
        "prediction": PredictionService,
        "hourly_prediction": HourlyPredictionService,
        "employees": EmployeeEstimator,
    },
}


def get_service(user, service_name):
    """
    Palauttaa käyttäjän organisaatiolle määritetyn servicen.
    """

    if not hasattr(user, "organization") or user.organization is None:
        raise ValueError("User does not belong to an organization.")

    organization_name = user.organization.name

    organization_services = SERVICE_MAP.get(organization_name)

    if organization_services is None:
        raise ValueError(
            f"No services configured for organization '{organization_name}'."
        )

    service = organization_services.get(service_name)

    if service is None:
        raise ValueError(
            f"Service '{service_name}' is not configured "
            f"for organization '{organization_name}'."
        )

    return service