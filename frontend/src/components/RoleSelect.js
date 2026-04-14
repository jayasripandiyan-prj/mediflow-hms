import React from 'react';
import { useNavigate } from 'react-router-dom';

function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>🏥</span>
          <h1 style={styles.title}>Hospital Queue System</h1>
          <p style={styles.subtitle}>Select your role to continue</p>
        </div>

        <div style={styles.roleGrid}>
          <div style={styles.roleCard} onClick={() => navigate('/patient-home')}>
            <span style={styles.roleIcon}>👤</span>
            <h3 style={styles.roleTitle}>Patient</h3>
            <p style={styles.roleDesc}>Register and track your queue status</p>
          </div>

          <div style={styles.roleCard} onClick={() => navigate('/login/doctor')}>
            <span style={styles.roleIcon}>👨‍⚕️</span>
            <h3 style={styles.roleTitle}>Doctor</h3>
            <p style={styles.roleDesc}>Manage your patient queue</p>
          </div>

          <div style={styles.roleCard} onClick={() => navigate('/login/admin')}>
            <span style={styles.roleIcon}>📊</span>
            <h3 style={styles.roleTitle}>Administrator</h3>
            <p style={styles.roleDesc}>View analytics and manage system</p>
          </div>
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
    borderRadius: '24px',
    padding: '3rem',
    width: '100%',
    maxWidth: '900px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem',
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
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem',
  },
  roleCard: {
    textAlign: 'center',
    padding: '2rem',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid #e2e8f0',
    background: 'white',
  },
  roleIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  roleTitle: {
    fontSize: '1.3rem',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  roleDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
};

export default RoleSelect;