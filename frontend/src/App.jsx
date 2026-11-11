import Alerts from './components/Alerts'
import Login from './components/login'
import PollutionChart from './components/PollutionChart'
import { useEffect, useState } from 'react'
import AQIGauge from './components/AQIGauge'
import { getLocations, getCurrentAirQuality, getAirQualityHistory,  getForecasts } from './api'
import './App.css'

function App() {
  const [authData, setAuthData] = useState(() => {
  const token = localStorage.getItem('airsense_token')
  const user = localStorage.getItem('airsense_user')

  return token
    ? { token, user: user ? JSON.parse(user) : null }
    : null
})

function handleAuthenticated(data) {
  localStorage.setItem('airsense_token', data.token)
  localStorage.setItem('airsense_user', JSON.stringify(data.user))
  setAuthData(data)
}

function handleLogout() {
  localStorage.removeItem('airsense_token')
  localStorage.removeItem('airsense_user')
  setAuthData(null)
}
  const [airData, setAirData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [locations, setLocations] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('3')
  const [isLocating, setIsLocating] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [forecastData, setForecastData] = useState([])
  const [forecastLoading, setForecastLoading] = useState(true)
  const [forecastError, setForecastError] = useState('')

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false)
        const { latitude, longitude } = pos.coords
        if (!locations || locations.length === 0) return

        let closest = locations[0]
        let minDistance = Infinity

        locations.forEach(loc => {
          if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
            const dLat = loc.latitude - latitude
            const dLon = loc.longitude - longitude
            const dist = Math.sqrt(dLat * dLat + dLon * dLon)
            if (dist < minDistance) {
              minDistance = dist
              closest = loc
            }
          }
        })

        if (closest) {
          setSelectedLocationId(String(closest.id))
        }
      },
      err => {
        setIsLocating(false)
        console.warn('Geolocation error:', err)
        alert('Unable to retrieve location or permission was denied.')
      },
      { timeout: 8000 }
    )
  }
  // Fetch available cities
  useEffect(() => {
    async function fetchLocations() {
      try {
        const data = await getLocations()
        setLocations(data.locations || [])
      } catch (err) {
        console.error('Error fetching locations:', err)
      }
    }

    fetchLocations()
  }, [])

  // Fetch air quality for selected city
  useEffect(() => {
    async function fetchAirQuality() {
      setLoading(true)
      setError('')

      try {
        const data = await getCurrentAirQuality(selectedLocationId)
        setAirData(data)
      } catch (err) {
        setError(err.message)
        setAirData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAirQuality()
  }, [selectedLocationId])

  // Fetch 7-day air quality history
  useEffect(() => {
    async function fetchHistory() {
      setHistoryLoading(true)
      try {
        const data = await getAirQualityHistory(selectedLocationId, 7)
        setHistoryData(data.series || [])
      } catch (err) {
        console.error('Error fetching history:', err)
        setHistoryData([])
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [selectedLocationId])


// Fetch machine-learning forecasts
useEffect(() => {
  async function fetchForecasts() {
    setForecastLoading(true)
    setForecastError('')

    try {
      const data = await getForecasts(selectedLocationId)

      if (data.status === 'available') {
        setForecastData(data.forecasts || [])
      } else {
        setForecastData([])
        setForecastError(data.message || 'Predictions are currently unavailable.')
      }
    } catch (err) {
      setForecastData([])
      setForecastError(err.message)
    } finally {
      setForecastLoading(false)
    }
  }

  fetchForecasts()
}, [selectedLocationId])

if (!authData?.token) {
  return <Login onAuthenticated={handleAuthenticated} />
}

  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">🌿 AirSense</h2>

        <p className="menu-title">MENU</p>

        <nav>
          <a className="active" href="#dashboard">▦ Dashboard</a>
          <a href="#analytics">📊 Analytics</a>
          <a href="#predictions">🔮 Predictions</a>
          <a href="#alerts">🔔 Alerts</a>
          <a href="#recommendations">💡 Recommendations</a>
        </nav>

        <div className="sidebar-bottom">
          <p>AirSense</p>
          <small>Smart Air Quality Monitoring</small>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">

        <header className="topbar">
          <div className="topbar-left">
            <h1>Air Quality Dashboard</h1>
            <p>Monitor your environment in real time</p>
          </div>
          <div className="topbar-right">
            <div className="location-picker-group">
              <div className="location-select-wrapper">
                <span className="location-icon" aria-hidden="true">📍</span>
                <select
                  id="location-select"
                  className="location-select"
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  aria-label="Select City"
                >
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}{location.region ? ` (${location.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="detect-location-btn"
                onClick={handleDetectLocation}
                title="Detect nearest city based on your GPS location"
                disabled={isLocating}
              >
                {isLocating ? '⌛ Locating...' : '🎯 Auto-Detect'}
              </button>
            </div>

            <div className="profile" title="Logged in user">
              <span className="profile-icon">👤</span>
              <span className="profile-name">{authData.user?.name || 'User'}</span>
            </div>

            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
              title="Sign out of your account"
            >
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <section className="welcome">
          <h2>Welcome to AirSense 🌿</h2>
          <p>Stay informed. Breathe better. Live healthier.</p>
        </section>

        {/* AQI overview */}
        <section className="stats">
          <div className="stat-card">
            <p>Air Quality Index</p>
              <h2>{loading ? '...' : airData?.aqi_summary?.value ?? '--'}</h2>
              <span
  style={{
    color: airData?.aqi_summary?.color || '#777',
    fontWeight: 'bold'
  }}
>
  {loading
    ? 'Loading...'
    : error
      ? error
      : airData?.aqi_summary?.category ?? 'No data'}
</span>
          </div>

          <div className="stat-card">
            <p>PM2.5</p>
            <h2>{loading ? '...' : airData?.reading?.pm25 ?? '--'}</h2>
            <span>μg/m³</span>
          </div>

          <div className="stat-card">
            <p>PM10</p>
            <h2>{loading ? '...' : airData?.reading?.pm10 ?? '--'}</h2>
            <span>μg/m³</span>
          </div>

          <div className="stat-card">
            <p>Temperature</p>
            <h2>
              {loading ? '...' : airData?.reading?.temperature ?? '--'}
            </h2>
            <span>°C</span>
          </div>

<div className="stat-card">
  <p>Carbon Monoxide (CO)</p>
  <h2>{loading ? '...' : airData?.reading?.co ?? '--'}</h2>
  <span>μg/m³</span>
</div>

<div className="stat-card">
  <p>Nitrogen Dioxide (NO₂)</p>
  <h2>{loading ? '...' : airData?.reading?.no2 ?? '--'}</h2>
  <span>μg/m³</span>
</div>

<div className="stat-card">
  <p>Sulphur Dioxide (SO₂)</p>
  <h2>{loading ? '...' : airData?.reading?.so2 ?? '--'}</h2>
  <span>μg/m³</span>
</div>

<div className="stat-card">
  <p>Ozone (O₃)</p>
  <h2>{loading ? '...' : airData?.reading?.o3 ?? '--'}</h2>
  <span>μg/m³</span>
</div>

        </section>

        {/* Air quality information */}
        <section className="content-grid">

          <div className="panel" id="analytics">
            <h2>Air Quality Overview</h2>
            <div className="aqi-display">
              <AQIGauge value={airData?.aqi_summary?.value ?? null} />

            <h3>
            {loading
              ? 'Loading air quality...'
              : airData?.aqi_summary?.category ?? 'Data unavailable'}
            </h3>

            <p>
              {airData?.aqi_summary?.label ?? 'Waiting for air quality data.'}
            </p>


<p className="last-updated">
  Last updated: {
    airData?.freshness?.observed_at
      ? new Date(airData.freshness.observed_at).toLocaleString()
      : '--'
  }
</p>

<p className="data-status">
  Data status: {
    airData?.freshness?.is_stale === false
      ? 'Fresh'
      : airData?.freshness?.is_stale === true
        ? 'Outdated'
        : '--'
  }
</p>

            </div>
          </div>

          <div className="panel" id="recommendations">
            <h2>Health Recommendations</h2>
            <div className="recommendation">
              <span>🌱</span>
              <div>
                <h3>Air quality guidance</h3>
                <p>Recommendations will appear based on actual AQI readings.</p>
              </div>
            </div>
            <div className="recommendation">
              <span>😷</span>
              <div>
                <h3>Stay informed</h3>
                <p>Check pollution levels before outdoor activities.</p>
              </div>
            </div>
          </div>

        </section>
        
{/* 7-day Air Quality History */}
<section className="panel" id="history">
  <PollutionChart historyData={historyData} loading={historyLoading} />
</section>

        {/* Prediction section */}
        
<section className="panel prediction" id="predictions">
  <h2>Air Quality Predictions</h2>
  <p>Next 24-hour PM2.5 forecast using Machine Learning</p>

  {forecastLoading ? (
    <p>Loading predictions...</p>
  ) : forecastError ? (
    <p>{forecastError}</p>
  ) : forecastData.length > 0 ? (
    <div className="forecast-list">
      {forecastData.map((forecast, index) => (
        <div className="recommendation" key={forecast.forecast_for || index}>
          <span>🔮</span>
          <div>
            <h3>
              {new Date(forecast.forecast_for).toLocaleString()}
            </h3>
            <p>
              Predicted PM2.5: {' '}
              <strong>{forecast.predicted_value} {forecast.unit}</strong>
            </p>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p>No prediction data is currently available.</p>
  )}
</section>
{/* Alerts Section */}
<Alerts
  locations={locations}
  selectedLocationId={selectedLocationId}
/>


        <footer>
          © 2026 AirSense | Smart Air Quality Monitoring System
        </footer>

      </main>
    </div>
  )
}
  

export default App
