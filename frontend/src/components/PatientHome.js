import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function PatientHome() {
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = React.useState('');

  const handleTokenCheck = (e) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      navigate(`/token/${tokenInput}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>🏥</span>
          <h1 style={styles.title}>Patient Portal</h1>
          <p style={styles.subtitle}>Welcome to City General Hospital</p>
        </div>

        <div style={styles.buttonGrid}>
          <Link to="/register" style={styles.button}>
            <span style={styles.buttonIcon}>🎫</span>
            <div>
              <h3 style={styles.buttonTitle}>New Registration</h3>
              <p style={styles.buttonDesc}>Get your queue token</p>
            </div>
          </Link>

          <Link to="/queue" style={styles.button}>
            <span style={styles.buttonIcon}>📊</span>
            <div>
              <h3 style={styles.buttonTitle}>Live Queue</h3>
              <p style={styles.buttonDesc}>Check current status</p>
            </div>
          </Link>

          <div style={styles.tokenCheckSection}>
            <h3 style={styles.tokenCheckTitle}>Check Token Status</h3>
            <form onSubmit={handleTokenCheck} style={styles.tokenForm}>
              <input
                type="text"
                placeholder="Enter your token number"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={styles.tokenInput}
              />
              <button type="submit" style={styles.tokenButton}>Check Status</button>
            </form>
          </div>
        </div>

        <button onClick={() => navigate('/')} style={styles.logoutButton}>
          ← Back to Role Selection
        </button>
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
    borderRadius: '24px',
    padding: '3rem',
    width: '100%',
    maxWidth: '600px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  icon: {
    fontSize: '4rem',
    display: 'block',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
  },
  buttonGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0',
  },
  buttonIcon: {
    fontSize: '2rem',
  },
  buttonTitle: {
    fontSize: '1.1rem',
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  buttonDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  tokenCheckSection: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid #e2e8f0',
  },
  tokenCheckTitle: {
    fontSize: '1rem',
    color: '#1e293b',
    marginBottom: '0.75rem',
  },
  tokenForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  tokenInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  tokenButton: {
    padding: '0.75rem 1.5rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  logoutButton: {
    width: '100%',
    padding: '0.75rem',
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  },
};

export default PatientHome;