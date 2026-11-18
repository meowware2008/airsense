import { useEffect, useState, useMemo } from 'react'
import Alerts from './components/Alerts'
import Login from './components/login'
import PollutionChart from './components/PollutionChart'
import AnimatedCityDiorama from './components/AnimatedCityDiorama'
import cityDioramaBg from './assets/city-diorama.png'
import cornerTreesImg from './assets/corner-trees.png'
import { useCountUp } from './utils/useCountUp'
import {
  getLocations,
  getCurrentAirQuality,
  getAirQualityHistory,
  getForecasts,
  getBestTime,
  sendBestTimeToWhatsapp,
  pingHealth,
} from './api'
import {
  IconWind,
  IconBarChart,
  IconTrendingUp,
  IconBell,
  IconMapPin,
  IconLocate,
  IconLoader,
  IconUser,
  IconLogOut,
  IconSparkles,
  IconThermometer,
  IconDroplets,
  IconHome,
  IconSettings,
  IconChevronRight,
  IconCalendar,
  IconSunCloud,
  IconLeafOutline,
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
      title: 'Air Quality is Satisfactory',
      summary: 'Generally safe for outdoor activities.',
      category: 'Satisfactory',
      mask: 'Optional',
      outdoors: 'Normal activity',
      ventilation: 'Standard',
      color: '#2e7d32',
      badgeBg: '#dcf0db',
    }
  }
  if (aqi <= 50) {
    return {
      title: 'Air Quality is Pristine',
      summary: 'Ideal atmospheric conditions for all outdoor activities.',
      category: 'Good',
      mask: 'Not Required',
      outdoors: 'Ideal for running & exercise',
      ventilation: 'Open windows encouraged',
      color: '#1b5e20',
      badgeBg: '#d7eed6',
    }
  }
  if (aqi <= 100) {
    return {
      title: 'Air Quality is Satisfactory',
      summary: 'Generally safe for outdoor activities.',
      category: 'Satisfactory',
      mask: 'Optional for sensitive groups',
      outdoors: 'Safe for general public',
      ventilation: 'Natural airflow recommended',
      color: '#2e7d32',
      badgeBg: '#dcf0db',
    }
  }
  if (aqi <= 200) {
    return {
      title: 'Moderate Air Quality',
      summary: 'Breathing discomfort possible for sensitive individuals.',
      category: 'Moderate',
      mask: 'Recommended in traffic',
      outdoors: 'Reduce prolonged intense exertion',
      ventilation: 'Use air filters if available',
      color: '#b78103',
      badgeBg: '#fef3c7',
    }
  }
  if (aqi <= 300) {
    return {
      title: 'Air Quality is Poor',
      summary: 'Prolonged exposure may cause respiratory symptoms.',
      category: 'Poor',
      mask: 'N95 / FFP2 strongly advised',
      outdoors: 'Avoid outdoor exercise',
      ventilation: 'Keep windows sealed',
      color: '#c2410c',
      badgeBg: '#ffedd5',
    }
  }
  return {
    title: 'Severe Smog / Health Hazard',
    summary: 'Emergency health warning. Everyone should avoid outdoor exposure.',
    category: 'Severe',
    mask: 'Strict N95 respirator required',
    outdoors: 'Suspended outdoor activity',
    ventilation: 'Indoor air filtration mandatory',
    color: '#991b1b',
    badgeBg: '#fee2e2',
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
  const [bestTimeData, setBestTimeData] = useState(null)
  const [bestTimeLoading, setBestTimeLoading] = useState(true)
  const [bestTimeError, setBestTimeError] = useState('')
  const [bestTimeSendingWhatsapp, setBestTimeSendingWhatsapp] = useState(false)
  const [bestTimeWhatsappStatus, setBestTimeWhatsappStatus] = useState('')
  const [bestTimeCustomPhone, setBestTimeCustomPhone] = useState('')
  const [showPhonePrompt, setShowPhonePrompt] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  async function handleSendBestTimeToWhatsapp() {
    setBestTimeWhatsappStatus('')
    setBestTimeSendingWhatsapp(true)
    try {
      const res = await sendBestTimeToWhatsapp(selectedLocationId, bestTimeCustomPhone || null)
      setBestTimeWhatsappStatus(`✓ ${res.message || 'Sent to WhatsApp!'}`)
      setShowPhonePrompt(false)
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('whatsapp number')) {
        setShowPhonePrompt(true)
      }
      setBestTimeWhatsappStatus(`⚠️ ${err.message}`)
    } finally {
      setBestTimeSendingWhatsapp(false)
    }
  }

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

  // Keep-alive heartbeat: ping backend every 5 minutes while webpage is open
  useEffect(() => {
    const interval = setInterval(() => {
      pingHealth()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
        setHistoryData(data.history || data.series || [])
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

  useEffect(() => {
    let cancelled = false

    const fetchBestTime = async () => {
      setBestTimeLoading(true)
      setBestTimeError('')

      try {
        const data = await getBestTime(selectedLocationId)
        if (!cancelled) {
          setBestTimeData(data)
        }
      } catch (err) {
        if (!cancelled) {
          setBestTimeData(null)
          setBestTimeError(err.message)
        }
      } finally {
        if (!cancelled) {
          setBestTimeLoading(false)
        }
      }
    }

    if (selectedLocationId) {
      fetchBestTime()
    }

    return () => {
      cancelled = true
    }
  }, [selectedLocationId])

  const currentLocation = useMemo(() => {
    return locations.find(l => String(l.id) === String(selectedLocationId)) || { name: 'Bengaluru', region: 'Karnataka' }
  }, [locations, selectedLocationId])

  const rawAqi = airData?.aqi_summary?.value != null ? Number(airData.aqi_summary.value) : 87
  const animatedAqi = useCountUp(rawAqi, 900)
  const advisory = useMemo(() => getAdvisory(rawAqi), [rawAqi])

  const reading = airData?.reading || {}
  const tempVal = reading.temperature != null ? Number(reading.temperature).toFixed(1) : '28.4'
  const humidityVal = reading.humidity != null ? Math.round(Number(reading.humidity)) : '54'
  const windVal = reading.wind_speed != null ? Number(reading.wind_speed).toFixed(1) : '8.2'

  const observedTimeStr = useMemo(() => {
    if (airData?.freshness?.observed_at) {
      return new Date(airData.freshness.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    }
    return '01:00 PM'
  }, [airData])

  // SEPARATE LOGIN SCREEN: Dashboard is ONLY accessible AFTER login!
  if (!authData?.token) {
    return <Login onAuthenticated={handleAuthenticated} />
  }

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
      {/* Layered Environmental Background from original landscape artwork */}
      <div
        className="atmospheric-bg-layer"
        style={{ backgroundImage: `url(${cityDioramaBg})` }}
        aria-hidden="true"
      />
      <div className="atmospheric-bg-overlay" aria-hidden="true" />

      {/* Light Sage Translucent Sidebar (~212px at 1728px viewport) */}
      <aside className="air-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-leaf">
            <IconLeafOutline size={24} color="#255a36" />
          </div>
          <div className="brand-text-group">
            <h2 className="brand-title">AirSense</h2>
            <span className="brand-tagline">ENVIRONMENTAL OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <IconHome size={18} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'pollutants' ? 'active' : ''}`}
            onClick={() => setActiveTab('pollutants')}
          >
            <IconBarChart size={18} />
            <span>Pollutants</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <IconTrendingUp size={18} />
            <span>Trends</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            <IconTrendingUp size={18} />
            <span>Forecast</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <IconBell size={18} />
            <span>Alerts</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <IconSettings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Seamlessly blended landscape illustration at bottom of sidebar */}
        <div className="sidebar-landscape-illustration" aria-hidden="true">
          <img src={cornerTreesImg} alt="" />
        </div>
      </aside>

      {/* Main Experience */}
      <main className="air-main">
        {/* Top Navigation Bar */}
        <header className="air-topbar">
          <div className="topbar-title-block">
            <div className="breadcrumbs">
              <span className="crumb-root">ENVIRONMENT</span>
              <span className="crumb-separator">/</span>
              <span className="crumb-station">
                {currentLocation.name}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="chevron-down-inline">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
            <h1 className="page-heading">Atmospheric Dashboard</h1>
          </div>

          <div className="topbar-actions">
            {/* Location Selector Pill */}
            <div className="station-pill-container">
              <IconMapPin size={15} color="#2e5b3d" className="station-pin-icon" />
              <span className="station-pill-label">
                {currentLocation.name} {currentLocation.region ? `(${currentLocation.region})` : ''}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2e5b3d" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="station-hidden-select"
                aria-label="Select Monitoring Station"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.region ? `(${loc.region})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Detect Button */}
            <button
              type="button"
              className="btn-auto-detect"
              onClick={handleDetectLocation}
              disabled={isLocating}
              title="Detect nearest city using device GPS"
            >
              {isLocating ? <IconLoader size={14} /> : <IconLocate size={14} color="#2e5b3d" />}
              <span>Auto-Detect</span>
            </button>

            {/* User Profile Pill */}
            <div className="user-profile-pill">
              <IconUser size={15} color="#607368" />
              <span className="user-profile-name">{authData.user?.name || 'Demo Citizen'}</span>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              className="btn-exit"
              onClick={handleLogout}
              title="Sign out of AirSense"
            >
              <IconLogOut size={14} />
            </button>
          </div>
        </header>

        {/* OVERVIEW DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content-grid">
            {error && <div className="telemetry-error-banner">{error}</div>}

            {/* HERO ROW: 2 Cards */}
            <section className="dashboard-hero-row">
              {/* Left Hero Card: Live AQI & Animated City Diorama */}
              <div className="hero-card-left">
                <div className="hero-data-col">
                  <div className="badge-live-aqi">
                    <span>LIVE AQI</span>
                  </div>

                  <div className="hero-aqi-number">
                    {loading ? '...' : animatedAqi}
                  </div>

                  <div className="hero-status-pill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#216239" strokeWidth="2.2">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                    </svg>
                    <span>{advisory.category}</span>
                  </div>

                  <div className="hero-timestamp">
                    Updated {observedTimeStr}
                  </div>
                </div>

                <div className="hero-diorama-container">
                  <AnimatedCityDiorama className="hero-city-video" />
                </div>
              </div>

              {/* Right Hero Card: Air Quality Status Card with vertical separators */}
              <div className="hero-card-right">
                <div className="advisory-top-row">
                  <div className="advisory-circle-icon">
                    <IconLeafOutline size={26} color="#255a36" />
                  </div>
                  <div className="advisory-text-group">
                    <h3 className="advisory-heading">{advisory.title}</h3>
                    <p className="advisory-subheading">{advisory.summary}</p>
                  </div>
                  <div className="advisory-chevron">
                    <IconChevronRight size={18} color="#7e9284" />
                  </div>
                </div>

                <div className="micro-weather-row">
                  <div className="weather-metric-item">
                    <IconThermometer size={19} color="#255a36" />
                    <span className="weather-metric-val">{tempVal}°C</span>
                  </div>

                  <div className="weather-metric-separator" />

                  <div className="weather-metric-item">
                    <IconDroplets size={19} color="#255a36" />
                    <span className="weather-metric-val">{humidityVal}%</span>
                  </div>

                  <div className="weather-metric-separator" />

                  <div className="weather-metric-item">
                    <IconWind size={19} color="#255a36" />
                    <span className="weather-metric-val">{windVal} km/h</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 7-DAY AIR QUALITY TREND SECTION (Taller & Spacious) */}
            <section className="dashboard-chart-card">
              <PollutionChart
                historyData={historyData}
                loading={historyLoading}
                overviewMode={true}
                onViewDetails={() => setActiveTab('history')}
              />
            </section>

            {/* BOTTOM 4 FEATURE / NAVIGATION CARDS */}
            <section className="dashboard-feature-grid">
              {/* Feature 1: Pollutants */}
              <div
                className="feature-card"
                onClick={() => setActiveTab('pollutants')}
                role="button"
                tabIndex={0}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon">
                    <IconWind size={24} color="#255a36" />
                  </div>
                  <IconChevronRight size={16} color="#8a9e90" />
                </div>
                <h3 className="feature-card-title">Pollutants</h3>
                <p className="feature-card-desc">PM₂.₅, PM₁₀, NO₂, SO₂, CO, O₃</p>
              </div>

              {/* Feature 2: 24-Hour Forecast */}
              <div
                className="feature-card"
                onClick={() => setActiveTab('predictions')}
                role="button"
                tabIndex={0}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon">
                    <IconCalendar size={24} color="#255a36" />
                  </div>
                  <IconChevronRight size={16} color="#8a9e90" />
                </div>
                <h3 className="feature-card-title">24-Hour Forecast</h3>
                <p className="feature-card-desc">Hourly air quality predictions</p>
              </div>

              {/* Feature 3: 7-Day Forecast */}
              <div
                className="feature-card"
                onClick={() => setActiveTab('best-time')}
                role="button"
                tabIndex={0}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon">
                    <IconSunCloud size={24} color="#255a36" />
                  </div>
                  <IconChevronRight size={16} color="#8a9e90" />
                </div>
                <h3 className="feature-card-title">7-Day Forecast</h3>
                <p className="feature-card-desc">Daily AQI outlook</p>
              </div>

              {/* Feature 4: Smart Alerts */}
              <div
                className="feature-card"
                onClick={() => setActiveTab('alerts')}
                role="button"
                tabIndex={0}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon">
                    <IconBell size={24} color="#255a36" />
                  </div>
                  <IconChevronRight size={16} color="#8a9e90" />
                </div>
                <h3 className="feature-card-title">Smart Alerts</h3>
                <p className="feature-card-desc">AQI threshold notifications</p>
              </div>
            </section>
          </div>
        )}

        {/* SUB-VIEW: POLLUTANTS BREAKDOWN */}
        {activeTab === 'pollutants' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <h2 className="section-heading">Criteria Pollutants Telemetry</h2>
                <p className="section-subheading">
                  Atmospheric mass concentrations vs. standard exposure ceilings
                </p>
              </div>
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
        )}

        {/* SUB-VIEW: DETAILED 7-DAY TRENDS */}
        {activeTab === 'history' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <h2 className="section-heading">7-Day Historical Analytics</h2>
                <p className="section-subheading">
                  Comprehensive historical telemetry with daily summary and hourly breakdown
                </p>
              </div>
            </div>

            <div className="subview-chart-box">
              <PollutionChart historyData={historyData} loading={historyLoading} overviewMode={false} />
            </div>
          </section>
        )}

        {/* SUB-VIEW: 24-HOUR FORECAST */}
        {activeTab === 'predictions' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <div className="ai-badge-row">
                  <IconSparkles size={16} color="#255a36" />
                  <span className="ai-badge-text">AUTOREGRESSIVE RANDOM FOREST REGRESSOR</span>
                </div>
                <h2 className="section-heading">24-Hour Predictive Horizon</h2>
                <p className="section-subheading">
                  Sequential hourly PM₂.₅ forecasts with multi-lag time-series feature engineering
                </p>
              </div>
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
        )}

        {/* SUB-VIEW: BEST OUTDOOR TIME */}
        {activeTab === 'best-time' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <div className="ai-badge-row">
                  <IconSparkles size={16} color="#255a36" />
                  <span className="ai-badge-text">SMART OUTDOOR RECOMMENDATION</span>
                </div>
                <h2 className="section-heading">Best Time to Go Out</h2>
                <p className="section-subheading">
                  Find the lowest predicted PM₂.₅ window in the next 24 hours.
                </p>
              </div>
            </div>

            <div className="best-time-card">
              {bestTimeLoading ? (
                <div className="forecast-loading-state">
                  <IconLoader size={20} />
                  <span>Finding the best time window...</span>
                </div>
              ) : bestTimeError ? (
                <div className="forecast-empty-state">
                  <p>{bestTimeError}</p>
                </div>
              ) : bestTimeData?.status === 'available' && bestTimeData?.best_window ? (
                <div className="best-time-result">
                  <h3>
                    {new Date(bestTimeData.best_window.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' – '}
                    {new Date(bestTimeData.best_window.end).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </h3>

                  <p className="best-time-duration">
                    Recommended window · {bestTimeData.best_window.duration_hours} hours
                  </p>

                  <div className="best-time-metrics">
                    <div>
                      <span>Average PM₂.₅</span>
                      <strong>{Number(bestTimeData.best_window.average_pm25).toFixed(2)} µg/m³</strong>
                    </div>
                    <div>
                      <span>Maximum PM₂.₅</span>
                      <strong>{Number(bestTimeData.best_window.maximum_pm25).toFixed(2)} µg/m³</strong>
                    </div>
                  </div>

                  <div className="best-time-whatsapp-action">
                    {showPhonePrompt ? (
                      <div className="best-time-phone-row">
                        <input
                          type="tel"
                          placeholder="+919876543210 (E.164)"
                          value={bestTimeCustomPhone}
                          onChange={e => setBestTimeCustomPhone(e.target.value)}
                          className="best-time-phone-input"
                        />
                        <button
                          type="button"
                          className="btn-send-best-time-whatsapp"
                          onClick={handleSendBestTimeToWhatsapp}
                          disabled={bestTimeSendingWhatsapp || !bestTimeCustomPhone.trim()}
                        >
                          {bestTimeSendingWhatsapp ? <IconLoader size={14} /> : <span>Send Alert</span>}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-send-best-time-whatsapp"
                        onClick={handleSendBestTimeToWhatsapp}
                        disabled={bestTimeSendingWhatsapp}
                        title="Send this recommended cleanest outdoor window to your WhatsApp"
                      >
                        {bestTimeSendingWhatsapp ? (
                          <>
                            <IconLoader size={15} />
                            <span>Sending recommendation...</span>
                          </>
                        ) : (
                          <>
                            <span className="wa-btn-icon">💬</span>
                            <span>Send Best Window to WhatsApp</span>
                          </>
                        )}
                      </button>
                    )}

                    {bestTimeWhatsappStatus && (
                      <div className={`best-time-status-pill ${bestTimeWhatsappStatus.startsWith('✓') ? 'success' : 'notice'}`}>
                        {bestTimeWhatsappStatus}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="forecast-empty-state">
                  <p>No suitable forecast window is currently available. Try again when fresh observations arrive.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SUB-VIEW: ALERTS */}
        {activeTab === 'alerts' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <h2 className="section-heading">Smart Alerts & Notifications</h2>
                <p className="section-subheading">
                  Configure custom thresholds, WhatsApp alerts, and automated telemetry triggers
                </p>
              </div>
            </div>
            <Alerts locations={locations} selectedLocationId={selectedLocationId} />
          </section>
        )}

        {/* SUB-VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <section className="subview-container">
            <div className="subview-header">
              <button
                type="button"
                className="btn-back-overview"
                onClick={() => setActiveTab('dashboard')}
              >
                ← Back to Overview
              </button>
              <div>
                <h2 className="section-heading">Environmental OS Settings</h2>
                <p className="section-subheading">
                  System preferences, telemetry provider configuration, and profile
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-item">
                <div>
                  <h4>Logged in Citizen</h4>
                  <p>{authData.user?.email || 'citizen@airsense.org'}</p>
                </div>
                <button type="button" className="btn-logout-settings" onClick={handleLogout}>
                  Log Out
                </button>
              </div>
              <div className="settings-divider" />
              <div className="settings-item">
                <div>
                  <h4>Atmospheric Standards</h4>
                  <p>CPCB NAQI (India) & WHO Exposure Ceilings</p>
                </div>
                <span className="settings-badge">Active</span>
              </div>
              <div className="settings-divider" />
              <div className="settings-item">
                <div>
                  <h4>Primary Telemetry Pipeline</h4>
                  <p>Open-Meteo Atmospheric Models + EU Copernicus CAMS</p>
                </div>
                <span className="settings-badge">Connected</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
