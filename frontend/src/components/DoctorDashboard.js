import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DoctorDashboard({ doctors, socket }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [doctorStats, setDoctorStats] = useState({ seen_today: 0, avg_consult_time: 0 });
  const [loading, setLoading] = useState(false);
  const [delayModal, setDelayModal] = useState(false);
  const [addDoctorModal, setAddDoctorModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [selectedPatientForReport, setSelectedPatientForReport] = useState(null);
  const [reportText, setReportText] = useState('');
  const [completedPatients, setCompletedPatients] = useState([]);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    avg_time: 15
  });
  const [delayData, setDelayData] = useState({
    delay_minutes: 15,
    reason: 'Emergency'
  });

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('queue_update', (data) => {
        if (selectedDoctor) {
          const updatedDoctor = data.doctors.find(d => d.id === selectedDoctor.id);
          if (updatedDoctor) {
            setSelectedDoctor(updatedDoctor);
            setCurrentPatient(updatedDoctor.current_patient);
          }
          fetchDoctorPatients(selectedDoctor.id);
          fetchCompletedPatients(selectedDoctor.id);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('queue_update');
      }
    };
  }, [selectedDoctor, socket]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorPatients(selectedDoctor.id);
      fetchDoctorStats(selectedDoctor.id);
      fetchCompletedPatients(selectedDoctor.id);
    }
  }, [selectedDoctor]);

  const fetchDoctorPatients = async (doctorId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/doctor/${doctorId}/patients`);
      setDoctorPatients(response.data);
      
      const consulting = response.data.find(p => p.status === 'consulting');
      if (consulting) {
        setCurrentPatient(consulting.token);
      } else {
        setCurrentPatient(null);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchCompletedPatients = async (doctorId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/doctor/${doctorId}/completed-patients`);
      setCompletedPatients(response.data);
    } catch (error) {
      console.error('Error fetching completed patients:', error);
    }
  };

  const fetchDoctorStats = async (doctorId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/doctor/${doctorId}/stats`);
      setDoctorStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const startConsultation = async (patientToken) => {
    if (!selectedDoctor) return;
    setLoading(true);

    try {
      await axios.post(`http://localhost:5000/api/doctor/update/${selectedDoctor.id}`, {
        status: 'Busy',
        current_patient: patientToken
      });

      setCurrentPatient(patientToken);
      await fetchDoctorPatients(selectedDoctor.id);
      
    } catch (error) {
      console.error('Error starting consultation:', error);
      alert('Failed to start consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeConsultation = async () => {
    if (!selectedDoctor) return;
    setLoading(true);

    try {
      const response = await axios.post(`http://localhost:5000/api/doctor/complete-consultation/${selectedDoctor.id}`);
      
      await fetchDoctorPatients(selectedDoctor.id);
      await fetchDoctorStats(selectedDoctor.id);
      await fetchCompletedPatients(selectedDoctor.id);
      
      alert(response.data.message);
      
      // If a patient was completed, ask if doctor wants to write a report
      if (response.data.completed_patient) {
        const writeReport = window.confirm(`Patient ${response.data.completed_patient.name} consultation completed. Would you like to write a medical report?`);
        if (writeReport) {
          setSelectedPatientForReport(response.data.completed_patient);
          setReportModal(true);
        }
      }
      
    } catch (error) {
      console.error('Error completing consultation:', error);
      alert('Failed to complete consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!selectedPatientForReport || !reportText.trim()) {
      alert('Please enter report text');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/patient/report', {
        patient_id: selectedPatientForReport.id,
        patient_name: selectedPatientForReport.name,
        patient_token: selectedPatientForReport.token,
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        report_text: reportText
      });
      
      alert('Report saved successfully!');
      setReportModal(false);
      setReportText('');
      setSelectedPatientForReport(null);
      
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelay = async () => {
    try {
      const response = await axios.post(`http://localhost:5000/api/doctor/delay/${selectedDoctor.id}`, delayData);
      setDelayModal(false);
      alert(`Delay reported successfully. You'll be back at ${response.data.available_time}`);
    } catch (error) {
      console.error('Error reporting delay:', error);
      alert('Failed to report delay. Please try again.');
    }
  };

  const returnFromDelay = async () => {
    if (!selectedDoctor) return;
    setLoading(true);

    try {
      const response = await axios.post(`http://localhost:5000/api/doctor/return-from-delay/${selectedDoctor.id}`);
      
      if (response.data.success) {
        alert('You are now marked as available!');
        fetchDoctorPatients(selectedDoctor.id);
      }
    } catch (error) {
      console.error('Error returning from delay:', error);
      alert('Failed to return from delay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/doctors/add', newDoctor);
      if (response.data.success) {
        setAddDoctorModal(false);
        setNewDoctor({ name: '', specialization: '', avg_time: 15 });
        alert('Doctor added successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert('Failed to add doctor. Please try again.');
    }
  };

  return (
    <div className="doctor-dashboard" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Doctor Dashboard</h2>
        <p style={styles.subtitle}>Real-time patient queue management</p>
      </div>

      <div style={styles.controls}>
        <div style={styles.doctorSelector}>
          <label style={styles.label}>Select Doctor:</label>
          <select 
            onChange={(e) => {
              const doctor = doctors.find(d => d.id === parseInt(e.target.value));
              setSelectedDoctor(doctor);
            }}
            style={styles.select}
            value={selectedDoctor?.id || ''}
          >
            <option value="">Choose a doctor</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialization}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => setAddDoctorModal(true)}
          style={styles.addButton}
        >
          Add New Doctor
        </button>
      </div>

      {selectedDoctor && (
        <div style={styles.panel}>
          {/* Doctor Info Card */}
          <div style={styles.doctorInfoCard}>
            <div style={styles.doctorProfile}>
              <div style={styles.doctorAvatar}>
                {selectedDoctor.name.charAt(0)}
              </div>
              <div style={styles.doctorDetails}>
                <h3 style={styles.doctorName}>{selectedDoctor.name}</h3>
                <p style={styles.specialization}>{selectedDoctor.specialization}</p>
                <div style={{
                  ...styles.statusBadge,
                  ...(selectedDoctor.status === 'Available' ? styles.statusAvailable : 
                      selectedDoctor.status === 'Busy' ? styles.statusBusy : 
                      styles.statusDelayed)
                }}>
                  {selectedDoctor.status}
                </div>
                {selectedDoctor.status === 'Delayed' && selectedDoctor.next_available_time && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#92400e' }}>
                    Returns at: {selectedDoctor.next_available_time}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.doctorActions}>
              {selectedDoctor.status === 'Available' && doctorPatients.length > 0 && (
                <button 
                  style={{...styles.actionButton, ...styles.startButton}}
                  onClick={() => startConsultation(doctorPatients[0].token)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Start Next Patient'}
                </button>
              )}
              
              {selectedDoctor.status === 'Busy' && (
                <button 
                  style={{...styles.actionButton, ...styles.finishButton}}
                  onClick={completeConsultation}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Complete and Next'}
                </button>
              )}
              
              {selectedDoctor.status === 'Delayed' && (
                <button 
                  style={{...styles.actionButton, ...styles.returnButton}}
                  onClick={returnFromDelay}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'I am Back - Available Now'}
                </button>
              )}
              
              <button 
                style={{...styles.actionButton, ...styles.delayButton}}
                onClick={() => setDelayModal(true)}
                disabled={selectedDoctor.status === 'Delayed'}
              >
                Report Delay
              </button>
            </div>
          </div>

          {/* Current Consultation */}
          <div style={styles.currentConsultation}>
            <h3 style={styles.sectionTitle}>Current Consultation</h3>
            {currentPatient ? (
              <div style={styles.currentPatientCard}>
                <div style={styles.patientToken}>{currentPatient}</div>
                <div style={styles.consultationTimer}>
                  <Timer startTime={new Date()} />
                </div>
              </div>
            ) : (
              <div style={styles.noPatient}>
                {doctorPatients.length > 0 ? (
                  <p>Next patient: <strong>{doctorPatients[0].token}</strong></p>
                ) : (
                  <p>No patients in queue</p>
                )}
              </div>
            )}
          </div>

          {/* Patient Queue */}
          <div style={styles.patientQueue}>
            <h3 style={styles.sectionTitle}>
              Waiting Patients ({doctorPatients.filter(p => p.status === 'waiting').length})
            </h3>
            <div style={styles.queueList}>
              {doctorPatients.filter(p => p.status === 'waiting').map((patient, index) => (
                <div key={patient.token} style={styles.queueItem}>
                  <span style={styles.position}>{index + 1}</span>
                  <span style={styles.token}>{patient.token}</span>
                  <span style={styles.patientName}>{patient.name}</span>
                  <span style={styles.waitTime}>{patient.wait_time} min</span>
                  {index === 0 && selectedDoctor.status === 'Available' && (
                    <button 
                      style={styles.callButton}
                      onClick={() => startConsultation(patient.token)}
                      disabled={loading}
                    >
                      Call
                    </button>
                  )}
                </div>
              ))}
              {doctorPatients.filter(p => p.status === 'waiting').length === 0 && (
                <p style={styles.emptyQueue}>No waiting patients</p>
              )}
            </div>
          </div>

          {/* Completed Patients with Report Button */}
          <div style={styles.completedPatients}>
            <h3 style={styles.sectionTitle}>Today's Completed Patients</h3>
            <div style={styles.queueList}>
              {completedPatients.length > 0 ? (
                completedPatients.map((patient, index) => (
                  <div key={patient.id} style={styles.queueItem}>
                    <span style={styles.position}>{index + 1}</span>
                    <span style={styles.token}>{patient.token}</span>
                    <span style={styles.patientName}>{patient.name}</span>
                    <span style={styles.waitTime}>{patient.registration_time}</span>
                    <button 
                      style={styles.reportButton}
                      onClick={() => {
                        setSelectedPatientForReport(patient);
                        setReportModal(true);
                      }}
                    >
                      Write Report
                    </button>
                  </div>
                ))
              ) : (
                <p style={styles.emptyQueue}>No completed patients today</p>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div style={styles.statistics}>
            <h3 style={styles.sectionTitle}>Today's Statistics</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Patients Seen</span>
                <span style={styles.statValue}>{doctorStats.seen_today}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Avg Time</span>
                <span style={styles.statValue}>{selectedDoctor.avg_time} min</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Waiting</span>
                <span style={styles.statValue}>{doctorPatients.filter(p => p.status === 'waiting').length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {delayModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Report Delay</h3>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Delay Duration (minutes)</label>
                <input
                  type="number"
                  value={delayData.delay_minutes}
                  onChange={(e) => setDelayData({
                    ...delayData,
                    delay_minutes: parseInt(e.target.value)
                  })}
                  min="5"
                  max="120"
                  style={styles.modalInput}
                />
              </div>
              
              {delayData.delay_minutes > 0 && (
                <div style={{
                  background: '#f3f4f6',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <span style={{ color: '#4b5563' }}>Will be back at: </span>
                  <strong style={{ color: '#2563eb', fontSize: '1.1rem' }}>
                    {new Date(Date.now() + delayData.delay_minutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
              )}
              
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Reason</label>
                <select 
                  value={delayData.reason}
                  onChange={(e) => setDelayData({
                    ...delayData,
                    reason: e.target.value
                  })}
                  style={styles.modalSelect}
                >
                  <option value="Emergency">Emergency Surgery</option>
                  <option value="Emergency Case">Emergency Case</option>
                  <option value="Break">Break Time</option>
                  <option value="Meeting">Department Meeting</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              {delayData.reason === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify reason"
                  onChange={(e) => setDelayData({
                    ...delayData,
                    reason: e.target.value
                  })}
                  style={styles.modalInput}
                />
              )}
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setDelayModal(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={handleDelay}
              >
                Report Delay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal && selectedPatientForReport && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Write Medical Report</h3>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Patient Name</label>
                <input
                  type="text"
                  value={selectedPatientForReport.name}
                  disabled
                  style={{...styles.modalInput, background: '#f3f4f6'}}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Patient Token</label>
                <input
                  type="text"
                  value={selectedPatientForReport.token}
                  disabled
                  style={{...styles.modalInput, background: '#f3f4f6'}}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Report / Diagnosis</label>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows="6"
                  placeholder="Enter diagnosis, prescription, notes, follow-up recommendations..."
                  style={{...styles.modalInput, resize: 'vertical'}}
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => {
                  setReportModal(false);
                  setReportText('');
                  setSelectedPatientForReport(null);
                }}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={saveReport}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {addDoctorModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Add New Doctor</h3>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Doctor Name</label>
                <input
                  type="text"
                  placeholder="e.g., Dr. John Doe"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Specialization</label>
                <input
                  type="text"
                  placeholder="e.g., Cardiologist"
                  value={newDoctor.specialization}
                  onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Average Consultation Time (minutes)</label>
                <input
                  type="number"
                  value={newDoctor.avg_time}
                  onChange={(e) => setNewDoctor({...newDoctor, avg_time: parseInt(e.target.value)})}
                  min="5"
                  max="60"
                  style={styles.modalInput}
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setAddDoctorModal(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={handleAddDoctor}
              >
                Add Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Timer Component
function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date() - startTime) / 1000 / 60);
      setElapsed(diff);
    }, 60000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed} minutes</span>;
}

// Styles
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
  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
  },
  doctorSelector: {
    flex: 1,
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '1.5rem',
  },
  panel: {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  doctorInfoCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '2rem',
  },
  doctorProfile: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: '60px',
    height: '60px',
    background: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: '1.3rem',
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  specialization: {
    color: '#64748b',
    marginBottom: '0.5rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 1rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  statusAvailable: {
    background: '#d1fae5',
    color: '#065f46',
  },
  statusBusy: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  statusDelayed: {
    background: '#fed7aa',
    color: '#92400e',
  },
  returnButton: {
    background: '#10b981',
    color: 'white',
  },
  doctorActions: {
    display: 'flex',
    gap: '1rem',
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  startButton: {
    background: '#2563eb',
    color: 'white',
  },
  finishButton: {
    background: '#059669',
    color: 'white',
  },
  delayButton: {
    background: '#dc2626',
    color: 'white',
  },
  currentConsultation: {
    marginBottom: '2rem',
    padding: '1.5rem',
    background: '#f8fafc',
    borderRadius: '12px',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  currentPatientCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'white',
    borderRadius: '8px',
    border: '2px solid #2563eb',
  },
  patientToken: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#2563eb',
  },
  consultationTimer: {
    fontSize: '1.1rem',
    color: '#64748b',
  },
  noPatient: {
    padding: '1rem',
    background: 'white',
    borderRadius: '8px',
    color: '#64748b',
  },
  patientQueue: {
    marginBottom: '2rem',
  },
  completedPatients: {
    marginBottom: '2rem',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  queueItem: {
    display: 'grid',
    gridTemplateColumns: '50px 150px 1fr 120px 100px',
    gap: '1rem',
    alignItems: 'center',
    padding: '0.75rem',
    background: '#f8fafc',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  position: {
    fontWeight: 600,
    color: '#2563eb',
  },
  token: {
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  patientName: {
    color: '#1e293b',
  },
  waitTime: {
    color: '#64748b',
  },
  callButton: {
    padding: '0.5rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  reportButton: {
    padding: '0.5rem',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  emptyQueue: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px',
  },
  statistics: {
    padding: '1.5rem',
    background: '#f8fafc',
    borderRadius: '12px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  statCard: {
    textAlign: 'center',
    padding: '1rem',
    background: 'white',
    borderRadius: '8px',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '1.5rem',
  },
  modalBody: {
    marginBottom: '2rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  modalLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 500,
    color: '#1e293b',
  },
  modalInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
  },
  modalSelect: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    background: 'white',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    background: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButton: {
    flex: 1,
    padding: '0.75rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default DoctorDashboard;