import React from 'react';
import { Link } from 'react-router-dom';

function Home({ doctors, loading }) {
  // Handle loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ fontSize: '1.2rem', color: '#1e293b' }}>Loading hospital data...</p>
        </div>
      </div>
    );
  }

  // Handle case when doctors data is not available
  if (!doctors || doctors.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        {/* Navigation Bar */}
        <nav style={{
          background: '#ffffff',
          padding: '1rem 2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🏥</span>
            <h1 style={{ fontSize: '1.5rem', color: '#1e293b', margin: 0 }}>MediQueue</h1>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
            <Link to="/register" style={{ color: '#64748b', textDecoration: 'none' }}>Patient Registration</Link>
            <Link to="/queue" style={{ color: '#64748b', textDecoration: 'none' }}>Live Queue</Link>
            <Link to="/doctor" style={{ color: '#64748b', textDecoration: 'none' }}>Doctor Dashboard</Link>
            <Link to="/admin" style={{ color: '#64748b', textDecoration: 'none' }}>Admin</Link>
          </div>
        </nav>

        {/* Error Section */}
        <div style={{
          maxWidth: '600px',
          margin: '4rem auto',
          padding: '3rem',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.8rem', color: '#dc2626', marginBottom: '1rem' }}>
            Connection Error
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1.5rem' }}>
            Unable to connect to the server. Please check:
          </p>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            marginBottom: '2rem',
            textAlign: 'left',
            background: '#f1f5f9',
            padding: '1.5rem',
            borderRadius: '12px'
          }}>
            <li style={{ margin: '0.8rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#2563eb' }}>•</span> Backend server is running on port 5000
            </li>
            <li style={{ margin: '0.8rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#2563eb' }}>•</span> Database is properly initialized
            </li>
            <li style={{ margin: '0.8rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#2563eb' }}>•</span> Network connection is stable
            </li>
          </ul>
          <button onClick={() => window.location.reload()} style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '1rem 2.5rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            ':hover': {
              background: '#1d4ed8'
            }
          }}>
            Retry Connection
          </button>
        </div>

        {/* Quick Access Cards */}
        <div style={{
          maxWidth: '1200px',
          margin: '2rem auto',
          padding: '0 2rem'
        }}>
          <h2 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '1.5rem' }}>Quick Access</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { to: '/register', icon: '🎫', title: 'Patient Registration', desc: 'Get your queue token', color: '#2563eb' },
              { to: '/queue', icon: '📊', title: 'Live Queue', desc: 'Check waiting times', color: '#7c3aed' },
              { to: '/doctor', icon: '👨‍⚕️', title: 'Doctor Dashboard', desc: 'Manage patients', color: '#059669' },
              { to: '/admin', icon: '📈', title: 'Admin Panel', desc: 'View analytics', color: '#dc2626' }
            ].map((item, index) => (
              <Link key={index} to={item.to} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#ffffff',
                  padding: '2rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, boxShadow 0.2s',
                  cursor: 'pointer',
                  ':hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 20px rgba(0,0,0,0.1)'
                  }
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <h3 style={{ fontSize: '1.3rem', color: '#1e293b', marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ color: '#64748b', marginBottom: '1rem' }}>{item.desc}</p>
                  <span style={{ color: item.color, fontWeight: 600 }}>Access →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalWaiting = doctors.reduce((sum, doc) => sum + (doc.waiting_count || 0), 0);
  const availableDoctors = doctors.filter(doc => doc.status === 'Available').length;
  const avgWaitTime = doctors.length > 0 
    ? Math.round(doctors.reduce((sum, doc) => sum + (doc.avg_time || 0), 0) / doctors.length)
    : 0;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <nav style={{
        background: '#ffffff',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🏥</span>
          <h1 style={{ fontSize: '1.5rem', color: '#1e293b', margin: 0 }}>MediQueue</h1>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <Link to="/register" style={{ color: '#64748b', textDecoration: 'none' }}>Patient Registration</Link>
          <Link to="/queue" style={{ color: '#64748b', textDecoration: 'none' }}>Live Queue</Link>
          <Link to="/doctor" style={{ color: '#64748b', textDecoration: 'none' }}>Doctor Dashboard</Link>
          <Link to="/admin" style={{ color: '#64748b', textDecoration: 'none' }}>Admin</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        padding: '4rem 2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem' }}>
            Welcome to City General Hospital
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.95, marginBottom: '3rem' }}>
            Smart Queue Management System for Better Patient Experience
          </p>
          
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            maxWidth: '800px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>{totalWaiting}</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Patients Waiting</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>{availableDoctors}</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Doctors Available</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>{avgWaitTime}min</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Avg. Wait Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Quick Actions */}
        <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '2rem' }}>Quick Actions</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginBottom: '4rem'
        }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              border: '1px solid #e2e8f0',
              ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
                borderColor: '#2563eb'
              }
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎫</div>
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Get Token</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Register and get your queue token
              </p>
              <span style={{ color: '#2563eb', fontWeight: 500 }}>Register Now →</span>
            </div>
          </Link>

          <Link to="/queue" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              border: '1px solid #e2e8f0',
              ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
                borderColor: '#7c3aed'
              }
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Live Queue</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Check real-time queue status
              </p>
              <span style={{ color: '#7c3aed', fontWeight: 500 }}>View Queue →</span>
            </div>
          </Link>

          <Link to="/doctor" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              border: '1px solid #e2e8f0',
              ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
                borderColor: '#059669'
              }
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👨‍⚕️</div>
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Doctor Portal</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Manage your patient queue
              </p>
              <span style={{ color: '#059669', fontWeight: 500 }}>Access Dashboard →</span>
            </div>
          </Link>

          <Link to="/admin" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
              border: '1px solid #e2e8f0',
              ':hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
                borderColor: '#dc2626'
              }
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📈</div>
              <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Admin Panel</h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Analytics and management
              </p>
              <span style={{ color: '#dc2626', fontWeight: 500 }}>View Analytics →</span>
            </div>
          </Link>
        </div>

        {/* Quick Token Check */}
        <div style={{
          background: '#ffffff',
          padding: '3rem',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          marginBottom: '4rem',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '1.5rem' }}>Quick Token Status</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const token = e.target.token.value;
            window.location.href = `/token/${token}`;
          }} style={{ display: 'flex', gap: '1rem', maxWidth: '600px' }}>
            <input 
              type="text" 
              name="token" 
              placeholder="Enter token number (e.g., D1-1234-JO)"
              style={{
                flex: 1,
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button type="submit" style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}>
              Check Status
            </button>
          </form>
        </div>

        {/* Doctor Queue Status */}
        {doctors.length > 0 && (
          <div style={{
            background: '#ffffff',
            padding: '3rem',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '2rem' }}>
              Current Queue Status
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {doctors.map(doctor => (
                <div key={doctor.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '250px 1fr 100px',
                  gap: '2rem',
                  alignItems: 'center',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{doctor.name}</span>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: doctor.status === 'Available' ? '#10b981' : 
                                 doctor.status === 'Busy' ? '#ef4444' : '#f59e0b'
                    }}></span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, (doctor.waiting_count || 0) * 10)}%`,
                      height: '100%',
                      background: (doctor.waiting_count || 0) > 8 ? '#ef4444' : '#10b981',
                      borderRadius: '4px',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    {doctor.waiting_count || 0} waiting
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hospital Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2rem',
          marginTop: '4rem',
          padding: '3rem',
          background: '#1e293b',
          borderRadius: '16px',
          color: 'white'
        }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📍</span> Location & Contact
            </h3>
            <p style={{ marginBottom: '0.8rem', opacity: 0.9 }}>123 Healthcare Avenue, Medical District</p>
            <p style={{ marginBottom: '0.8rem', opacity: 0.9 }}>📞 Emergency: 108 | Reception: +91 1234567890</p>
            <p style={{ opacity: 0.9 }}>⏰ 24/7 Emergency Services Available</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📱</span> Mobile App
            </h3>
            <p style={{ marginBottom: '1rem', opacity: 0.9 }}>Download our app for:</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '0.5rem', opacity: 0.9 }}>✓ Remote queue monitoring</li>
              <li style={{ marginBottom: '0.5rem', opacity: 0.9 }}>✓ Instant notifications</li>
              <li style={{ marginBottom: '0.5rem', opacity: 0.9 }}>✓ Digital tokens</li>
              <li style={{ opacity: 0.9 }}>✓ Appointment booking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;