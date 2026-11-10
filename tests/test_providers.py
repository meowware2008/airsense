import pytest
from backend.app.models import Location
from backend.app.providers import get_provider
from backend.app.providers.mock_provider import MockProvider


def test_mock_provider_current(test_location):
    provider = MockProvider()
    reading = provider.fetch_current(test_location)

    assert reading is not None
    assert reading.provider == "mock"
    assert reading.measurement_type == "simulated"
    assert reading.location_id == test_location.id
    assert reading.pm25 is not None
    assert reading.pm10 is not None
    assert reading.aqi_value is not None
    assert "pm25" in reading.units_metadata


def test_mock_provider_history(test_location):
    provider = MockProvider()
    history = provider.fetch_history(test_location, past_days=3)

    assert len(history) == 3 * 24
    for r in history:
        assert r.measurement_type == "simulated"
        assert r.provider == "mock"
        assert r.pm25 is not None


def test_provider_factory():
    assert isinstance(get_provider("mock"), MockProvider)
    assert isinstance(get_provider("unknown_provider"), MockProvider)
