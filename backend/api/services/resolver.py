# Valitsee ja alustaa käyttäjän organisaatiolle määritetyn service-toteutuksen.

from api.services.services1.prediction1.employee_estimation import (
    EmployeeEstimator,
)
from api.services.services1.prediction1.hourly_prediction import (
    HourlyPredictionService,
)
from api.services.services1.prediction1.prediction import (
    PredictionService,
)


# Määrittelee organisaatiokohtaiset service-toteutukset.
SERVICE_MAP = {
    "Test Org 1": {
        "prediction": PredictionService,
        "hourly_prediction": HourlyPredictionService,
        "employees": EmployeeEstimator,
    },
}


# Palauttaa käyttäjän organisaatiolle alustetun servicen.
def get_service(
    user,
    service_name,
    **kwargs,
):
    organization = _get_user_organization(
        user
    )

    organization_services = (
        _get_organization_services(
            organization
        )
    )

    service_class = _get_named_service(
        organization_services,
        service_name,
        organization,
    )

    return service_class(
        organization=organization,
        **kwargs,
    )


# Palauttaa käyttäjän organisaation.
def _get_user_organization(user):
    organization = getattr(
        user,
        "organization",
        None,
    )

    if organization is None:
        raise ValueError(
            "User does not belong to an organization."
        )

    return organization


# Palauttaa organisaatiolle määritetyt servicet.
def _get_organization_services(
    organization,
):
    organization_services = SERVICE_MAP.get(
        organization.name
    )

    if organization_services is None:
        raise ValueError(
            "No services configured for organization "
            f"'{organization.name}'."
        )

    return organization_services


# Palauttaa organisaatiolle määritetyn service-luokan.
def _get_named_service(
    organization_services,
    service_name,
    organization,
):
    service_class = (
        organization_services.get(
            service_name
        )
    )

    if service_class is None:
        raise ValueError(
            f"Service '{service_name}' is not configured "
            f"for organization '{organization.name}'."
        )

    return service_class