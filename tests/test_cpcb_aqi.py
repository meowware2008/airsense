import pytest
from backend.app.services.aqi_calculator import (
    calculate_sub_index,
    calculate_cpcb_aqi,
    get_aqi_category,
)


def test_sub_index_pm25():
    # Good (0-30 -> 0-50)
    assert calculate_sub_index("pm25", 15.0) == 25
    assert calculate_sub_index("pm25", 30.0) == 50

    # Satisfactory (31-60 -> 51-100)
    assert calculate_sub_index("pm25", 45.0) in (74, 75)

    # Moderate (61-90 -> 101-200)
    assert calculate_sub_index("pm25", 75.0) in (148, 149)

    # Severe (>250)
    assert calculate_sub_index("pm25", 350.0) in range(401, 501)


def test_sub_index_pm10():
    assert calculate_sub_index("pm10", 25.0) == 25
    assert calculate_sub_index("pm10", 75.0) in (74, 75)


def test_sub_index_invalid():
    assert calculate_sub_index("pm25", -10.0) is None
    assert calculate_sub_index("unknown_gas", 50.0) is None


def test_cpcb_aqi_eligibility():
    # Eligible: 3 pollutants with PM2.5
    res = calculate_cpcb_aqi({
        "pm25": 45.0,
        "no2": 30.0,
        "so2": 15.0,
    })
    assert res["eligible"] is True
    assert res["standard"] == "IN_CPCB"
    assert res["aqi"] is not None
    assert res["category"] is not None

    # Ineligible: Missing particulate (PM2.5 and PM10)
    res_no_particulate = calculate_cpcb_aqi({
        "no2": 30.0,
        "so2": 15.0,
        "co": 1.2,
    })
    assert res_no_particulate["eligible"] is False
    assert res_no_particulate["aqi"] is None

    # Ineligible: Fewer than 3 pollutants
    res_fewer = calculate_cpcb_aqi({
        "pm25": 45.0,
        "pm10": 80.0,
    })
    assert res_fewer["eligible"] is False
    assert res_fewer["aqi"] is None


def test_aqi_categories():
    assert get_aqi_category(35)[0] == "Good"
    assert get_aqi_category(75)[0] == "Satisfactory"
    assert get_aqi_category(150)[0] == "Moderate"
    assert get_aqi_category(250)[0] == "Poor"
    assert get_aqi_category(350)[0] == "Very Poor"
    assert get_aqi_category(450)[0] == "Severe"
