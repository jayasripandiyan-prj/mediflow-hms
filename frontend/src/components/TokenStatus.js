import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function TokenStatus() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchStatus();
  const interval = setInterval(fetchStatus, 30000);
  return () => clearInterval(interval);
}, [token]);


  useEffect(() => {
    if (status) {
      const targetProgress = ((status.position - 1) / 10) * 100;
      setProgress(Math.min(100, targetProgress));
    }
  }, [status]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/queue/${token}`);
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="token-loading">
        <div className="spinner"></div>
        <p>Fetching your queue status...</p>
      </div>
    );
  }

  if (!status || status.error) {
    return (
      <div className="token-error">
        <div className="error-icon">❌</div>
        <h3>Token Not Found</h3>
        <p>Please check your token number and try again</p>
        <button onClick={() => navigate('/queue')}>View Live Queue</button>
        <button onClick={() => navigate('/patient-home')} style={{ marginLeft: '1rem', background: '#64748b' }}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="token-status-container">
      <div className="token-header">
        <div className="token-display">
          <span className="token-label">Your Token</span>
          <h1 className="token-number">{status.token}</h1>
        </div>
        <div className={`status-badge-large ${status.status}`}>
          {status.status === 'waiting' ? '⏳ In Queue' : 
           status.status === 'consulting' ? '👨‍⚕️ In Consultation' : 
           '✅ Completed'}
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card patient-info">
          <h3>Patient Information</h3>
          <div className="info-row">
            <span>Name:</span>
            <strong>{status.name}</strong>
          </div>
          <div className="info-row">
            <span>Doctor:</span>
            <strong>{status.doctor}</strong>
          </div>
          <div className="info-row">
            <span>Specialization:</span>
            <strong>{status.specialization}</strong>
          </div>
          <div className="info-row">
            <span>Registration Time:</span>
            <strong>{new Date(status.registration_time).toLocaleTimeString()}</strong>
          </div>
        </div>

        <div className="status-card queue-info">
          <h3>Queue Position</h3>
          <div className="position-display">
            <span className="current-position">{status.position}</span>
            <span className="total-positions">patients ahead</span>
          </div>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="wait-time-display">
            <span className="wait-label">Estimated Wait:</span>
            <span className="wait-value">{status.wait_time} minutes</span>
          </div>

          {status.position <= 2 && (
            <div className="approaching-alert">
              🔔 Your turn is approaching! Please be ready.
            </div>
          )}
        </div>
      </div>

      <div className="queue-preview-section">
        <h3>Current Queue</h3>
        <div className="queue-preview-list">
          {[1,2,3,4,5].map(pos => (
            <div 
              key={pos} 
              className={`preview-item ${pos === status.position ? 'current' : ''}`}
            >
              <span className="preview-position">{pos}</span>
              <span className="preview-token">
                {pos === status.position ? status.token : `Patient ${pos}`}
              </span>
              {pos === 1 && <span className="serving-badge">Now Serving</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="token-actions">
        <button 
          className="action-btn primary"
          onClick={() => window.open(`sms:+1234567890?body=I%20am%20token%20${status.token}%20and%20I%20am%20running%20late`)}
        >
          📱 Notify if Running Late
        </button>
        <button 
          className="action-btn secondary"
          onClick={() => navigate('/queue')}
        >
          👥 View Full Queue
        </button>
        <button 
          className="action-btn secondary"
          onClick={() => navigate('/patient-home')}
          style={{ background: '#64748b' }}
        >
          🏠 Back to Home
        </button>
      </div>

      <div className="timeline">
        <h3>Your Estimated Timeline</h3>
        <div className="timeline-steps">
          <div className="timeline-step completed">
            <div className="step-icon">✓</div>
            <div className="step-content">
              <h4>Registration</h4>
              <p>{new Date(status.registration_time).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className={`timeline-step ${status.status === 'waiting' ? 'active' : ''}`}>
            <div className="step-icon">⏳</div>
            <div className="step-content">
              <h4>Waiting in Queue</h4>
              <p>Position: {status.position}</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-icon">👨‍⚕️</div>
            <div className="step-content">
              <h4>Consultation</h4>
              <p>Est. {new Date(Date.now() + status.wait_time*60000).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="timeline-step">
            <div className="step-icon">✅</div>
            <div className="step-content">
              <h4>Complete</h4>
              <p>Est. {new Date(Date.now() + (status.wait_time + 15)*60000).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenStatus;