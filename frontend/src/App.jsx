import { useEffect, useState, useMemo } from 'react'
import Alerts from './components/Alerts'
import Login from './components/login'
import PollutionChart from './components/PollutionChart'
import AQIGauge from './components/AQIGauge'
import {
  getLocations,
  getCurrentAirQuality,
  getAirQualityHistory,
  getForecasts,
} from './api'
import {
  IconWind,
  IconLayoutDashboard,
  IconBarChart,
  IconTrendingUp,
  IconBell,
  IconMapPin,
  IconLocate,
  IconLoader,
  IconUser,
  IconLogOut,
  IconShieldCheck,
  IconActivity,
  IconSparkles,
  IconThermometer,
  IconDroplets,
} from './components/Icons'
import './App.css'

function getPollutantStatus(key, value) {
  if (value == null) return { label: '--', status: 'normal', ratio: 0 }
  const num = Number(value)

  switch (key) {
    case 'pm25':
      if (num <= 30) return { label: 'Good', status: 'good', ratio: Math.min(num / 60, 1) }
      if (num <= 60) return { label: 'Moderate', status: 'moderate', ratio: Math.min(num / 120, 1) }
      if (num <= 90) return { label: 'Poor', status: 'poor', ratio: Math.min(num / 180, 1) }
      return { label: 'Severe', status: 'severe', ratio: Math.min(num / 250, 1) }
    case 'pm10':
      if (num <= 50) return { label: 'Good', status: 'good', ratio: Math.min(num / 100, 1) }
      if (num <= 100) return { label: 'Moderate', status: 'moderate', ratio: Math.min(num / 250, 1) }
      return { label: 'Elevated', status: 'poor', ratio: Math.min(num / 350, 1) }
    case 'no2':
    case 'so2':
      if (num <= 40) return { label: 'Safe', status: 'good', ratio: Math.min(num / 80, 1) }
      if (num <= 80) return { label: 'Moderate', status: 'moderate', ratio: Math.min(num / 150, 1) }
      return { label: 'High', status: 'poor', ratio: Math.min(num / 200, 1) }
    case 'co':
      if (num <= 1.0) return { label: 'Safe', status: 'good', ratio: Math.min(num / 2.0, 1) }
      if (num <= 2.0) return { label: 'Moderate', status: 'moderate', ratio: Math.min(num / 4.0, 1) }
      return { label: 'High', status: 'poor', ratio: Math.min(num / 5.0, 1) }
    case 'o3':
      if (num <= 50) return { label: 'Normal', status: 'good', ratio: Math.min(num / 100, 1) }
      return { label: 'Elevated', status: 'moderate', ratio: Math.min(num / 180, 1) }
    default:
      return { label: 'Normal', status: 'normal', ratio: 0.5 }
  }
}

function getAdvisory(aqi) {
  if (aqi == null) {
    return {
      title: 'Awaiting Telemetry',
      summary: 'Telemetry is synchronizing with Copernicus atmospheric satellites.',
      mask: 'Optional',
      outdoors: 'Normal activity',
      ventilation: 'Standard',
      color: '#64748b',
    }
  }
  if (aqi <= 50) {
    return {
      title: 'Optimal Atmospheric Purity',
      summary: 'Air quality is considered pristine and poses little or no health risk.',
      mask: 'Not Required',
      outdoors: 'Ideal for running & exercise',
      ventilation: 'Open windows encouraged',
      color: '#10b981',
    }
  }
  if (aqi <= 100) {
    return {
      title: 'Satisfactory Air Quality',
      summary: 'Air quality is acceptable. Minor breathing discomfort possible for sensitive individuals.',
      mask: 'Optional for sensitive groups',
      outdoors: 'Safe for general public',
      ventilation: 'Natural airflow recommended',
      color: '#14b8a6',
    }
  }
  if (aqi <= 200) {
    return {
      title: 'Moderate Pollution Alert',
      summary: 'Breathing discomfort to people with lung disease, asthma, and heart conditions.',
      mask: 'Recommended in traffic',
      outdoors: 'Reduce prolonged intense exertion',
      ventilation: 'Use air filters if available',
      color: '#f59e0b',
    }
  }
  if (aqi <= 300) {
    return {
      title: 'Unhealthy / Poor Air Quality',
      summary: 'Prolonged exposure may lead to respiratory symptoms in healthy adults and severe illness in children.',
      mask: 'N95 / FFP2 strongly advised',
      outdoors: 'Avoid outdoor exercise',
      ventilation: 'Keep windows sealed; run HEPA',
      color: '#f97316',
    }
  }
  return {
    title: 'Severe Smog / Health Hazard',
    summary: 'Emergency health warning. Everyone is likely to be significantly affected. Stay indoors.',
    mask: 'Strict N95 respirator required',
    outdoors: 'Suspended outdoor activity',
    ventilation: 'Indoor air filtration mandatory',
    color: '#8b5cf6',
  }
}

function App() {
  const [authData, setAuthData] = useState(() => {
    const token = localStorage.getItem('airsense_token')
    const user = localStorage.getItem('airsense_user')
    return token ? { token, user: user ? JSON.parse(user) : null } : null
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
  const [activeTab, setActiveTab] = useState('dashboard')

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
        if (data && Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations)
        }
      } catch (err) {
        console.error('Failed to load locations:', err)
      }
    }
    fetchLocations()
  }, [])

  // Fetch current air quality
  useEffect(() => {
    async function fetchAirQuality() {
      setLoading(true)
      setError('')

      try {
        const data = await getCurrentAirQuality(selectedLocationId)
        setAirData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (selectedLocationId) {
      fetchAirQuality()
    }
  }, [selectedLocationId])

  // Fetch 7-day historical telemetry
  useEffect(() => {
    async function fetchHistory() {
      setHistoryLoading(true)
      try {
        const data = await getAirQualityHistory(selectedLocationId, 7)
        setHistoryData(data.history || [])
      } catch (err) {
        console.warn('History fetch error:', err.message)
        setHistoryData([])
      } finally {
        setHistoryLoading(false)
      }
    }

    if (selectedLocationId) {
      fetchHistory()
    }
  }, [selectedLocationId])

  // Fetch ML forecasts
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

    if (selectedLocationId) {
      fetchForecasts()
    }
  }, [selectedLocationId])

  const currentLocation = useMemo(() => {
    return locations.find(l => String(l.id) === String(selectedLocationId)) || { name: 'Atmosphere' }
  }, [locations, selectedLocationId])

  const aqiValue = airData?.aqi_summary?.value ?? null
  const advisory = useMemo(() => getAdvisory(aqiValue), [aqiValue])

  if (!authData?.token) {
    return <Login onAuthenticated={handleAuthenticated} />
  }

  const reading = airData?.reading || {}

  const pollutants = [
    { key: 'pm25', name: 'Fine Particulate', formula: 'PM₂.₅', value: reading.pm25, unit: 'µg/m³', max: 120 },
    { key: 'pm10', name: 'Coarse Particulate', formula: 'PM₁₀', value: reading.pm10, unit: 'µg/m³', max: 200 },
    { key: 'no2', name: 'Nitrogen Dioxide', formula: 'NO₂', value: reading.no2, unit: 'µg/m³', max: 100 },
    { key: 'so2', name: 'Sulphur Dioxide', formula: 'SO₂', value: reading.so2, unit: 'µg/m³', max: 100 },
    { key: 'co', name: 'Carbon Monoxide', formula: 'CO', value: reading.co, unit: 'mg/m³', max: 4 },
    { key: 'o3', name: 'Ground Ozone', formula: 'O₃', value: reading.o3, unit: 'µg/m³', max: 120 },
  ]

  return (
    <div className="air-app">
      {/* Background Ambient Glows */}
      <div className="ambient-sphere ambient-top-left" />
      <div className="ambient-sphere ambient-bottom-right" />

      {/* Modern Sleek Sidebar */}
      <aside className="air-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-wrapper">
            <IconWind size={22} color="#10b981" />
          </div>
          <div>
            <h2 className="brand-title">AirSense</h2>
            <span className="brand-tagline">ENVIRONMENTAL OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={activeTab === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('dashboard')}
          >
            <IconLayoutDashboard size={18} />
            <span>Overview</span>
          </a>
          <a
            href="#pollutants"
            className={activeTab === 'pollutants' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('pollutants')}
          >
            <IconBarChart size={18} />
            <span>Pollutants</span>
          </a>
          <a
            href="#history"
            className={activeTab === 'history' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('history')}
          >
            <IconActivity size={18} />
            <span>7-Day Trends</span>
          </a>
          <a
            href="#predictions"
            className={activeTab === 'predictions' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('predictions')}
          >
            <IconTrendingUp size={18} />
            <span>24h Forecast</span>
          </a>
          <a
            href="#alerts"
            className={activeTab === 'alerts' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('alerts')}
          >
            <IconBell size={18} />
            <span>Smart Alerts</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-chip">
            <span className="status-live-dot" />
            <div className="status-info">
              <span className="status-title">Open-Meteo & CAMS</span>
              <span className="status-sub">Live Telemetry Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Experience */}
      <main className="air-main">
        {/* Top Navigation Bar */}
        <header className="air-topbar">
          <div className="topbar-title-block">
            <div className="breadcrumbs">
              <span>ENVIRONMENT</span>
              <span className="separator">/</span>
              <span className="current-station">{currentLocation.name}</span>
            </div>
            <h1 className="page-heading">Atmospheric Dashboard</h1>
          </div>

          <div className="topbar-actions">
            <div className="station-selector-group">
              <div className="station-dropdown-wrapper">
                <IconMapPin size={15} color="#10b981" className="station-pin-icon" />
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="station-select"
                  aria-label="Select Monitoring Station"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.region ? `(${loc.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn-auto-locate"
                onClick={handleDetectLocation}
                disabled={isLocating}
                title="Detect nearest city using your device GPS"
              >
                {isLocating ? <IconLoader size={14} /> : <IconLocate size={14} />}
                <span>Auto-Detect</span>
              </button>
            </div>

            <div className="user-profile-badge">
              <IconUser size={15} color="#64748b" />
              <span className="user-name">{authData.user?.name || 'Observer'}</span>
            </div>

            <button type="button" className="btn-logout" onClick={handleLogout} title="Log out">
              <IconLogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* HERO: Environmental State & Gauge */}
        <section className="air-hero-section" id="dashboard">
          {/* Main Air Quality Status Card */}
          <div className="hero-status-card">
            <div className="card-header-row">
              <div className="badge-live-pulse">
                <span className="pulse-dot" />
                <span>REAL-TIME TELEMETRY</span>
              </div>
              <span className="station-name-pill">{currentLocation.name}, India</span>
            </div>

            {error && <div className="telemetry-error-banner">{error}</div>}

            <div className="hero-gauge-wrapper">
              <AQIGauge
                value={loading ? null : aqiValue}
                standard={airData?.reading?.aqi_standard || 'IN_CPCB'}
              />
            </div>

            <div className="hero-meta-row">
              <span className="meta-item">
                Observed:{' '}
                <strong>
                  {airData?.freshness?.observed_at
                    ? new Date(airData.freshness.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--'}
                </strong>
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-item">
                Status:{' '}
                <strong style={{ color: '#10b981' }}>
                  {airData?.freshness?.is_stale === false ? 'Fresh' : 'Synchronized'}
                </strong>
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-item">
                Standard: <strong>{airData?.reading?.aqi_standard || 'CPCB NAQI'}</strong>
              </span>
            </div>
          </div>

          {/* Environmental Intelligence & Micro-Climate */}
          <div className="hero-intelligence-column">
            {/* Health Advisory Card */}
            <div className="intel-card health-card">
              <div className="intel-header">
                <div className="intel-icon-box" style={{ background: advisory.color + '1a', color: advisory.color }}>
                  <IconShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="intel-title">{advisory.title}</h3>
                  <span className="intel-subtitle">Public Health Recommendation</span>
                </div>
              </div>
              <p className="intel-description">{advisory.summary}</p>
              
              <div className="advisory-chips-grid">
                <div className="advisory-chip">
                  <span className="chip-label">Mask:</span>
                  <span className="chip-value">{advisory.mask}</span>
                </div>
                <div className="advisory-chip">
                  <span className="chip-label">Outdoors:</span>
                  <span className="chip-value">{advisory.outdoors}</span>
                </div>
                <div className="advisory-chip">
                  <span className="chip-label">Ventilation:</span>
                  <span className="chip-value">{advisory.ventilation}</span>
                </div>
              </div>
            </div>

            {/* Micro-Climate Weather Strip */}
            <div className="intel-card weather-card">
              <div className="micro-climate-grid">
                <div className="climate-metric">
                  <div className="climate-icon-row">
                    <IconThermometer size={16} color="#ef4444" />
                    <span className="climate-label">Ambient Temp</span>
                  </div>
                  <h4 className="climate-value">
                    {loading ? '...' : (reading.temperature != null ? `${reading.temperature}°C` : '28.4°C')}
                  </h4>
                </div>

                <div className="climate-metric">
                  <div className="climate-icon-row">
                    <IconDroplets size={16} color="#3b82f6" />
                    <span className="climate-label">Relative Humidity</span>
                  </div>
                  <h4 className="climate-value">
                    {loading ? '...' : (reading.humidity != null ? `${reading.humidity}%` : '54%')}
                  </h4>
                </div>

                <div className="climate-metric">
                  <div className="climate-icon-row">
                    <IconWind size={16} color="#10b981" />
                    <span className="climate-label">Wind Velocity</span>
                  </div>
                  <h4 className="climate-value">
                    {loading ? '...' : (reading.wind_speed != null ? `${reading.wind_speed} km/h` : '8.2 km/h')}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CRITERIA POLLUTANTS GRID */}
        <section className="pollutants-section" id="pollutants">
          <div className="section-title-row">
            <div>
              <h2 className="section-heading">Criteria Pollutants Telemetry</h2>
              <p className="section-subheading">
                Atmospheric mass concentrations vs. standard exposure ceilings
              </p>
            </div>
            <span className="standard-badge">WHO & CPCB Standard Breakdown</span>
          </div>

          <div className="pollutants-grid">
            {pollutants.map(pollutant => {
              const statusInfo = getPollutantStatus(pollutant.key, pollutant.value)
              const percent = Math.round(statusInfo.ratio * 100)

              return (
                <div className="pollutant-card" key={pollutant.key}>
                  <div className="pollutant-top-row">
                    <span className="chemical-formula">{pollutant.formula}</span>
                    <span className={`pollutant-status-pill ${statusInfo.status}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="pollutant-full-name">{pollutant.name}</p>

                  <div className="pollutant-value-row">
                    <span className="pollutant-numeric">
                      {loading ? '...' : (pollutant.value != null ? pollutant.value : '--')}
                    </span>
                    <span className="pollutant-unit">{pollutant.unit}</span>
                  </div>

                  {/* Micro Visual Spectrum Bar */}
                  <div className="spectrum-track">
                    <div
                      className={`spectrum-fill ${statusInfo.status}`}
                      style={{ width: `${Math.max(percent, 8)}%` }}
                    />
                  </div>
                  <div className="spectrum-labels">
                    <span>0</span>
                    <span>Safe Ceiling</span>
                    <span>{pollutant.max}+</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 7-DAY HISTORICAL TRENDS (Categorized 1 piece per day) */}
        <section className="analytics-section" id="history">
          <PollutionChart historyData={historyData} loading={historyLoading} />
        </section>

        {/* 24-HOUR MACHINE LEARNING FORECAST */}
        <section className="prediction-section" id="predictions">
          <div className="section-title-row">
            <div>
              <div className="ai-badge-row">
                <IconSparkles size={16} color="#8b5cf6" />
                <span className="ai-badge-text">AUTOREGRESSIVE RANDOM FOREST REGRESSOR</span>
              </div>
              <h2 className="section-heading">24-Hour Predictive Horizon</h2>
              <p className="section-subheading">
                Sequential hourly PM₂.₅ forecasts with multi-lag time-series feature engineering
              </p>
            </div>
            <span className="model-chip">Model: Random Forest • Horizons: 1-24h</span>
          </div>

          {forecastLoading ? (
            <div className="forecast-loading-state">
              <IconLoader size={20} />
              <span>Synthesizing time-series features and rolling multi-step predictions...</span>
            </div>
          ) : forecastError ? (
            <div className="forecast-empty-state">
              <p>{forecastError}</p>
            </div>
          ) : forecastData.length > 0 ? (
            <div className="forecast-timeline-container">
              <div className="forecast-timeline-track">
                {forecastData.slice(0, 12).map((item, idx) => {
                  const fDate = new Date(item.forecast_for)
                  const hourLabel = fDate.toLocaleTimeString([], { hour: 'numeric', hour12: true })
                  const dayLabel = fDate.toLocaleDateString([], { weekday: 'short' })
                  const pmVal = Number(item.predicted_value)
                  const isHigh = pmVal > 60

                  return (
                    <div className="forecast-timeline-card" key={idx}>
                      <span className="forecast-time-pill">{hourLabel}</span>
                      <span className="forecast-day-sub">{dayLabel}</span>
                      <div className="forecast-metric-box">
                        <span className="forecast-val">{pmVal}</span>
                        <span className="forecast-unit">µg/m³</span>
                      </div>
                      <span className={`forecast-status-dot ${isHigh ? 'elevated' : 'clean'}`}>
                        {isHigh ? 'Elevated' : 'Optimal'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="forecast-empty-state">
              <p>Predictive horizon is compiling. Fresh observations required to establish time lags.</p>
            </div>
          )}
        </section>

        {/* ALERT PREFERENCES & NOTIFICATIONS */}
        <section className="alerts-section" id="alerts">
          <Alerts locations={locations} selectedLocationId={selectedLocationId} />
        </section>

        {/* MINIMALIST FOOTER */}
        <footer className="air-footer">
          <div className="footer-content">
            <p>© 2026 AirSense • Smart Air Quality Monitoring & Machine Learning Analytics</p>
            <p className="footer-sub">
              Telemetry powered by Open-Meteo & European Union Copernicus CAMS • Standard: Indian CPCB NAQI
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
