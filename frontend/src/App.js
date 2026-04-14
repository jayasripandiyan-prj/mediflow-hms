import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import './styles.css';
import RoleSelect from './components/RoleSelect';
import DoctorLogin from './components/DoctorLogin';
import AdminLogin from './components/AdminLogin';
import PatientHome from './components/PatientHome';
import PatientRegistration from './components/PatientRegistration';
import DoctorDashboard from './components/DoctorDashboard';
import QueueDisplay from './components/QueueDisplay';
import AdminPanel from './components/AdminPanel';
import TokenStatus from './components/TokenStatus';

axios.defaults.baseURL = 'https://mediflow-hms-1.onrender.com';

const socket = io('https://mediflow-hms-1.onrender.com', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [queueData, setQueueData] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check for existing session on load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
    setLoading(false);
  }, []);

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get('/api/health');
        if (response.data.status === 'healthy') {
          setBackendStatus('connected');
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/api/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchQueueData = async () => {
    try {
      const response = await axios.get('/api/queue/status');
      setQueueData(response.data);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  // Fetch data when user logs in
  useEffect(() => {
    if (user) {
      fetchDoctors();
      fetchQueueData();
    }
  }, [user]);

  // Socket events
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected');
      setBackendStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setBackendStatus('disconnected');
    });

    socket.on('queue_update', (data) => {
      if (data.queue) setQueueData(data.queue);
      if (data.doctors) setDoctors(data.doctors);
    });

    socket.on('notification', (data) => {
      setNotifications(prev => [...prev, { ...data, id: Date.now() }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== Date.now()));
      }, 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queue_update');
      socket.off('notification');
    };
  }, []);

  const handleDoctorLogin = (userData) => {
    setUser(userData);
  };

  const handleAdminLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (backendStatus === 'checking' || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (backendStatus === 'disconnected') {
    return (
      <div className="error-container">
        <h2>Cannot connect to backend server</h2>
        <p>Please make sure the backend is running on http://localhost:5000</p>
        <button onClick={() => window.location.reload()}>Retry Connection</button>
      </div>
    );
  }

  // If logged in as doctor
  if (user && user.role === 'doctor') {
    return (
      <Router>
        <div className="app">
          <nav className="navbar">
            <div className="nav-brand">
              <span className="hospital-icon">🏥</span>
              <h1>Hospital Queue System - Doctor Portal</h1>
            </div>
            <ul className="nav-menu">
              <li><Link to="/doctor/queue">Live Queue</Link></li>
              <li><button onClick={handleLogout} className="logout-btn">Logout ({user.username})</button></li>
            </ul>
          </nav>

          <div className="notification-area">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification ${notification.type}`}>
                <p>{notification.message}</p>
              </div>
            ))}
          </div>

          <Routes>
            <Route path="/doctor" element={<DoctorDashboard doctors={doctors} socket={socket} />} />
            <Route path="/doctor/queue" element={<QueueDisplay queueData={queueData} doctors={doctors} socket={socket} />} />
            <Route path="*" element={<Navigate to="/doctor" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // If logged in as admin
  if (user && user.role === 'admin') {
    return (
      <Router>
        <div className="app">
          <nav className="navbar">
            <div className="nav-brand">
              <span className="hospital-icon">🏥</span>
              <h1>Hospital Queue System - Admin Portal</h1>
            </div>
            <ul className="nav-menu">
              <li><Link to="/admin/analytics">Analytics</Link></li>
              <li><Link to="/admin/records">Patient Records</Link></li>
              <li><button onClick={handleLogout} className="logout-btn">Logout ({user.username})</button></li>
            </ul>
          </nav>

          <div className="notification-area">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification ${notification.type}`}>
                <p>{notification.message}</p>
              </div>
            ))}
          </div>

          <Routes>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/analytics" element={<AdminPanel />} />
            <Route path="/admin/records" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  // Public routes (no login required)
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login/doctor" element={<DoctorLogin onLogin={handleDoctorLogin} />} />
        <Route path="/login/admin" element={<AdminLogin onLogin={handleAdminLogin} />} />
        <Route path="/patient-home" element={<PatientHome />} />
        <Route path="/register" element={<PatientRegistration doctors={doctors} socket={socket} />} />
        <Route path="/queue" element={<QueueDisplay queueData={queueData} doctors={doctors} socket={socket} />} />
        <Route path="/token/:token" element={<TokenStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;