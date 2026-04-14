import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function PatientRegistration({ doctors, socket }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    symptoms: '',
    doctor_id: '',
    appointment_type: 'walkin'
  });
  
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/register', formData);
      
      if (response.data.success) {
        setRegistrationStatus({
          success: true,
          token: response.data.token,
          position: response.data.position,
          waitTime: response.data.wait_time
        });
        
        // Reset form after successful registration
        setFormData({
          name: '',
          age: '',
          gender: '',
          phone: '',
          symptoms: '',
          doctor_id: '',
          appointment_type: 'walkin'
        });
        
        // Show success message
        setTimeout(() => {
          navigate(`/token/${response.data.token}`);
        }, 3000);
      }
    } catch (error) {
      setRegistrationStatus({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-header">
        <h2>Patient Registration</h2>
        <p>Please fill in your details to get a queue token</p>
      </div>

      {registrationStatus && (
        <div className={`status-message ${registrationStatus.success ? 'success' : 'error'}`}>
          {registrationStatus.success ? (
            <div className="token-card">
              <h3>✅ Registration Successful!</h3>
              <div className="token-details">
                <div className="token-number">
                  <span>Your Token:</span>
                  <strong>{registrationStatus.token}</strong>
                </div>
                <div className="queue-position">
                  <span>Queue Position:</span>
                  <strong>{registrationStatus.position}</strong>
                </div>
                <div className="wait-time">
                  <span>Estimated Wait:</span>
                  <strong>{registrationStatus.waitTime} minutes</strong>
                </div>
              </div>
              <p className="redirect-message">Redirecting to token status...</p>
            </div>
          ) : (
            <div className="error-message">
              ❌ {registrationStatus.message}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-row">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter patient's full name"
            />
          </div>
          
          <div className="form-group">
            <label>Age *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="0"
              max="150"
              placeholder="Age"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange} required>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Select Doctor *</label>
          <select name="doctor_id" value={formData.doctor_id} onChange={handleChange} required>
            <option value="">Choose a doctor</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialization} 
                ({doctor.waiting_patients} waiting, ~{doctor.avg_time}min/patient)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Symptoms / Reason for visit</label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            rows="3"
            placeholder="Briefly describe your symptoms or reason for consultation"
          />
        </div>

        <div className="form-group">
          <label>Appointment Type</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="appointment_type"
                value="walkin"
                checked={formData.appointment_type === 'walkin'}
                onChange={handleChange}
              />
              Walk-in
            </label>
            <label>
              <input
                type="radio"
                name="appointment_type"
                value="prebooked"
                checked={formData.appointment_type === 'prebooked'}
                onChange={handleChange}
              />
              Pre-booked
            </label>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register & Get Token'}
        </button>
      </form>

      {/* Live Queue Preview */}
      <div className="queue-preview">
        <h3>Current Queue Status</h3>
        <div className="doctor-status-mini">
          {doctors.map(doctor => (
            <div key={doctor.id} className={`doctor-mini-card ${doctor.status.toLowerCase()}`}>
              <span className="doctor-name">{doctor.name}</span>
              <span className="doctor-status">{doctor.status}</span>
              <span className="waiting-count">{doctor.waiting_count} waiting</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PatientRegistration;