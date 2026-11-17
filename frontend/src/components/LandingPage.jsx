import { useMemo } from 'react'
import AtmosphericCanvas from './AtmosphericCanvas'
import { useCountUp } from '../utils/useCountUp'
import {
  IconWind,
  IconArrowRight,
  IconShieldCheck,
  IconMapPin,
  IconActivity,
  IconTrendingUp,
  IconBarChart,
  IconLayoutDashboard,
  IconUser,
} from './Icons'
import './LandingPage.css'

function getAQICategory(aqi) {
  if (aqi == null) return { label: 'Syncing', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
  if (aqi <= 50) return { label: 'Good', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
  if (aqi <= 100) return { label: 'Satisfactory', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' }
  if (aqi <= 200) return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
  if (aqi <= 300) return { label: 'Poor', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' }
  if (aqi <= 400) return { label: 'Very Poor', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)' }
  return { label: 'Severe Smog', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)' }
}

export default function LandingPage({
  onExplore,
  onOpenAuth,
  authData,
  locations = [],
  selectedLocationId,
  onSelectLocation,
  airData,
  loading,
}) {
  const currentLocation = useMemo(() => {
    return locations.find(l => String(l.id) === String(selectedLocationId)) || { name: 'Bengaluru', region: 'Karnataka' }
  }, [locations, selectedLocationId])

  const aqiValue = airData?.aqi_summary?.value ?? (loading ? null : 84)
  const animatedAqi = useCountUp(aqiValue, 1200)
  const aqiMeta = useMemo(() => getAQICategory(aqiValue), [aqiValue])

  const pm25Value = airData?.reading?.pm25 ?? (loading ? '--' : 32.4)
  const tempValue = airData?.reading?.temperature ?? 27.5
  const humidityValue = airData?.reading?.humidity ?? 52

  const observedTime = useMemo(() => {
    if (airData?.freshness?.observed_at) {
      return new Date(airData.freshness.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return 'Synchronized'
  }, [airData])

  return (
    <div className="landing-viewport">
      {/* 1. Atmospheric Canvas Background */}
      <AtmosphericCanvas intensity={1.1} showParticles={true} />

      {/* 2. Top Header Navigation */}
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-icon">
            <IconWind size={22} color="#00f2fe" />
          </div>
          <div className="landing-brand-text">
            <span className="brand-name">AirSense</span>
            <span className="brand-badge">ATMOSPHERIC OS</span>
          </div>
        </div>

        <div className="landing-status-indicator">
          <span className="live-pulse-dot" />
          <span className="live-status-text">Copernicus CAMS & Open-Meteo • Active</span>
        </div>

        <div className="landing-header-actions">
          {authData?.token ? (
            <button
              type="button"
              className="btn-header-account"
              onClick={() => onExplore('dashboard')}
            >
              <IconUser size={15} color="#00f2fe" />
              <span>{authData.user?.name || 'Dashboard'}</span>
              <IconArrowRight size={14} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-header-explore"
                onClick={() => onExplore('dashboard')}
              >
                Explore
              </button>
              <button
                type="button"
                className="btn-header-signin"
                onClick={onOpenAuth}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      {/* 3. Hero Center Section */}
      <main className="landing-hero-container">
        {/* Left Column: Bold Typography & CTAs */}
        <div className="landing-hero-content">
          <div className="landing-eyebrow-pill">
            <span className="pill-dot" />
            <span>ENVIRONMENTAL INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="landing-hero-headline">
            Understand the air <br className="break-desktop" />
            <span className="headline-gradient">you breathe.</span>
          </h1>

          <p className="landing-hero-subtext">
            Real-time air quality intelligence, pollution trends and predictive insights — all in one place.
          </p>

          <div className="landing-cta-group">
            <button
              type="button"
              className="btn-primary-explore"
              onClick={() => onExplore('dashboard')}
            >
              <span>Explore AirSense</span>
              <IconArrowRight size={17} />
            </button>

            {!authData?.token && (
              <button
                type="button"
                className="btn-secondary-signin"
                onClick={onOpenAuth}
              >
                Sign in
              </button>
            )}
          </div>

          <div className="landing-demo-hint">
            <IconShieldCheck size={14} color="#10b981" />
            <span>Instant Access: <strong>demo@airsense.org</strong> • <strong>demo12345</strong></span>
          </div>
        </div>

        {/* Right Column: Live Environmental Data Preview Card */}
        <div className="landing-preview-card-wrapper">
          <div className="landing-preview-card">
            <div className="preview-card-glow" style={{ background: aqiMeta.bg }} />

            <div className="preview-card-header">
              <div className="preview-station-select-group">
                <IconMapPin size={15} color="#00f2fe" />
                {locations.length > 0 ? (
                  <select
                    value={selectedLocationId}
                    onChange={e => onSelectLocation(e.target.value)}
                    className="preview-station-select"
                    aria-label="Select Monitoring Station"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.region ? `(${loc.region})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="preview-station-name">{currentLocation.name}</span>
                )}
              </div>

              <div className="preview-live-badge">
                <span className="live-dot-mini" />
                <span>LIVE TELEMETRY</span>
              </div>
            </div>

            {/* AQI Center Metric */}
            <div className="preview-aqi-block">
              <span className="preview-aqi-label">AIR QUALITY INDEX</span>
              <div className="preview-aqi-number-row">
                <span className="preview-aqi-num" style={{ color: aqiMeta.color }}>
                  {animatedAqi != null ? animatedAqi : '--'}
                </span>
                <span className="preview-aqi-std">CPCB NAQI</span>
              </div>
              <div
                className="preview-category-pill"
                style={{ color: aqiMeta.color, backgroundColor: aqiMeta.bg }}
              >
                <span className="cat-dot" style={{ backgroundColor: aqiMeta.color }} />
                <span>{aqiMeta.label}</span>
              </div>
            </div>

            {/* Micro Metrics Strip */}
            <div className="preview-metrics-grid">
              <div className="preview-metric-box">
                <span className="preview-metric-sub">Fine PM₂.₅</span>
                <span className="preview-metric-val">{pm25Value} <small>µg/m³</small></span>
              </div>
              <div className="preview-metric-box">
                <span className="preview-metric-sub">Temperature</span>
                <span className="preview-metric-val">{tempValue}°C</span>
              </div>
              <div className="preview-metric-box">
                <span className="preview-metric-sub">Humidity</span>
                <span className="preview-metric-val">{humidityValue}%</span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="preview-card-footer">
              <span className="preview-timestamp">Updated: {observedTime}</span>
              <button
                type="button"
                className="btn-preview-telemetry"
                onClick={() => onExplore('pollutants')}
              >
                View Pollutants &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Bottom Jeton Floating Navigation Pill Dock */}
      <nav className="landing-bottom-dock" aria-label="Quick Navigation">
        <button
          type="button"
          className="dock-item active"
          onClick={() => onExplore('dashboard')}
          title="Atmospheric Overview"
        >
          <IconLayoutDashboard size={17} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className="dock-item"
          onClick={() => onExplore('pollutants')}
          title="Criteria Pollutants Telemetry"
        >
          <IconBarChart size={17} />
          <span>Pollutants</span>
        </button>

        <button
          type="button"
          className="dock-item"
          onClick={() => onExplore('history')}
          title="7-Day Historical Analytics"
        >
          <IconActivity size={17} />
          <span>7-Day Trends</span>
        </button>

        <button
          type="button"
          className="dock-item"
          onClick={() => onExplore('predictions')}
          title="24h Machine Learning Forecast"
        >
          <IconTrendingUp size={17} />
          <span>24h Forecast</span>
        </button>
      </nav>
    </div>
  )
}
