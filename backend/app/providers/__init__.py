from backend.app.providers.base import BaseAirQualityProvider, NormalizedReading
from backend.app.providers.open_meteo import OpenMeteoProvider
from backend.app.providers.mock_provider import MockProvider


def get_provider(provider_name: str = "open_meteo") -> BaseAirQualityProvider:
    """Factory to retrieve configured air quality provider adapter."""
    name = (provider_name or "").lower()
    if name == "mock":
        return MockProvider()
    elif name == "open_meteo":
        return OpenMeteoProvider()
    else:
        # Default to mock if unrecognized to avoid runtime crashes
        return MockProvider()
