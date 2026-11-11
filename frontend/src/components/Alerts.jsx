
import { useEffect, useState } from 'react'
import {
  getAlerts,
  createAlert,
  deleteAlert,
  getNotifications,
  markNotificationRead,
} from '../api'
import {
  IconBell,
  IconMapPin,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconLoader,
} from './Icons'
import './Alerts.css'

function Alerts({ locations = [], selectedLocationId }) {
  const [alerts, setAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [threshold, setThreshold] = useState('100')
  const [alertLocationId, setAlertLocationId] = useState(selectedLocationId || '1')
  const [deletingId, setDeletingId] = useState(null)
  const [markingId, setMarkingId] = useState(null)
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
    setError('')
    setMessage('')
    setDeletingId(id)
    try {
      await deleteAlert(id)
      setMessage('Alert deleted successfully!')
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMarkRead(id) {
    setError('')
    setMessage('')
    setMarkingId(id)
    try {
      await markNotificationRead(id)
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <div className="alerts-container" id="alerts">
      <h2 className="section-title">
        <IconBell size={22} color="#258b70" />
        <span>Air Quality Alerts</span>
      </h2>
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
        <div className="panel-header-row">
          <h3>Your Alert Preferences</h3>
          <span className="panel-count-badge">{alerts.length} Rules</span>
        </div>

        {loading ? (
          <p className="alerts-loading">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="alerts-empty">No alerts created yet. Configure a rule above to receive air quality alerts.</p>
        ) : (
          alerts.map(alert => (
            <div className="alert-item" key={alert.id}>
              <div className="alert-info">
                <div className="alert-title-row">
                  <strong className="alert-city-name">
                    <IconMapPin size={16} color="#258b70" />
                    <span>{alert.location?.name || 'Location'}</span>
                  </strong>
                  <span className={`status-pill ${alert.enabled ? 'enabled' : 'disabled'}`}>
                    {alert.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="alert-threshold-info">
                  AQI Threshold: <strong>{alert.threshold_value}</strong>
                </p>
                <small className="alert-meta">
                  {alert.created_at ? `Created on ${new Date(alert.created_at).toLocaleDateString()}` : ''}
                </small>
              </div>

              <div className="alert-actions">
                <button
                  type="button"
                  className="delete-alert-btn"
                  onClick={() => handleDeleteAlert(alert.id)}
                  disabled={deletingId === alert.id}
                  title="Delete this alert rule"
                >
                  {deletingId === alert.id ? (
                    <>
                      <IconLoader size={14} />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <IconTrash size={14} />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="alerts-panel">
        <div className="panel-header-row">
          <h3>Notifications</h3>
          <span className="panel-count-badge">
            {notifications.filter(n => n.status === 'unread').length} Unread
          </span>
        </div>

        {loading ? (
          <p className="alerts-loading">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="alerts-empty">No notifications yet. You will be alerted when AQI crosses your thresholds.</p>
        ) : (
          notifications.map(notification => (
            <div
              className={`alert-item notif-item ${notification.status === 'unread' ? 'unread-item' : ''}`}
              key={notification.id}
            >
              <div className="alert-info">
                <div className="alert-title-row">
                  <strong className="notif-title">
                    <IconAlertTriangle size={16} color="#d97706" />
                    <span>{notification.title || 'Air Quality Notification'}</span>
                  </strong>
                  <span className={`status-pill ${notification.status === 'unread' ? 'unread' : 'read'}`}>
                    {notification.status === 'unread' ? 'Unread' : 'Read'}
                  </span>
                </div>
                <p className="notif-message">
                  {notification.message || 'You have a new notification.'}
                </p>
                <small className="alert-meta">
                  {notification.sent_at ? new Date(notification.sent_at).toLocaleString() : ''}
                </small>
              </div>

              <div className="alert-actions">
                {notification.status !== 'read' ? (
                  <button
                    type="button"
                    className="mark-read-btn"
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={markingId === notification.id}
                    title="Mark this notification as read"
                  >
                    {markingId === notification.id ? (
                      <>
                        <IconLoader size={14} />
                        <span>Marking...</span>
                      </>
                    ) : (
                      <>
                        <IconCheck size={14} />
                        <span>Mark as Read</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="read-indicator" title="Notification already read">
                    <IconCheck size={13} color="#64748b" />
                    <span>Read</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Alerts
