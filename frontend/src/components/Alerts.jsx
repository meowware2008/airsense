
import { useEffect, useState } from 'react'
import {
  getAlerts,
  createAlert,
  deleteAlert,
  getNotifications,
  markNotificationRead,
  getMe,
  saveWhatsappNumber,
  testWhatsappDispatch,
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
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState('')
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [alertLocationId, setAlertLocationId] = useState(selectedLocationId || '1')
  const [deletingId, setDeletingId] = useState(null)
  const [markingId, setMarkingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [testingWhatsapp, setTestingWhatsapp] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testCustomMessage, setTestCustomMessage] = useState('🌿 AirSense Alert: Air Quality is Satisfactory (AQI 87).')
  const [testContentSid, setTestContentSid] = useState('HXb131895de71a093156d1062e878de57c')
  const [showAdvancedTest, setShowAdvancedTest] = useState(true)

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
        try {
          const me = await getMe()
          if (!ignore) {
            setWhatsappNumber(me.user?.whatsapp_number || '')
            setSavedWhatsappNumber(me.user?.whatsapp_number || '')
          }
        } catch {
          // profile is optional for rendering the page
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

  async function handleSaveWhatsapp() {
    setError('')
    setMessage('')
    try {
      const data = await saveWhatsappNumber(whatsappNumber.trim())
      const saved = data.user?.whatsapp_number || ''
      setSavedWhatsappNumber(saved)
      setWhatsappNumber(saved)
      if (!saved) setWhatsappEnabled(false)
      setMessage(saved ? 'WhatsApp number saved!' : 'WhatsApp number removed.')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleTestWhatsapp() {
    setError('')
    setMessage('')
    setTestingWhatsapp(true)
    setTestResult(null)
    try {
      const target = whatsappNumber.trim() || savedWhatsappNumber || '+919494202261'
      const res = await testWhatsappDispatch(
        target,
        testCustomMessage.trim() || null,
        testContentSid.trim() || null
      )
      setTestResult(res)
      if (res.success) {
        setMessage(`✓ Test WhatsApp dispatched successfully! (Twilio SID: ${res.message_sid})`)
      } else {
        setError(`⚠️ Dispatch failed (Code ${res.error_code || res.status_code || 'error'}): ${res.error_message}`)
      }
    } catch (err) {
      setError(`Dispatch error: ${err.message}`)
      setTestResult({
        success: false,
        status_code: 500,
        error_message: err.message,
        diagnostic_advice: 'Ensure backend server is running and Twilio credentials are valid in environment.',
      })
    } finally {
      setTestingWhatsapp(false)
    }
  }

  async function handleCreateAlert(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await createAlert(alertLocationId, threshold, whatsappEnabled)
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

          <div className="alert-field-group">
            <label htmlFor="alert-whatsapp">WhatsApp Number</label>
            <input
              id="alert-whatsapp"
              type="tel"
              placeholder="+919876543210"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              className="alert-input"
            />
            <button
              type="button"
              className="create-alert-btn"
              onClick={handleSaveWhatsapp}
              disabled={whatsappNumber.trim() === savedWhatsappNumber}
            >
              Save Number
            </button>
          </div>

          <div className="alert-field-group">
            <label htmlFor="alert-whatsapp-enabled">
              <input
                id="alert-whatsapp-enabled"
                type="checkbox"
                checked={whatsappEnabled}
                disabled={!savedWhatsappNumber}
                onChange={e => setWhatsappEnabled(e.target.checked)}
              />{' '}
              Also alert me on WhatsApp when air quality is poor
            </label>
          </div>

          <button type="submit" className="create-alert-btn">Create Alert</button>
        </form>

        <p className="alerts-note">
          You'll receive an alert when the AQI reaches your configured threshold.
        </p>
      </div>

      {error && <p className="alerts-error">{error}</p>}
      {message && <p className="alerts-success">{message}</p>}

      {/* WhatsApp Diagnostic & Live Testing Panel */}
      <div className="alerts-panel whatsapp-test-panel">
        <div className="test-panel-header">
          <div className="test-header-text">
            <div className="test-badge-row">
              <span className="test-badge">DIAGNOSTIC TEST</span>
              <span className="test-channel-badge">Twilio WhatsApp Sandbox</span>
            </div>
            <h3>🧪 Manual WhatsApp Connection Test</h3>
            <p>
              Send an instant diagnostic test message to verify outbound delivery, sender authorization, and 24-hr session status.
            </p>
          </div>
          <button
            type="button"
            className="btn-send-test-whatsapp"
            onClick={handleTestWhatsapp}
            disabled={testingWhatsapp}
          >
            {testingWhatsapp ? (
              <>
                <IconLoader size={16} />
                <span>Testing Dispatch...</span>
              </>
            ) : (
              <>
                <span className="wa-btn-icon">💬</span>
                <span>Send Test WhatsApp Message</span>
              </>
            )}
          </button>
        </div>

        {/* Advanced test options toggle */}
        <div className="test-options-toggle">
          <button
            type="button"
            className="btn-link-toggle"
            onClick={() => setShowAdvancedTest(!showAdvancedTest)}
          >
            {showAdvancedTest ? 'Hide Advanced Options ▲' : 'Show Advanced / Content Template Options ▼'}
          </button>
        </div>

        {showAdvancedTest && (
          <div className="test-advanced-box">
            <div className="test-input-group">
              <label htmlFor="test-content-sid">Twilio Content Template SID (Optional)</label>
              <input
                id="test-content-sid"
                type="text"
                placeholder="e.g. HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={testContentSid}
                onChange={e => setTestContentSid(e.target.value)}
                className="test-input"
              />
              <span className="test-hint">Required for Twilio Trial outbound without an active WhatsApp reply session.</span>
            </div>
            <div className="test-input-group">
              <label htmlFor="test-custom-msg">Custom Message Text (Optional)</label>
              <input
                id="test-custom-msg"
                type="text"
                placeholder="Default: AirSense Test Ping: WhatsApp alert channel connection verified! 🌿"
                value={testCustomMessage}
                onChange={e => setTestCustomMessage(e.target.value)}
                className="test-input"
              />
            </div>
          </div>
        )}

        {/* Live Diagnostics Card when test is triggered */}
        {testResult && (
          <div className={`diagnostic-result-card ${testResult.success ? 'success' : 'failed'}`}>
            <div className="diag-header">
              <span className="diag-status-pill">
                {testResult.success ? '✓ SUCCESS: 200 OK' : `⚠️ FAILED: HTTP ${testResult.status_code || 400}`}
              </span>
              {testResult.message_sid && (
                <span className="diag-sid">Twilio SID: {testResult.message_sid}</span>
              )}
            </div>

            <div className="diag-grid">
              <div>
                <span className="diag-label">Sender (From):</span>
                <code>{testResult.from_number || 'whatsapp:+17372508034'}</code>
              </div>
              <div>
                <span className="diag-label">Recipient (To):</span>
                <code>{testResult.to_number || whatsappNumber || '+919494202261'}</code>
              </div>
              {testResult.error_code && (
                <div>
                  <span className="diag-label">Twilio Error Code:</span>
                  <code className="diag-err-code">{testResult.error_code}</code>
                </div>
              )}
              {testResult.error_message && (
                <div>
                  <span className="diag-label">Twilio Response:</span>
                  <span className="diag-err-msg">{testResult.error_message}</span>
                </div>
              )}
            </div>

            {testResult.diagnostic_advice && (
              <div className="diag-advice-box">
                <strong>Recommended Action:</strong>
                <p>{testResult.diagnostic_advice}</p>
              </div>
            )}
          </div>
        )}
      </div>

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
                  {alert.whatsapp_enabled ? ' · WhatsApp on' : ''}
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
