```markdown
# MediFlow - Hospital Queue Management System

A production-ready real-time hospital queue management system that eliminates waiting room chaos. Patients receive digital tokens, doctors manage consultations with one click, and administrators get live analytics.

## Features

Patient Portal
- Digital token generation with unique format
- Real-time queue position tracking
- Estimated wait time calculation
- Token status check

Doctor Dashboard
- Live patient queue view
- One-click start and complete consultation
- Smart delay reporting with auto-return
- Today's completed patients list
- Medical report writing for each patient

Admin Panel
- Analytics dashboard with charts
- Department congestion visualization
- Peak hours analysis
- Patient medical records viewer
- Doctor management (add, update, delete)

Authentication
- Role-based access (Patient, Doctor, Admin)
- Separate login pages for each role
- Secure session management

Real-time Features
- WebSocket connections for instant updates
- Browser notifications for patients
- Live queue status bar
- Automatic UI refresh on data changes

## Tech Stack

Frontend
- React 18
- React Router for navigation
- Socket.io-client for real-time updates
- Axios for API calls
- Chart.js for analytics
- CSS3 for styling

Backend
- Python 3
- Flask framework
- Flask-SocketIO for WebSocket
- SQLite3 database
- Flask-CORS for cross-origin requests

## Project Structure

```
mediflow-hms/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   └── queue.db            # SQLite database
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── RoleSelect.js
    │   │   ├── DoctorLogin.js
    │   │   ├── AdminLogin.js
    │   │   ├── PatientHome.js
    │   │   ├── PatientRegistration.js
    │   │   ├── DoctorDashboard.js
    │   │   ├── AdminPanel.js
    │   │   ├── QueueDisplay.js
    │   │   └── TokenStatus.js
    │   ├── App.js
    │   ├── index.js
    │   └── styles.css
    └── package.json
```

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The backend will run on http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will run on http://localhost:3000

## Test Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Doctor | drrajeshkumar | doctor123 |
| Doctor | drpriyasharma | doctor123 |
| Doctor | dramitpatel | doctor123 |
| Doctor | drsnehareddy | doctor123 |
| Doctor | drvikramsingh | doctor123 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register new patient |
| GET | /api/doctors | Get all doctors |
| GET | /api/queue/status | Get current queue |
| POST | /api/doctor/update/:id | Update doctor status |
| POST | /api/doctor/delay/:id | Report doctor delay |
| POST | /api/doctor/complete-consultation/:id | Complete consultation |
| POST | /api/patient/report | Save medical report |
| GET | /api/admin/reports | Get all patient reports |
| POST | /api/login | Authenticate user |

## Token Format

Digital tokens follow this format: D{doctor_id}-{HHMM}-{initials}

Example: D1-1430-JS means Doctor 1, 2:30 PM, patient initials JS

## Key Features Explained

Digital Token System
Patients receive unique digital tokens immediately after registration. The token encodes doctor ID, registration time, and patient initials for easy identification.

Real-time Updates
All connected clients receive instant updates via WebSocket when any change occurs in the queue. No page refresh required.

Smart Delay Management
Doctors can report delays with custom duration. Patients receive automatic notifications with expected return time. The system auto-returns the doctor after delay expires.

Medical Records
Doctors can write medical reports after completing consultations. Reports are stored with doctor name, date, and time. Admin can view all patient records.

Role-Based Access
Three distinct roles with appropriate permissions. Patients access registration and queue viewing. Doctors access consultation management. Admin access analytics and records.

## Future Enhancements

- SMS notifications integration
- Mobile application
- PostgreSQL database support
- Multi-hospital support
- Export reports as PDF
- Patient history tracking

## Author

Jayasri Pandiyan
```
