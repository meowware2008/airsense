import { useEffect, useState } from 'react'
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  testTriggerAlert,
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
  const [togglingAlertId, setTogglingAlertId] = useState(null)
  const [testingAlertId, setTestingAlertId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [prevSelectedId, setPrevSelectedId] = useState(selectedLocationId)
  if (selectedLocationId !== prevSelectedId) {
    setPrevSelectedId(selectedLocationId)
    setAlertLocationId(selectedLocationId)
  }

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
    let ignore = false
    async function fetchInitialAlerts() {
      try {
        const [alertData, notificationData] = await Promise.all([
          getAlerts(),
          getNotifications(),
        ])
        if (!ignore) {
          setAlerts(alertData.alerts || [])
          setNotifications(notificationData.notifications || [])
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    fetchInitialAlerts()
    return () => {
      ignore = true
    }
  }, [])

  async function handleCreateAlert(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await createAlert(alertLocationId, threshold)
      setMessage('Alert rule created successfully!')
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

  async function handleToggleAlert(alertId, currentEnabled) {
    setError('')
    setMessage('')
    setTogglingAlertId(alertId)
    try {
      await updateAlert(alertId, { enabled: !currentEnabled })
      setMessage(`Alert ${!currentEnabled ? 'enabled' : 'disabled'}!`)
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setTogglingAlertId(null)
    }
  }

  async function handleTestAlert(alertId) {
    setError('')
    setMessage('')
    setTestingAlertId(alertId)
    try {
      const res = await testTriggerAlert(alertId)
      setMessage(`✅ ${res.message}`)
      await loadAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setTestingAlertId(null)
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
      <p>Configure automated in-app alerts when air quality crosses your chosen AQI threshold.</p>

      <div className="alerts-panel create-alert-panel">
        <div className="panel-header-simple">
          <h3>Create a New Alert</h3>
          <p className="panel-subtitle">
            Set an automated threshold to monitor ambient air pollution and receive in-app notifications.
          </p>
        </div>

        <form onSubmit={handleCreateAlert} className="create-alert-form">
          <div className="form-grid-two">
            <div className="form-group">
              <label htmlFor="alert-city">Target City</label>
              <select
                id="alert-city"
                value={alertLocationId}
                onChange={e => setAlertLocationId(e.target.value)}
                className="form-control form-select"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.region ? ` (${loc.region})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="alert-threshold">AQI Threshold</label>
              <div className="input-group-unit">
                <input
                  id="alert-threshold"
                  type="number"
                  min="1"
                  max="500"
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  className="form-control"
                  placeholder="100"
                  required
                />
                <span className="unit-label">AQI</span>
              </div>
            </div>
          </div>

          <div className="form-action-bar">
            <button type="submit" className="btn-create-alert-submit">
              <IconBell size={16} />
              <span>Create Alert</span>
            </button>
          </div>
        </form>

        <div className="form-info-note">
          <IconAlertTriangle size={15} color="#059669" />
          <span>Alerts trigger automatically during hourly telemetry ingestion when observed AQI exceeds your threshold.</span>
        </div>
      </div>

      {error && (
        <div className="alert-feedback-banner error">
          <IconAlertTriangle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="alert-feedback-banner success">
          <IconCheck size={18} color="#16a34a" />
          <span>{message}</span>
        </div>
      )}

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
                  className={`btn-toggle-status ${alert.enabled ? 'turn-off' : 'turn-on'}`}
                  onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                  disabled={togglingAlertId === alert.id}
                  title={alert.enabled ? 'Disable this alert rule' : 'Enable this alert rule'}
                >
                  {togglingAlertId === alert.id ? 'Updating...' : (alert.enabled ? 'Disable' : 'Enable')}
                </button>

                <button
                  type="button"
                  className="btn-test-rule"
                  onClick={() => handleTestAlert(alert.id)}
                  disabled={testingAlertId === alert.id}
                  title="Test-trigger this alert rule now"
                >
                  {testingAlertId === alert.id ? (
                    <>
                      <IconLoader size={13} />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Test Alert</span>
                    </>
                  )}
                </button>

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
          <h3>Notifications Inbox</h3>
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
                    <span>{notification.location?.name ? `${notification.location.name} Air Quality Alert` : 'Air Quality Alert'}</span>
                  </strong>
                  <span className={`status-pill ${notification.status}`}>
                    {notification.status}
                  </span>
                </div>
                <p className="notif-message-text">{notification.message}</p>
                <small className="alert-meta">
                  {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
                </small>
              </div>

              <div className="alert-actions">
                {notification.status === 'unread' && (
                  <button
                    type="button"
                    className="btn-mark-read"
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={markingId === notification.id}
                    title="Mark this notification as read"
                  >
                    {markingId === notification.id ? (
                      <>
                        <IconLoader size={13} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <IconCheck size={13} />
                        <span>Mark Read</span>
                      </>
                    )}
                  </button>
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
