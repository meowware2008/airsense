
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
function getAuthHeaders() {
  const token = localStorage.getItem('airsense_token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

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

// Authentication

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Registration failed');
  }

  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Login failed');
  }

  return data;
}
// Alerts API

export async function getAlerts() {
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Unable to fetch alerts')
  }

  return response.json()
}

export async function createAlert(locationId, thresholdValue) {
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      location_id: Number(locationId),
      threshold_value: Number(thresholdValue),
      enabled: true,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Unable to create alert')
  }

  return data
}

export async function deleteAlert(alertId) {
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Unable to delete alert')
  }

  return response.json()
}

export async function getNotifications() {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error('Unable to fetch notifications')
  }

  return response.json()
}
export async function markNotificationRead(notificationId) {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    throw new Error('Unable to mark notification as read')
  }

  return response.json()
}