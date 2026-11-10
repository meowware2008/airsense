
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

function AQIGauge({ value = null }) {
  const hasValue = Number.isFinite(value) && value >= 0 && value <= 500

  const data = {
    datasets: [
      {
        data: hasValue ? [value, 500 - value] : [1, 499],
        backgroundColor: hasValue
          ? ['#25b987', '#e8edf2']
          : ['#cbd5e1', '#e8edf2'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
        cutout: '78%',
      },
    ],
  }

  return (
    <div style={{ width: '220px', margin: 'auto', position: 'relative' }}>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            tooltip: { enabled: hasValue },
          },
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <h2 style={{ fontSize: '32px', margin: 0, color: '#172b40' }}>
          {hasValue ? value : '--'}
        </h2>
        <p style={{ color: '#718293', fontSize: '13px' }}>
          {hasValue ? 'AQI' : 'Awaiting data'}
        </p>
      </div>
    </div>
  )
}

export default AQIGauge
