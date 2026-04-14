import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function DoctorLogin({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });

      if (response.data.success && response.data.role === 'doctor') {
        localStorage.setItem('user', JSON.stringify({
          id: response.data.user_id,
          username: response.data.username,
          role: response.data.role,
          doctor_id: response.data.doctor_id,
          session_token: response.data.session_token
        }));
        onLogin(response.data);
      } else {
        setError('Invalid doctor credentials');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button onClick={() => navigate('/')} style={styles.backButton}>← Back</button>
        <div style={styles.header}>
          <span style={styles.icon}>👨‍⚕️</span>
          <h1 style={styles.title}>Doctor Login</h1>
          <p style={styles.subtitle}>Access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.info}>
          <p>Demo Doctor Credentials:</p>
          <p>drrajeshkumar / doctor123</p>
          <p>drpriyasharma / doctor123</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    color: '#2563eb',
    cursor: 'pointer',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  icon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.8rem',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    padding: '0.75rem',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  info: {
    marginTop: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
    fontSize: '0.85rem',
    color: '#64748b',
    textAlign: 'center',
  },
};

export default DoctorLogin;