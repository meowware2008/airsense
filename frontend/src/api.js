
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getLocations() {
  const response = await fetch(`${API_BASE_URL}/locations`);

  if (!response.ok) {
    throw new Error("Unable to fetch locations");
  }

  return response.json();
}

export async function getCurrentAirQuality(locationId) {
  const response = await fetch(
    `${API_BASE_URL}/air-quality/current?location_id=${locationId}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch current air quality");
  }

  return response.json();
}

export async function getAirQualityHistory(locationId, days = 7) {
  const response = await fetch(
    `${API_BASE_URL}/air-quality/history?location_id=${locationId}&days=${days}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch air quality history");
  }

  return response.json();
}


export async function getForecasts(locationId) {
  const response = await fetch(
    `${API_BASE_URL}/forecasts?location_id=${locationId}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch forecast data");
  }

  return response.json();
}

