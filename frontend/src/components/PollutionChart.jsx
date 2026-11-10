
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
)

function PollutionChart() {
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'PM2.5',
        data: [],
        borderColor: '#16a879',
        tension: 0.4,
      },
      {
        label: 'PM10',
        data: [],
        borderColor: '#e6a23c',
        tension: 0.4,
      },
    ],
  }

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Concentration (µg/m³)',
            },
          },
        },
      }}
    />
  )
}

export default PollutionChart
