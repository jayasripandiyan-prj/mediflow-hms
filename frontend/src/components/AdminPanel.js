import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title
);

function AdminPanel() {
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  const congestionData = {
    labels: analytics?.congestion?.map(c => c.dept) || ['No Data'],
    datasets: [{
      data: analytics?.congestion?.map(c => c.count) || [1],
      backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'],
      borderWidth: 0
    }]
  };

  const peakHoursData = {
    labels: analytics?.peak_hours?.map(ph => `${ph.hour}:00`) || ['No Data'],
    datasets: [{
      label: 'Patient Count',
      data: analytics?.peak_hours?.map(ph => ph.count) || [0],
      backgroundColor: '#4ecdc4',
      borderColor: '#45b7d1',
      borderWidth: 1
    }]
  };

  return (
    <div className="admin-panel" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Admin Dashboard</h2>
        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tab, ...(!showReports ? styles.activeTab : {})}}
            onClick={() => setShowReports(false)}
          >
            Analytics
          </button>
          <button 
            style={{...styles.tab, ...(showReports ? styles.activeTab : {})}}
            onClick={() => setShowReports(true)}
          >
            Patient Records ({reports.length})
          </button>
        </div>
      </div>

      {!showReports ? (
        <>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricIcon}>👥</div>
              <div style={styles.metricContent}>
                <h3 style={styles.metricTitle}>Total Patients Today</h3>
                <p style={styles.metricValue}>{analytics?.today_patients || 0}</p>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricIcon}>⏱️</div>
              <div style={styles.metricContent}>
                <h3 style={styles.metricTitle}>Average Wait Time</h3>
                <p style={styles.metricValue}>{analytics?.avg_wait_time || 0} min</p>
              </div>
            </div>
          </div>

          <div style={styles.chartsRow}>
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>Department Congestion</h3>
              <div style={styles.chartWrapper}>
                {analytics?.congestion?.length > 0 ? (
                  <Doughnut data={congestionData} />
                ) : (
                  <p>No congestion data available</p>
                )}
              </div>
            </div>

            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>Peak Hours</h3>
              <div style={styles.chartWrapper}>
                {analytics?.peak_hours?.length > 0 ? (
                  <Bar data={peakHoursData} />
                ) : (
                  <p>No peak hours data available</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={styles.reportsSection}>
          <h3 style={styles.sectionTitle}>Patient Medical Records</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Patient Name</th>
                  <th style={styles.th}>Patient Token</th>
                  <th style={styles.th}>Doctor Name</th>
                  <th style={styles.th}>Report / Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <tr key={report.id} style={styles.tr}>
                      <td style={styles.td}>{report.report_date}</td>
                      <td style={styles.td}>{report.report_time}</td>
                      <td style={styles.td}><strong>{report.patient_name}</strong></td>
                      <td style={styles.td}>{report.patient_token}</td>
                      <td style={styles.td}>{report.doctor_name}</td>
                      <td style={styles.td}>{report.report_text}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={styles.emptyQueue}>No patient records available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  tabContainer: {
    display: 'flex',
    gap: '1rem',
    borderBottom: '2px solid #e2e8f0',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    color: '#64748b',
  },
  activeTab: {
    color: '#2563eb',
    borderBottom: '2px solid #2563eb',
    marginBottom: '-2px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  metricCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  metricIcon: {
    fontSize: '2.5rem',
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.25rem',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  chartContainer: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '1.2rem',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  chartWrapper: {
    height: '300px',
  },
  reportsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '1rem',
    background: '#f8fafc',
    fontWeight: 600,
    color: '#1e293b',
    borderBottom: '2px solid #e2e8f0',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
  },
  tr: {
    transition: 'background 0.2s',
  },
  emptyQueue: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
  },
};

export default AdminPanel;