import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import {
  IconCalendar,
  IconClock,
  IconBarChart,
  IconAlertTriangle,
  IconLeaf,
} from './Icons'
import './PollutionChart.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function groupHistoryByDate(series) {
  if (!series || !Array.isArray(series) || series.length === 0) return []

  const groups = new Map()

  series.forEach(item => {
    if (!item.timestamp) return
    const dateKey = item.timestamp.split('T')[0]

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        aqiList: [],
        pm25List: [],
        pm10List: [],
      })
    }

    const g = groups.get(dateKey)
    if (typeof item.aqi === 'number' && !isNaN(item.aqi)) g.aqiList.push(item.aqi)
    if (typeof item.pm25 === 'number' && !isNaN(item.pm25)) g.pm25List.push(item.pm25)
    if (typeof item.pm10 === 'number' && !isNaN(item.pm10)) g.pm10List.push(item.pm10)
  })

  const sortedKeys = Array.from(groups.keys()).sort()
  const todayKey = new Date().toISOString().split('T')[0]

  return sortedKeys.map(dateKey => {
    const g = groups.get(dateKey)
    const [y, m, d] = dateKey.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)

    const avgAqi = g.aqiList.length
      ? Math.round(g.aqiList.reduce((a, b) => a + b, 0) / g.aqiList.length)
      : 0
    const maxAqi = g.aqiList.length ? Math.max(...g.aqiList) : 0
    const minAqi = g.aqiList.length ? Math.min(...g.aqiList) : 0
    const avgPm25 = g.pm25List.length
      ? Math.round((g.pm25List.reduce((a, b) => a + b, 0) / g.pm25List.length) * 10) / 10
      : null
    const avgPm10 = g.pm10List.length
      ? Math.round((g.pm10List.reduce((a, b) => a + b, 0) / g.pm10List.length) * 10) / 10
      : null

    const isToday = dateKey === todayKey
    const dayLabel = dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const label = isToday ? `Today (${dayLabel})` : dayLabel
    const fullDate = dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return {
      dateKey,
      label,
      fullDate,
      avgAqi,
      maxAqi,
      minAqi,
      avgPm25,
      avgPm10,
      count: g.aqiList.length,
    }
  })
}

function PollutionChart({ historyData = [], loading = false }) {
  const [viewMode, setViewMode] = useState('daily') // 'daily' or 'hourly'

  const dailyData = useMemo(() => {
    return groupHistoryByDate(historyData)
  }, [historyData])

  // Summary statistics for the 7-day window
  const stats = useMemo(() => {
    if (dailyData.length === 0) return null

    const allAvgs = dailyData.map(d => d.avgAqi)
    const overallAvg = Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length)

    let peakDay = dailyData[0]
    let cleanestDay = dailyData[0]

    dailyData.forEach(d => {
      if (d.avgAqi > peakDay.avgAqi) peakDay = d
      if (d.avgAqi < cleanestDay.avgAqi) cleanestDay = d
    })

    return {
      overallAvg,
      peakDay,
      cleanestDay,
    }
  }, [dailyData])

  if (loading) {
    return <div className="chart-loading">Loading historical air quality data...</div>
  }

  if (!historyData || historyData.length === 0) {
    return <div className="chart-empty">No historical air quality records found for this location.</div>
  }

  // Chart configuration for Daily Categorized view
  const chartData = viewMode === 'daily'
    ? {
        labels: dailyData.map(item => item.label),
        datasets: [
          {
            label: 'Daily Average AQI',
            data: dailyData.map(item => item.avgAqi),
            borderColor: '#258b70',
            backgroundColor: 'rgba(37, 139, 112, 0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#258b70',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
          {
            label: 'Daily Peak AQI',
            data: dailyData.map(item => item.maxAqi),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      }
    : {
        labels: historyData.map(item => {
          const d = new Date(item.timestamp)
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }),
        datasets: [
          {
            label: 'Hourly AQI',
            data: historyData.map(item => item.aqi),
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54, 162, 235, 0.12)',
            fill: true,
            tension: 0.25,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
        ],
      }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 15,
          font: {
            family: "'Segoe UI', sans-serif",
            size: 12,
            weight: 600,
          },
          color: '#334155',
        },
      },
      tooltip: {
        backgroundColor: '#10283d',
        titleColor: '#ffffff',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (items) => {
            if (viewMode === 'daily') {
              const idx = items[0]?.dataIndex
              return dailyData[idx]?.fullDate || items[0]?.label
            }
            const idx = items[0]?.dataIndex
            const raw = historyData[idx]
            return raw ? new Date(raw.timestamp).toLocaleString() : (items[0]?.label || '')
          },
          afterBody: (items) => {
            if (viewMode === 'daily') {
              const idx = items[0]?.dataIndex
              const item = dailyData[idx]
              if (!item) return []
              return [
                `Min AQI: ${item.minAqi}`,
                `Avg PM2.5: ${item.avgPm25 ?? '--'} µg/m³`,
                `Avg PM10: ${item.avgPm10 ?? '--'} µg/m³`,
                `Recorded: ${item.count} hours`,
              ]
            }
            return []
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'CPCB AQI',
          color: '#718293',
          font: { size: 12, weight: 600 },
        },
        grid: {
          color: 'rgba(23, 43, 64, 0.06)',
        },
        ticks: {
          font: { size: 12 },
          color: '#64748b',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 12 },
          color: '#475569',
          maxRotation: 0,
          autoSkip: viewMode === 'hourly',
          maxTicksLimit: viewMode === 'hourly' ? 14 : undefined,
        },
      },
    },
  }

  return (
    <div className="pollution-chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          <h2>7-Day Air Quality Trend</h2>
          <p className="chart-subtitle">
            {viewMode === 'daily'
              ? 'Categorised daily summary (one piece per day)'
              : 'Detailed hourly breakdown over past 7 days'}
          </p>
        </div>

        <div className="chart-controls">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
            title="Categorise history into one piece per day"
          >
            <IconCalendar size={14} />
            <span>Daily Summary</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'hourly' ? 'active' : ''}`}
            onClick={() => setViewMode('hourly')}
            title="View hourly readings"
          >
            <IconClock size={14} />
            <span>Hourly</span>
          </button>
        </div>
      </div>

      {stats && viewMode === 'daily' && (
        <div className="chart-stats-summary">
          <div className="chart-stat-chip">
            <span className="chip-label">
              <IconBarChart size={14} color="#64748b" />
              <span>7-Day Average:</span>
            </span>
            <strong>{stats.overallAvg} AQI</strong>
          </div>
          <div className="chart-stat-chip peak">
            <span className="chip-label">
              <IconAlertTriangle size={14} color="#d97706" />
              <span>Peak Day:</span>
            </span>
            <strong>{stats.peakDay.label} ({stats.peakDay.maxAqi} AQI)</strong>
          </div>
          <div className="chart-stat-chip clean">
            <span className="chip-label">
              <IconLeaf size={14} color="#059669" />
              <span>Cleanest Day:</span>
            </span>
            <strong>{stats.cleanestDay.label} ({stats.cleanestDay.avgAqi} AQI)</strong>
          </div>
        </div>
      )}

      <div className="chart-container-wrapper">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}

export default PollutionChart
