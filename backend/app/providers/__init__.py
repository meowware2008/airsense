from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.providers.open_meteo import OpenMeteoProvider
from backend.app.providers.waqi import WAQIProvider
from backend.app.providers.mock_provider import MockProvider


def get_provider(provider_name: str = "open_meteo") -> BaseAirQualityProvider:
    """Factory to retrieve configured air quality provider adapter."""
    name = (provider_name or "open_meteo").lower()
    if name == "mock":
        return MockProvider()
    elif name in ("waqi", "cpcb", "cpcb_waqi"):
        return WAQIProvider()
    elif name in ("open_meteo", "cams", "modelled"):
        return OpenMeteoProvider()
    else:
        # Default to mock if unrecognized to avoid runtime crashes
        return MockProvider()
