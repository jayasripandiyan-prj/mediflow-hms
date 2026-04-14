import React, { useState, useEffect } from 'react';
import axios from 'axios';

function QueueDisplay({ queueData, doctors, socket }) {
  const [searchToken, setSearchToken] = useState('');
  const [patientStatus, setPatientStatus] = useState(null);
  const [liveQueue, setLiveQueue] = useState(queueData || []);
  const [liveDoctors, setLiveDoctors] = useState(doctors || []);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Listen for real-time updates
  useEffect(() => {
    console.log('QueueDisplay socket effect, socket exists:', !!socket);
    
    if (socket) {
      socket.on('connect', () => {
        console.log('✅ Socket connected in QueueDisplay');
        setConnectionStatus('connected');
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected in QueueDisplay');
        setConnectionStatus('disconnected');
      });

      socket.on('queue_update', (data) => {
        console.log('📊 QueueDisplay received update:', data);
        if (data.queue) {
          setLiveQueue(data.queue);
        }
        if (data.doctors) {
          setLiveDoctors(data.doctors);
        }
      });

      // Request initial data
      socket.emit('request_queue_update');
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('queue_update');
      }
    };
  }, [socket]);

  // Update when props change (fallback)
  useEffect(() => {
    console.log('QueueDisplay props update - queueData:', queueData);
    if (queueData && queueData.length > 0) {
      setLiveQueue(queueData);
    }
    if (doctors && doctors.length > 0) {
      setLiveDoctors(doctors);
    }
  }, [queueData, doctors]);

  // Manual fetch function
  const fetchQueueData = async () => {
    try {
      console.log('Manually fetching queue data...');
      const response = await axios.get('http://localhost:5000/api/queue/status');
      console.log('Manual fetch response:', response.data);
      setLiveQueue(response.data);
    } catch (error) {
      console.error('Manual fetch error:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchToken) return;

    try {
      const response = await fetch(`http://localhost:5000/api/queue/${searchToken}`);
      const data = await response.json();
      setPatientStatus(data);
    } catch (error) {
      console.error('Error fetching patient status:', error);
      alert('Error fetching patient status. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Live Queue Status</h2>
        <p style={styles.subtitle}>Real-time patient queue information</p>
        {/* Connection status indicator */}
        <div style={{ 
          marginTop: '0.5rem',
          padding: '0.25rem 1rem',
          background: connectionStatus === 'connected' ? '#d1fae5' : '#fee2e2',
          color: connectionStatus === 'connected' ? '#065f46' : '#991b1b',
          borderRadius: '20px',
          display: 'inline-block',
          fontSize: '0.9rem'
        }}>
          {connectionStatus === 'connected' ? '🟢 Live' : connectionStatus === 'disconnected' ? '🔴 Disconnected' : '🟡 Connecting...'}
        </div>
      </div>

      {/* Token Search */}
      <div style={styles.searchSection}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Enter your token number (e.g., D1-1234-JO)"
            value={searchToken}
            onChange={(e) => setSearchToken(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>
            Check Status
          </button>
        </form>
      </div>

      {/* Manual Refresh Button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={fetchQueueData}
          style={{
            padding: '0.75rem 2rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          🔄 Refresh Queue
        </button>
        <span style={{ color: '#64748b' }}>
          Patients in queue: {liveQueue.length}
        </span>
      </div>

      {/* Patient Status Result */}
      {patientStatus && !patientStatus.error && (
        <div style={styles.patientStatusCard}>
          <h3 style={styles.cardTitle}>Your Queue Status</h3>
          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <span style={styles.label}>Token:</span>
              <span style={{...styles.value, ...styles.tokenHighlight}}>{patientStatus.token}</span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.label}>Patient:</span>
              <span style={styles.value}>{patientStatus.name}</span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.label}>Doctor:</span>
              <span style={styles.value}>{patientStatus.doctor}</span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.label}>Position:</span>
              <span style={{...styles.value, ...styles.positionNumber}}>{patientStatus.position}</span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.label}>Wait Time:</span>
              <span style={styles.value}>{patientStatus.wait_time} minutes</span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.label}>Status:</span>
              <span style={{
                ...styles.statusBadge,
                ...styles[`status${patientStatus.status}`]
              }}>
                {patientStatus.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Status Overview */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Doctor Status</h3>
        <div style={styles.doctorGrid}>
          {liveDoctors.map(doctor => (
            <div key={doctor.id} style={{
              ...styles.doctorCard,
              ...styles[`doctorCard${doctor.status}`]
            }}>
              <div style={styles.doctorCardHeader}>
                <h4 style={styles.doctorName}>{doctor.name}</h4>
                <span style={styles.specialization}>{doctor.specialization}</span>
              </div>
              <div style={styles.doctorCardBody}>
                <div style={styles.statusIndicator}>
                  <span style={{
                    ...styles.statusDot,
                    ...styles[`statusDot${doctor.status}`]
                  }}></span>
                  <span style={styles.statusText}>{doctor.status}</span>
                </div>
                {doctor.current_patient && (
                  <div style={styles.currentPatient}>
                    <span>Current: <strong>{doctor.current_patient}</strong></span>
                  </div>
                )}
                <div style={styles.waitingCount}>
                  <span style={styles.count}>{doctor.waiting_count}</span>
                  <span style={styles.label}>patients waiting</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Queue Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Current Queue</h3>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Position</th>
                <th style={styles.th}>Token</th>
                <th style={styles.th}>Patient</th>
                <th style={styles.th}>Doctor</th>
                <th style={styles.th}>Wait Time</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveQueue.length > 0 ? (
                liveQueue.map((item, index) => (
                  <tr key={index} style={index === 0 ? styles.nextPatientRow : {}}>
                    <td style={styles.td}>
                      <span style={styles.positionBadge}>{item.position}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.tokenCode}>{item.token}</span>
                    </td>
                    <td style={styles.td}>{item.patient}</td>
                    <td style={styles.td}>{item.doctor}</td>
                    <td style={styles.td}>
                      <span style={styles.waitTimeBadge}>{item.wait_time} min</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        ...styles[`status${item.status}`]
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={styles.emptyQueue}>
                    No patients in queue
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estimated Wait Times Summary */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Estimated Wait Times by Department</h3>
        <div style={styles.summaryGrid}>
          {liveDoctors.map(doctor => (
            <div key={doctor.id} style={styles.summaryCard}>
              <h4 style={styles.deptName}>{doctor.specialization}</h4>
              <div style={styles.waitBar}>
                <div 
                  style={{
                    ...styles.waitBarFill,
                    width: `${Math.min(100, ((doctor.waiting_count * (doctor.avg_time || 15)) / 60) * 100)}%`,
                    backgroundColor: doctor.waiting_count > 5 ? '#ef4444' : '#10b981'
                  }}
                ></div>
              </div>
              <div style={styles.waitDetails}>
                <span>{doctor.waiting_count} patients</span>
                <span>~{doctor.waiting_count * (doctor.avg_time || 15)} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Styles for QueueDisplay
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
  },
  searchSection: {
    marginBottom: '2rem',
  },
  searchForm: {
    display: 'flex',
    gap: '1rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchInput: {
    flex: 1,
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchButton: {
    padding: '1rem 2rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  patientStatusCard: {
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    color: 'white',
    padding: '2rem',
    borderRadius: '16px',
    marginBottom: '2rem',
  },
  cardTitle: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  value: {
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  tokenHighlight: {
    fontSize: '1.5rem',
    fontFamily: 'monospace',
  },
  positionNumber: {
    fontSize: '2rem',
    color: '#fbbf24',
  },
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '1.5rem',
  },
  doctorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  doctorCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeft: '4px solid transparent',
  },
  doctorCardAvailable: {
    borderLeftColor: '#10b981',
  },
  doctorCardBusy: {
    borderLeftColor: '#ef4444',
  },
  doctorCardDelayed: {
    borderLeftColor: '#f59e0b',
  },
  doctorCardHeader: {
    marginBottom: '1rem',
  },
  doctorName: {
    fontSize: '1.2rem',
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  specialization: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  doctorCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusDotAvailable: {
    background: '#10b981',
    animation: 'pulse 2s infinite',
  },
  statusDotBusy: {
    background: '#ef4444',
  },
  statusDotDelayed: {
    background: '#f59e0b',
  },
  statusText: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  currentPatient: {
    fontSize: '0.95rem',
  },
  waitingCount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
  },
  count: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#2563eb',
  },
  tableContainer: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    background: '#f8fafc',
    padding: '1rem',
    textAlign: 'left',
    fontWeight: 600,
    color: '#1e293b',
    borderBottom: '2px solid #e2e8f0',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  nextPatientRow: {
    background: '#fef3c7',
  },
  positionBadge: {
    display: 'inline-block',
    width: '30px',
    height: '30px',
    background: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    textAlign: 'center',
    lineHeight: '30px',
    fontWeight: 600,
  },
  tokenCode: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#2563eb',
  },
  waitTimeBadge: {
    background: '#f59e0b',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  statuswaiting: {
    background: '#fef3c7',
    color: '#92400e',
  },
  statusconsulting: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  statuscompleted: {
    background: '#d1fae5',
    color: '#065f46',
  },
  emptyQueue: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  summaryCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  deptName: {
    fontSize: '1.1rem',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  waitBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    marginBottom: '0.75rem',
    overflow: 'hidden',
  },
  waitBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  waitDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    color: '#64748b',
  },
};

export default QueueDisplay;