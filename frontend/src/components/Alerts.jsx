
import { useEffect, useState } from 'react'
import {
  getAlerts,
  createAlert,
  deleteAlert,
  getNotifications,
  markNotificationRead,
} from '../api'
import './Alerts.css'

function Alerts({ locations = [], selectedLocationId }) {
  const [alerts, setAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [threshold, setThreshold] = useState('100')
  const [alertLocationId, setAlertLocationId] = useState(selectedLocationId || '1')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (selectedLocationId) {
      setAlertLocationId(selectedLocationId)
    }
  }, [selectedLocationId])

  async function loadAlerts() {
    setLoading(true)
    setError('')

    try {
      const [alertData, notificationData] = await Promise.all([
        getAlerts(),
        getNotifications(),
      ])

      setAlerts(alertData.alerts || [])
      setNotifications(notificationData.notifications || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  async function handleCreateAlert(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await createAlert(alertLocationId, threshold)
      setMessage('Alert created successfully!')
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteAlert(id) {
    try {
      await deleteAlert(id)
      setMessage('Alert deleted successfully!')
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id)
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="alerts-container" id="alerts">
      <h2>🔔 Air Quality Alerts</h2>
      <p>Get notified when air quality crosses your chosen AQI threshold.</p>

      <div className="alerts-panel">
        <h3>Create a New Alert</h3>

        <form onSubmit={handleCreateAlert} className="create-alert-form">
          <div className="alert-field-group">
            <label htmlFor="alert-city">Target City</label>
            <select
              id="alert-city"
              value={alertLocationId}
              onChange={e => setAlertLocationId(e.target.value)}
              className="alert-select"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}{loc.region ? ` (${loc.region})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="alert-field-group">
            <label htmlFor="alert-threshold">AQI Threshold</label>
            <input
              id="alert-threshold"
              type="number"
              min="1"
              max="500"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="alert-input"
              required
            />
          </div>

          <button type="submit" className="create-alert-btn">Create Alert</button>
        </form>

        <p className="alerts-note">
          You'll receive an alert when the AQI reaches your configured threshold.
        </p>
      </div>

      {error && <p className="alerts-error">{error}</p>}
      {message && <p className="alerts-success">{message}</p>}

      <div className="alerts-panel">
        <h3>Your Alert Preferences</h3>

        {loading ? (
          <p>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p>No alerts created yet.</p>
        ) : (
          alerts.map(alert => (
            <div className="alert-item" key={alert.id}>
              <div>
                <strong>
                  {alert.location?.name || 'Location'}
                </strong>
                <p>AQI Threshold: {alert.threshold_value}</p>
                <small>{alert.enabled ? 'Enabled' : 'Disabled'}</small>
              </div>

              <button
                className="delete-alert"
                onClick={() => handleDeleteAlert(alert.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div className="alerts-panel">
        <h3>Notifications</h3>

        {loading ? (
          <p>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          notifications.map(notification => (
            <div className="alert-item" key={notification.id}>
              <div>
                <strong>{notification.title || 'Air Quality Notification'}</strong>
                <p>
                  {notification.message || 'You have a new notification.'}
                </p>
                <small>Status: {notification.status}</small>
              </div>

              {notification.status !== 'read' && (
                <button
                  onClick={() => handleMarkRead(notification.id)}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Alerts
