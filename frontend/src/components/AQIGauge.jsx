import { useMemo } from 'react'
import { useCountUp } from '../utils/useCountUp'
import './AQIGauge.css'

function getAQIColor(aqi) {
  if (aqi == null) return { primary: '#94a3b8', gradient: ['#64748b', '#475569'], label: 'Unavailable', bg: 'rgba(148, 163, 184, 0.1)' }
  if (aqi <= 50) return { primary: '#10b981', gradient: ['#34d399', '#059669'], label: 'Good', bg: 'rgba(16, 185, 129, 0.15)' }
  if (aqi <= 100) return { primary: '#14b8a6', gradient: ['#2dd4bf', '#0d9488'], label: 'Satisfactory', bg: 'rgba(20, 184, 166, 0.15)' }
  if (aqi <= 200) return { primary: '#f59e0b', gradient: ['#fbbf24', '#d97706'], label: 'Moderate', bg: 'rgba(245, 158, 11, 0.15)' }
  if (aqi <= 300) return { primary: '#f97316', gradient: ['#fb923c', '#ea580c'], label: 'Poor', bg: 'rgba(249, 115, 22, 0.15)' }
  if (aqi <= 400) return { primary: '#ef4444', gradient: ['#f87171', '#dc2626'], label: 'Very Poor', bg: 'rgba(239, 68, 68, 0.18)' }
  return { primary: '#a855f7', gradient: ['#c084fc', '#9333ea'], label: 'Severe', bg: 'rgba(168, 85, 247, 0.18)' }
}

function AQIGauge({ value = null, standard = 'CPCB NAQI' }) {
  const hasValue = Number.isFinite(value) && value >= 0
  const clampedValue = hasValue ? Math.min(Math.max(value, 0), 500) : 0
  const animatedValue = useCountUp(hasValue ? clampedValue : null, 1200)
  const colorMeta = useMemo(() => getAQIColor(hasValue ? clampedValue : null), [hasValue, clampedValue])

  // Semi-circle arc geometry
  const radius = 80
  const strokeWidth = 12
  const arcLength = Math.PI * radius
  const fillRatio = clampedValue / 500
  const strokeDashoffset = arcLength - (arcLength * fillRatio)

  return (
    <div className="aqi-minimal-gauge">
      <div className="gauge-ambient-glow" style={{ background: colorMeta.bg }} />
      
      <div className="gauge-svg-container">
        <svg viewBox="0 0 200 125" className="gauge-svg">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorMeta.gradient[0]} />
              <stop offset="100%" stopColor={colorMeta.gradient[1]} />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor={colorMeta.primary} floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          {hasValue && (
            <path
              d="M 20 110 A 80 80 0 0 1 180 110"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              filter="url(#gaugeGlow)"
              className="gauge-active-arc"
            />
          )}
        </svg>

        {/* Central Display */}
        <div className="gauge-center-content">
          <div className="gauge-value-row">
            <span className="gauge-numeric-value" style={{ color: colorMeta.primary }}>
              {hasValue ? animatedValue : '--'}
            </span>
          </div>
          <span className="gauge-unit-label">AQI • {standard}</span>
          <div className="gauge-status-badge" style={{ color: colorMeta.primary, backgroundColor: colorMeta.bg }}>
            <span className="status-dot" style={{ backgroundColor: colorMeta.primary }} />
            <span>{colorMeta.label}</span>
          </div>
        </div>
      </div>

      {/* Benchmark Scale Ticks */}
      <div className="gauge-scale-legend">
        <span>0 Good</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>500+ Severe</span>
      </div>
    </div>
  )
}

export default AQIGauge
