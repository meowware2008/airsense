"""CPCB Indian National AQI Calculator.

Implements the official Central Pollution Control Board (CPCB) methodology
for calculating sub-indices and overall National Air Quality Index (NAQI).

Rule:
- At least three pollutants must be present, with at least one being PM2.5 or PM10.
- Overall AQI is the maximum of the calculated sub-indices.
"""
from typing import Dict, Optional, Tuple, Any

# Breakpoint table: (B_lo, B_hi, I_lo, I_hi)
BREAKPOINTS = {
    "pm25": [
        (0.0, 30.0, 0, 50),
        (31.0, 60.0, 51, 100),
        (61.0, 90.0, 101, 200),
        (91.0, 120.0, 201, 300),
        (121.0, 250.0, 301, 400),
        (250.0, 500.0, 401, 500),
    ],
    "pm10": [
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 250.0, 101, 200),
        (251.0, 350.0, 201, 300),
        (351.0, 430.0, 301, 400),
        (430.0, 600.0, 401, 500),
    ],
    "no2": [
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 180.0, 101, 200),
        (181.0, 280.0, 201, 300),
        (281.0, 400.0, 301, 400),
        (400.0, 600.0, 401, 500),
    ],
    "so2": [
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 380.0, 101, 200),
        (381.0, 800.0, 201, 300),
        (801.0, 1600.0, 301, 400),
        (1600.0, 2000.0, 401, 500),
    ],
    # CO is in mg/m³ for CPCB breakpoint math
    "co": [
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.0, 50.0, 401, 500),
    ],
    "o3": [
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 168.0, 101, 200),
        (169.0, 208.0, 201, 300),
        (209.0, 748.0, 301, 400),
        (748.0, 1000.0, 401, 500),
    ],
}


def calculate_sub_index(pollutant: str, concentration: float) -> Optional[int]:
    """Calculate sub-index for a single pollutant using linear interpolation."""
    if concentration is None or concentration < 0:
        return None

    pollutant_key = pollutant.lower()
    if pollutant_key not in BREAKPOINTS:
        return None

    bps = BREAKPOINTS[pollutant_key]

    for b_lo, b_hi, i_lo, i_hi in bps:
        if b_lo <= concentration <= b_hi:
            sub = i_lo + ((i_hi - i_lo) / (b_hi - b_lo)) * (concentration - b_lo)
            return int(round(sub))

    # If concentration exceeds highest breakpoint, cap at 500
    if concentration > bps[-1][1]:
        return 500

    return None


def get_aqi_category(aqi: int) -> Tuple[str, str, str]:
    """Return (Category Name, Color Hex, Explanatory Label)."""
    if aqi <= 50:
        return (
            "Good",
            "#00E400",
            "Minimal impact. Air quality is considered satisfactory."
        )
    elif aqi <= 100:
        return (
            "Satisfactory",
            "#92D050",
            "Minor breathing discomfort to sensitive people."
        )
    elif aqi <= 200:
        return (
            "Moderate",
            "#FFFF00",
            "Breathing discomfort to the people with lungs, asthma and heart diseases."
        )
    elif aqi <= 300:
        return (
            "Poor",
            "#FF7E00",
            "Breathing discomfort to most people on prolonged exposure."
        )
    elif aqi <= 400:
        return (
            "Very Poor",
            "#FF0000",
            "Respiratory illness on prolonged exposure."
        )
    else:
        return (
            "Severe",
            "#7E0023",
            "Affects healthy people and seriously impacts those with existing diseases."
        )


def calculate_cpcb_aqi(pollutants: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """Calculate CPCB Indian AQI from pollutant values.

    Args:
        pollutants: Dict with keys: 'pm25', 'pm10', 'no2', 'so2', 'co', 'o3'.
                    CO is expected in µg/m³; converted internally to mg/m³ (value / 1000).

    Returns:
        Dict containing:
        - aqi: int or None
        - standard: 'IN_CPCB' or None
        - category: str or None
        - color: str or None
        - label: str or None
        - prominent_pollutant: str or None
        - sub_indices: Dict[str, int]
        - eligible: bool
        - message: str explanation if not eligible
    """
    sub_indices: Dict[str, int] = {}

    for pol, val in pollutants.items():
        if val is None or val < 0:
            continue
        pol_key = pol.lower()

        # Convert CO from µg/m³ to mg/m³ if needed
        conc = val
        if pol_key == "co" and val > 100.0:  # If provided in µg/m³
            conc = val / 1000.0

        sub = calculate_sub_index(pol_key, conc)
        if sub is not None:
            sub_indices[pol_key] = sub

    # CPCB Minimum Data Criteria:
    # 1. At least 3 pollutants monitored
    # 2. At least one must be PM2.5 or PM10
    has_particulate = "pm25" in sub_indices or "pm10" in sub_indices
    count = len(sub_indices)

    if count >= 3 and has_particulate:
        max_pollutant = max(sub_indices, key=sub_indices.get)
        overall_aqi = min(500, max(0, sub_indices[max_pollutant]))
        category, color, label = get_aqi_category(overall_aqi)

        return {
            "aqi": overall_aqi,
            "standard": "IN_CPCB",
            "category": category,
            "color": color,
            "label": label,
            "prominent_pollutant": max_pollutant.upper(),
            "sub_indices": sub_indices,
            "eligible": True,
            "message": "CPCB Indian AQI calculated successfully.",
        }
    else:
        # Not enough parameters to compute official CPCB AQI
        reasons = []
        if not has_particulate:
            reasons.append("Missing both PM2.5 and PM10")
        if count < 3:
            reasons.append(f"Only {count}/3 required pollutants available")

        return {
            "aqi": None,
            "standard": None,
            "category": None,
            "color": None,
            "label": None,
            "prominent_pollutant": None,
            "sub_indices": sub_indices,
            "eligible": False,
            "message": f"Indian AQI cannot be calculated: {', '.join(reasons)}.",
        }
