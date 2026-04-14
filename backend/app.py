from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sqlite3
import datetime
import threading
import time
import os
import logging
import hashlib
import secrets

app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app, origins="http://localhost:3000")
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database initialization with migration support
def init_db():
    conn = sqlite3.connect('queue.db')
    c = conn.cursor()
    
    # Check if doctors table exists and get its columns
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='doctors'")
    table_exists = c.fetchone()
    
    if table_exists:
        # Get existing columns
        c.execute("PRAGMA table_info(doctors)")
        columns = [column[1] for column in c.fetchall()]
        logger.info(f"Existing doctors table columns: {columns}")
        
        # Add missing columns if needed
        if 'specialization' not in columns:
            logger.info("Adding specialization column to doctors table")
            c.execute("ALTER TABLE doctors ADD COLUMN specialization TEXT")
        
        if 'avg_consultation_time' not in columns:
            logger.info("Adding avg_consultation_time column to doctors table")
            c.execute("ALTER TABLE doctors ADD COLUMN avg_consultation_time INTEGER DEFAULT 15")
        
        if 'next_available_time' not in columns:
            logger.info("Adding next_available_time column to doctors table")
            c.execute("ALTER TABLE doctors ADD COLUMN next_available_time TEXT")
    else:
        # Create doctors table with all columns
        logger.info("Creating doctors table")
        c.execute('''CREATE TABLE doctors
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      name TEXT NOT NULL,
                      specialization TEXT NOT NULL,
                      status TEXT DEFAULT 'Available',
                      current_patient TEXT,
                      avg_consultation_time INTEGER DEFAULT 15,
                      next_available_time TEXT)''')
    
    # Create patients table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS patients
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  age INTEGER NOT NULL,
                  gender TEXT NOT NULL,
                  phone TEXT NOT NULL,
                  symptoms TEXT,
                  doctor_id INTEGER,
                  token_number TEXT UNIQUE,
                  queue_position INTEGER,
                  status TEXT DEFAULT 'waiting',
                  registration_time TEXT,
                  estimated_wait_time INTEGER,
                  appointment_type TEXT DEFAULT 'walkin',
                  FOREIGN KEY (doctor_id) REFERENCES doctors (id))''')
    
    # Create queue history table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS queue_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doctor_id INTEGER,
                  patient_id INTEGER,
                  wait_time INTEGER,
                  consultation_time INTEGER,
                  timestamp TEXT,
                  FOREIGN KEY (doctor_id) REFERENCES doctors (id),
                  FOREIGN KEY (patient_id) REFERENCES patients (id))''')
    
    # NEW: Create patient reports table
    c.execute('''CREATE TABLE IF NOT EXISTS patient_reports
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  patient_id INTEGER NOT NULL,
                  patient_name TEXT NOT NULL,
                  patient_token TEXT NOT NULL,
                  doctor_id INTEGER NOT NULL,
                  doctor_name TEXT NOT NULL,
                  report_text TEXT NOT NULL,
                  report_date TEXT NOT NULL,
                  report_time TEXT NOT NULL,
                  FOREIGN KEY (patient_id) REFERENCES patients (id),
                  FOREIGN KEY (doctor_id) REFERENCES doctors (id))''')
    
    # NEW: Create users table for authentication
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  role TEXT NOT NULL,
                  doctor_id INTEGER,
                  session_token TEXT,
                  last_login TEXT,
                  FOREIGN KEY (doctor_id) REFERENCES doctors (id))''')
    
    # Check if we need to insert sample doctors
    c.execute("SELECT COUNT(*) FROM doctors")
    count = c.fetchone()[0]
    
    if count == 0:
        logger.info("Inserting sample doctors")
        doctors = [
            ('Dr. Rajesh Kumar', 'Cardiologist', 'Available', None, 15),
            ('Dr. Priya Sharma', 'Neurologist', 'Available', None, 20),
            ('Dr. Amit Patel', 'Orthopedic', 'Available', None, 12),
            ('Dr. Sneha Reddy', 'Pediatrician', 'Available', None, 10),
            ('Dr. Vikram Singh', 'General Physician', 'Available', None, 8)
        ]
        for doctor in doctors:
            try:
                c.execute("""INSERT INTO doctors 
                             (name, specialization, status, current_patient, avg_consultation_time) 
                             VALUES (?, ?, ?, ?, ?)""",
                         (doctor[0], doctor[1], doctor[2], doctor[3], doctor[4]))
                logger.info(f"Inserted doctor: {doctor[0]}")
            except sqlite3.OperationalError as e:
                logger.error(f"Error inserting doctor: {e}")
    
    # Insert default users if none exist
    c.execute("SELECT COUNT(*) FROM users")
    user_count = c.fetchone()[0]
    
    if user_count == 0:
        logger.info("Creating default users")
        # Admin user
        admin_password = hashlib.sha256("admin123".encode()).hexdigest()
        c.execute("INSERT INTO users (username, password, role, session_token) VALUES (?, ?, ?, ?)",
                  ("admin", admin_password, "admin", None))
        
        # Doctor users (one for each doctor)
        c.execute("SELECT id, name FROM doctors")
        doctors_list = c.fetchall()
        for doctor in doctors_list:
            # Create username from doctor name (remove spaces, lowercase)
            username = doctor[1].lower().replace(" ", "").replace(".", "")
            password = hashlib.sha256("doctor123".encode()).hexdigest()
            c.execute("INSERT INTO users (username, password, role, doctor_id, session_token) VALUES (?, ?, ?, ?, ?)",
                      (username, password, "doctor", doctor[0], None))
            logger.info(f"Created doctor user: {username} for {doctor[1]}")
    
    conn.commit()
    
    # Verify the table structure
    c.execute("PRAGMA table_info(doctors)")
    columns = c.fetchall()
    logger.info("Final doctors table structure:")
    for col in columns:
        logger.info(f"  {col[1]} - {col[2]}")
    
    conn.close()
    logger.info("Database initialization completed")

# Generate unique token number
def generate_token(doctor_id, patient_name):
    timestamp = datetime.datetime.now().strftime("%H%M")
    doctor_prefix = f"D{doctor_id}"
    # Get first 2 letters of patient name, uppercase
    name_prefix = ''.join([c for c in patient_name if c.isalpha()])[:2].upper()
    if not name_prefix:
        name_prefix = "XX"
    return f"{doctor_prefix}-{timestamp}-{name_prefix}"

# Update queue positions for a doctor
def update_queue_positions(doctor_id):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Get all waiting patients for this doctor, ordered by registration time
        c.execute("""SELECT id FROM patients 
                     WHERE doctor_id = ? AND status = 'waiting' 
                     ORDER BY registration_time ASC""", (doctor_id,))
        patients = c.fetchall()
        
        # Update positions
        for position, (patient_id,) in enumerate(patients, 1):
            c.execute("UPDATE patients SET queue_position = ? WHERE id = ?", (position, patient_id))
        
        conn.commit()
        conn.close()
        
        # Broadcast queue update
        broadcast_queue_status()
    except Exception as e:
        logger.error(f"Error updating queue positions: {str(e)}")

# Calculate estimated wait time
def calculate_wait_time(doctor_id, position):
    conn = sqlite3.connect('queue.db')
    c = conn.cursor()
    
    c.execute("SELECT avg_consultation_time FROM doctors WHERE id = ?", (doctor_id,))
    result = c.fetchone()
    avg_time = result[0] if result else 15  # Default to 15 minutes if not found
    
    conn.close()
    
    # Wait time = position * avg consultation time (in minutes)
    return position * avg_time

# Function to handle automatic return from delay
def schedule_delay_return(doctor_id, delay_minutes):
    """Schedule doctor to return from delay after specified minutes"""
    def return_from_delay():
        time.sleep(delay_minutes * 60)  # Convert to seconds
        try:
            conn = sqlite3.connect('queue.db')
            c = conn.cursor()
            
            # Check if doctor is still delayed (might have been manually returned)
            c.execute("SELECT status FROM doctors WHERE id = ?", (doctor_id,))
            result = c.fetchone()
            
            if result and result[0] == 'Delayed':
                logger.info(f"Auto-returning doctor {doctor_id} from delay")
                
                # Update doctor status to Available
                c.execute("""UPDATE doctors 
                             SET status = 'Available', next_available_time = NULL 
                             WHERE id = ?""", (doctor_id,))
                conn.commit()
                
                # Notify all patients
                c.execute("""SELECT token_number FROM patients 
                             WHERE doctor_id = ? AND status = 'waiting'""", (doctor_id,))
                patients = c.fetchall()
                
                for (token,) in patients:
                    socketio.emit('notification', {
                        'type': 'doctor_returned',
                        'message': f'Doctor is now available again',
                        'token': token
                    })
                
                # Broadcast queue update
                broadcast_queue_status()
                
                logger.info(f"Doctor {doctor_id} is now available again")
            
            conn.close()
        except Exception as e:
            logger.error(f"Error in delay return: {str(e)}")
    
    # Start background thread
    thread = threading.Thread(target=return_from_delay)
    thread.daemon = True
    thread.start()

# Broadcast real-time queue status - FIXED VERSION with accurate counting
def broadcast_queue_status():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Get all doctors status with accurate waiting counts (only waiting patients, not consulting or completed)
        c.execute("""SELECT d.id, d.name, d.specialization, d.status, d.current_patient,
                    COUNT(CASE WHEN p.status = 'waiting' THEN 1 END) as waiting_count,
                    COUNT(CASE WHEN p.status = 'consulting' THEN 1 END) as consulting_count,
                    d.avg_consultation_time,
                    d.next_available_time
                    FROM doctors d
                    LEFT JOIN patients p ON d.id = p.doctor_id
                    GROUP BY d.id""")  # Removed status filter from JOIN to count all patients
        doctors = c.fetchall()
        
        doctor_status = []
        for doctor in doctors:
            doctor_status.append({
                'id': doctor[0],
                'name': doctor[1],
                'specialization': doctor[2] if doctor[2] else 'General',
                'status': doctor[3],
                'current_patient': doctor[4],
                'waiting_count': doctor[5] or 0,  # Only waiting patients
                'consulting_count': doctor[6] or 0,
                'avg_time': doctor[7] or 15,
                'next_available_time': doctor[8]
            })
        
        # Get ALL active patients (waiting and consulting) for queue display
        c.execute("""SELECT p.token_number, p.name, p.queue_position, d.name as doctor_name,
                    p.estimated_wait_time, p.status, p.doctor_id
                    FROM patients p
                    JOIN doctors d ON p.doctor_id = d.id
                    WHERE p.status IN ('waiting', 'consulting')
                    ORDER BY 
                        CASE 
                            WHEN p.status = 'consulting' THEN 0 
                            ELSE p.queue_position 
                        END ASC""")
        queue = c.fetchall()
        
        queue_data = [{
            'token': q[0],
            'patient': q[1],
            'position': q[2] if q[5] == 'waiting' else 'Now Serving',
            'doctor': q[3],
            'wait_time': q[4] if q[5] == 'waiting' else 0,
            'status': q[5]
        } for q in queue]
        
        conn.close()
        
        # Log for debugging
        logger.info(f"Broadcasting queue update with {len(queue_data)} active patients")
        for doctor in doctor_status:
            logger.info(f"Doctor {doctor['name']}: {doctor['waiting_count']} waiting patients")
        
        # Emit updates to all connected clients
        socketio.emit('queue_update', {'doctors': doctor_status, 'queue': queue_data})
        
    except Exception as e:
        logger.error(f"Error broadcasting queue status: {str(e)}")
        import traceback
        traceback.print_exc()

# SocketIO event handlers
@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    broadcast_queue_status()

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('request_queue_update')
def handle_request_update():
    logger.info(f"Client requested queue update: {request.sid}")
    broadcast_queue_status()

# Routes
@app.route('/')
def serve():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except:
        return jsonify({'message': 'Backend API is running', 'status': 'ok'})

# ==================== AUTHENTICATION ENDPOINTS ====================

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Hash the provided password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Check user credentials
        c.execute("SELECT id, username, password, role, doctor_id FROM users WHERE username = ?", (username,))
        user = c.fetchone()
        
        if not user or user[2] != hashed_password:
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
        
        # Generate session token
        session_token = secrets.token_hex(32)
        
        # Update user with session token and last login time
        last_login = datetime.datetime.now().isoformat()
        c.execute("UPDATE users SET session_token = ?, last_login = ? WHERE id = ?", 
                 (session_token, last_login, user[0]))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'user_id': user[0],
            'username': user[1],
            'role': user[3],
            'doctor_id': user[4],
            'session_token': session_token,
            'message': 'Login successful'
        })
        
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Logout endpoint
@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        data = request.json
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        
        if not user_id or not session_token:
            return jsonify({'success': False, 'message': 'User ID and session token required'}), 400
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Verify session token and clear it
        c.execute("SELECT id FROM users WHERE id = ? AND session_token = ?", (user_id, session_token))
        user = c.fetchone()
        
        if user:
            c.execute("UPDATE users SET session_token = NULL WHERE id = ?", (user_id,))
            conn.commit()
        
        conn.close()
        
        return jsonify({'success': True, 'message': 'Logout successful'})
        
    except Exception as e:
        logger.error(f"Error in logout: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Verify session endpoint
@app.route('/api/verify-session', methods=['POST'])
def verify_session():
    try:
        data = request.json
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        
        if not user_id or not session_token:
            return jsonify({'valid': False, 'message': 'User ID and session token required'}), 400
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("SELECT id, username, role, doctor_id FROM users WHERE id = ? AND session_token = ?", 
                 (user_id, session_token))
        user = c.fetchone()
        
        conn.close()
        
        if user:
            return jsonify({
                'valid': True,
                'user_id': user[0],
                'username': user[1],
                'role': user[2],
                'doctor_id': user[3]
            })
        else:
            return jsonify({'valid': False, 'message': 'Invalid session'}), 401
        
    except Exception as e:
        logger.error(f"Error verifying session: {str(e)}")
        return jsonify({'valid': False, 'message': str(e)}), 500

# Change password endpoint
@app.route('/api/change-password', methods=['POST'])
def change_password():
    try:
        data = request.json
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not all([user_id, session_token, current_password, new_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Verify session and get current password
        c.execute("SELECT password FROM users WHERE id = ? AND session_token = ?", (user_id, session_token))
        user = c.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid session'}), 401
        
        # Verify current password
        current_hashed = hashlib.sha256(current_password.encode()).hexdigest()
        if user[0] != current_hashed:
            conn.close()
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
        
        # Update to new password
        new_hashed = hashlib.sha256(new_password.encode()).hexdigest()
        c.execute("UPDATE users SET password = ? WHERE id = ?", (new_hashed, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Password changed successfully'})
        
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== EXISTING API ENDPOINTS ====================

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.now().isoformat()})

# Patient Registration
@app.route('/api/register', methods=['POST'])
def register_patient():
    try:
        data = request.json
        logger.info(f"Registering patient: {data.get('name')}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        # Validate doctor exists
        doctor_id = data.get('doctor_id')
        c.execute("SELECT id, name FROM doctors WHERE id = ?", (doctor_id,))
        doctor = c.fetchone()
        if not doctor:
            return jsonify({'success': False, 'message': 'Invalid doctor selected'}), 400
        
        # Generate token
        token = generate_token(doctor_id, data['name'])
        
        # Get current queue position
        c.execute("SELECT COUNT(*) FROM patients WHERE doctor_id = ? AND status = 'waiting'", (doctor_id,))
        waiting_count = c.fetchone()[0] or 0
        queue_position = waiting_count + 1
        
        # Calculate wait time
        wait_time = calculate_wait_time(doctor_id, queue_position)
        
        # Insert patient
        registration_time = datetime.datetime.now().isoformat()
        c.execute("""INSERT INTO patients 
                     (name, age, gender, phone, symptoms, doctor_id, token_number, 
                      queue_position, status, registration_time, estimated_wait_time, appointment_type)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (data['name'], data['age'], data['gender'], data['phone'], 
                   data.get('symptoms', ''), doctor_id, token, queue_position, 
                   'waiting', registration_time, wait_time, data.get('appointment_type', 'walkin')))
        
        patient_id = c.lastrowid
        logger.info(f"Patient registered with token: {token}")
        
        conn.commit()
        conn.close()
        
        # Update queue - this will broadcast to all clients
        broadcast_queue_status()
        
        # Send confirmation notification
        socketio.emit('notification', {
            'type': 'registration',
            'message': f'Registration successful! Your token is {token}',
            'token': token,
            'position': queue_position,
            'wait_time': wait_time
        })
        
        return jsonify({
            'success': True,
            'token': token,
            'position': queue_position,
            'wait_time': wait_time,
            'patient_id': patient_id
        })
        
    except Exception as e:
        logger.error(f"Error in registration: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Get all doctors
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT d.*, 
                    COUNT(CASE WHEN p.status = 'waiting' THEN 1 END) as waiting_patients 
                    FROM doctors d
                    LEFT JOIN patients p ON d.id = p.doctor_id
                    GROUP BY d.id""")
        doctors = c.fetchall()
        
        doctor_list = []
        for d in doctors:
            doctor_list.append({
                'id': d[0],
                'name': d[1],
                'specialization': d[2] if len(d) > 2 and d[2] else 'General',
                'status': d[3] if len(d) > 3 else 'Available',
                'current_patient': d[4] if len(d) > 4 else None,
                'avg_time': d[5] if len(d) > 5 else 15,
                'waiting_patients': d[7] if len(d) > 7 else 0
            })
        
        conn.close()
        logger.info(f"GET /api/doctors - Found {len(doctor_list)} doctors")
        return jsonify(doctor_list)
        
    except Exception as e:
        logger.error(f"Error getting doctors: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Get patient queue status
@app.route('/api/queue/<token>', methods=['GET'])
def get_queue_status(token):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT p.*, d.name as doctor_name, d.specialization
                     FROM patients p
                     JOIN doctors d ON p.doctor_id = d.id
                     WHERE p.token_number = ?""", (token,))
        patient = c.fetchone()
        
        if patient:
            c.execute("PRAGMA table_info(patients)")
            columns = [col[1] for col in c.fetchall()]
            
            patient_dict = {}
            for i, col in enumerate(columns):
                patient_dict[col] = patient[i]
            
            wait_time = calculate_wait_time(patient_dict['doctor_id'], patient_dict['queue_position'])
            
            c.execute("UPDATE patients SET estimated_wait_time = ? WHERE token_number = ?", 
                     (wait_time, token))
            conn.commit()
            
            result = {
                'name': patient_dict['name'],
                'token': patient_dict['token_number'],
                'position': patient_dict['queue_position'],
                'status': patient_dict['status'],
                'doctor': patient[14],
                'specialization': patient[15] if len(patient) > 15 else 'General',
                'wait_time': wait_time,
                'registration_time': patient_dict['registration_time']
            }
        else:
            result = {'error': 'Patient not found'}
        
        conn.close()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting queue status: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Doctor Dashboard - Update status
@app.route('/api/doctor/update/<int:doctor_id>', methods=['POST'])
def update_doctor_status(doctor_id):
    try:
        data = request.json
        status = data.get('status')
        current_patient = data.get('current_patient')
        
        logger.info(f"Updating doctor {doctor_id} - Status: {status}, Patient: {current_patient}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("SELECT id, name, status FROM doctors WHERE id = ?", (doctor_id,))
        doctor = c.fetchone()
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor not found'}), 404
        
        c.execute("""UPDATE doctors 
                     SET status = ?, current_patient = ? 
                     WHERE id = ?""",
                  (status, current_patient, doctor_id))
        
        if status == 'Busy' and current_patient:
            logger.info(f"Starting consultation for patient: {current_patient}")
            
            c.execute("""SELECT id, status, doctor_id FROM patients 
                         WHERE token_number = ?""", (current_patient,))
            patient = c.fetchone()
            
            if patient:
                patient_id, patient_status, patient_doctor_id = patient
                
                if patient_status == 'waiting':
                    c.execute("""UPDATE patients 
                                 SET status = 'consulting' 
                                 WHERE token_number = ?""", (current_patient,))
                    
                    update_queue_positions(doctor_id)
                    
                    socketio.emit('notification', {
                        'type': 'consultation_started',
                        'message': f'Consultation started for {current_patient}',
                        'token': current_patient
                    })
            else:
                return jsonify({'success': False, 'message': 'Patient not found'}), 404
        
        conn.commit()
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({'success': True, 'message': 'Doctor status updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating doctor status: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# NEW: Save patient report
@app.route('/api/patient/report', methods=['POST'])
def save_patient_report():
    try:
        data = request.json
        logger.info(f"Saving report for patient: {data.get('patient_name')}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        now = datetime.datetime.now()
        report_date = now.strftime("%Y-%m-%d")
        report_time = now.strftime("%H:%M:%S")
        
        c.execute("""INSERT INTO patient_reports 
                     (patient_id, patient_name, patient_token, doctor_id, doctor_name, 
                      report_text, report_date, report_time)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                  (data['patient_id'], data['patient_name'], data['patient_token'],
                   data['doctor_id'], data['doctor_name'], data['report_text'],
                   report_date, report_time))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Report saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving report: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# NEW: Get all reports for admin
@app.route('/api/admin/reports', methods=['GET'])
def get_all_reports():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT * FROM patient_reports ORDER BY report_date DESC, report_time DESC""")
        reports = c.fetchall()
        
        report_list = []
        for r in reports:
            report_list.append({
                'id': r[0],
                'patient_id': r[1],
                'patient_name': r[2],
                'patient_token': r[3],
                'doctor_id': r[4],
                'doctor_name': r[5],
                'report_text': r[6],
                'report_date': r[7],
                'report_time': r[8]
            })
        
        conn.close()
        return jsonify(report_list)
        
    except Exception as e:
        logger.error(f"Error getting reports: {str(e)}")
        return jsonify({'error': str(e)}), 500

# NEW: Get reports by doctor
@app.route('/api/doctor/reports/<int:doctor_id>', methods=['GET'])
def get_doctor_reports(doctor_id):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT * FROM patient_reports 
                     WHERE doctor_id = ? 
                     ORDER BY report_date DESC, report_time DESC""", (doctor_id,))
        reports = c.fetchall()
        
        report_list = []
        for r in reports:
            report_list.append({
                'id': r[0],
                'patient_id': r[1],
                'patient_name': r[2],
                'patient_token': r[3],
                'doctor_id': r[4],
                'doctor_name': r[5],
                'report_text': r[6],
                'report_date': r[7],
                'report_time': r[8]
            })
        
        conn.close()
        return jsonify(report_list)
        
    except Exception as e:
        logger.error(f"Error getting doctor reports: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Get completed patients for a doctor (to show write report option)
@app.route('/api/doctor/<int:doctor_id>/completed-patients', methods=['GET'])
def get_completed_patients(doctor_id):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        today = datetime.datetime.now().date().isoformat()
        
        c.execute("""SELECT id, name, token_number, registration_time
                     FROM patients 
                     WHERE doctor_id = ? AND status = 'completed' 
                     AND DATE(registration_time) = ?
                     ORDER BY registration_time DESC""", (doctor_id, today))
        patients = c.fetchall()
        
        patient_list = []
        for p in patients:
            patient_list.append({
                'id': p[0],
                'name': p[1],
                'token': p[2],
                'registration_time': p[3]
            })
        
        conn.close()
        return jsonify(patient_list)
        
    except Exception as e:
        logger.error(f"Error getting completed patients: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin Panel - Get analytics
@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        today = datetime.datetime.now().date().isoformat()
        
        c.execute("""SELECT COUNT(*), AVG(estimated_wait_time) 
                     FROM patients 
                     WHERE DATE(registration_time) = ?""", (today,))
        today_stats = c.fetchone()
        
        c.execute("""SELECT d.specialization, COUNT(p.id) as patient_count
                     FROM doctors d
                     LEFT JOIN patients p ON d.id = p.doctor_id AND p.status = 'waiting'
                     GROUP BY d.specialization""")
        congestion = c.fetchall()
        
        c.execute("""SELECT d.name, AVG(h.consultation_time) as avg_time
                     FROM queue_history h
                     JOIN doctors d ON h.doctor_id = d.id
                     GROUP BY d.id""")
        consultation_times = c.fetchall()
        
        c.execute("""SELECT strftime('%H', registration_time) as hour, COUNT(*) as count
                     FROM patients
                     WHERE registration_time >= datetime('now', '-7 days')
                     GROUP BY hour
                     ORDER BY count DESC LIMIT 5""")
        peak_hours = c.fetchall()
        
        conn.close()
        
        return jsonify({
            'today_patients': today_stats[0] or 0,
            'avg_wait_time': round(today_stats[1] or 0, 1),
            'congestion': [{'dept': c[0] if c[0] else 'General', 'count': c[1]} for c in congestion],
            'avg_consultation': [{'doctor': ct[0], 'time': round(ct[1] or 0, 1)} for ct in consultation_times],
            'peak_hours': [{'hour': ph[0], 'count': ph[1]} for ph in peak_hours]
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Get full queue status
@app.route('/api/queue/status', methods=['GET'])
def get_full_queue():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT p.token_number, p.name, p.queue_position, d.name as doctor_name,
                     p.estimated_wait_time, p.status
                     FROM patients p
                     JOIN doctors d ON p.doctor_id = d.id
                     WHERE p.status IN ('waiting', 'consulting')
                     ORDER BY 
                        CASE 
                            WHEN p.status = 'consulting' THEN 0 
                            ELSE p.queue_position 
                        END ASC""")
        queue = c.fetchall()
        
        queue_data = []
        for q in queue:
            queue_data.append({
                'token': q[0],
                'patient': q[1],
                'position': q[2] if q[5] == 'waiting' else 0,
                'doctor': q[3],
                'wait_time': q[4] if q[5] == 'waiting' else 0,
                'status': q[5]
            })
        
        conn.close()
        logger.info(f"GET /api/queue/status - Found {len(queue_data)} patients")
        return jsonify(queue_data)
        
    except Exception as e:
        logger.error(f"Error getting full queue: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Handle doctor delay with automatic return
@app.route('/api/doctor/delay/<int:doctor_id>', methods=['POST'])
def doctor_delay(doctor_id):
    try:
        data = request.json
        delay_minutes = data['delay_minutes']
        reason = data.get('reason', 'Emergency')
        
        logger.info(f"Doctor {doctor_id} delayed by {delay_minutes} minutes due to {reason}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        available_time = datetime.datetime.now() + datetime.timedelta(minutes=delay_minutes)
        available_time_str = available_time.strftime("%I:%M %p")
        
        c.execute("""SELECT id, estimated_wait_time, token_number FROM patients 
                     WHERE doctor_id = ? AND status = 'waiting'""", (doctor_id,))
        patients = c.fetchall()
        
        for patient_id, current_wait, token in patients:
            new_wait = current_wait + delay_minutes
            c.execute("UPDATE patients SET estimated_wait_time = ? WHERE id = ?", (new_wait, patient_id))
            
            socketio.emit('notification', {
                'type': 'delay',
                'message': f'Doctor delayed by {delay_minutes} minutes until {available_time_str} due to {reason}',
                'token': token,
                'new_wait_time': new_wait,
                'available_time': available_time_str
            })
        
        c.execute("""UPDATE doctors 
                     SET status = 'Delayed', 
                         next_available_time = ? 
                     WHERE id = ?""", (available_time_str, doctor_id))
        
        conn.commit()
        conn.close()
        
        schedule_delay_return(doctor_id, delay_minutes)
        
        broadcast_queue_status()
        
        return jsonify({
            'success': True, 
            'message': f'Delay reported until {available_time_str}',
            'available_time': available_time_str
        })
        
    except Exception as e:
        logger.error(f"Error reporting delay: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Return from delay manually
@app.route('/api/doctor/return-from-delay/<int:doctor_id>', methods=['POST'])
def return_from_delay(doctor_id):
    try:
        logger.info(f"Doctor {doctor_id} returning from delay manually")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""UPDATE doctors 
                     SET status = 'Available', next_available_time = NULL 
                     WHERE id = ?""", (doctor_id,))
        
        conn.commit()
        
        c.execute("""SELECT token_number FROM patients 
                     WHERE doctor_id = ? AND status = 'waiting'""", (doctor_id,))
        patients = c.fetchall()
        
        for (token,) in patients:
            socketio.emit('notification', {
                'type': 'doctor_returned',
                'message': f'Doctor is now available again',
                'token': token
            })
        
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({'success': True, 'message': 'Doctor is now available'})
        
    except Exception as e:
        logger.error(f"Error returning from delay: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Reset database (for development only)
@app.route('/api/reset-db', methods=['POST'])
def reset_database():
    try:
        conn = sqlite3.connect('queue.db')
        conn.close()
        
        if os.path.exists('queue.db'):
            os.remove('queue.db')
            logger.info("Database file deleted")
        
        init_db()
        
        return jsonify({'success': True, 'message': 'Database reset successfully'})
        
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Get all doctors with their current patients
@app.route('/api/doctors/with-patients', methods=['GET'])
def get_doctors_with_patients():
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT d.*, 
                    COUNT(CASE WHEN p.status = 'waiting' THEN 1 END) as waiting_count,
                    COUNT(CASE WHEN p.status = 'consulting' THEN 1 END) as consulting_count
                    FROM doctors d
                    LEFT JOIN patients p ON d.id = p.doctor_id
                    GROUP BY d.id""")
        doctors = c.fetchall()
        
        doctor_list = []
        for d in doctors:
            doctor_list.append({
                'id': d[0],
                'name': d[1],
                'specialization': d[2],
                'status': d[3],
                'current_patient': d[4],
                'avg_time': d[5],
                'waiting_count': d[7] or 0,
                'consulting_count': d[8] or 0
            })
        
        conn.close()
        return jsonify(doctor_list)
        
    except Exception as e:
        logger.error(f"Error getting doctors: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add new doctor
@app.route('/api/doctors/add', methods=['POST'])
def add_doctor():
    try:
        data = request.json
        logger.info(f"Adding new doctor: {data.get('name')}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""INSERT INTO doctors (name, specialization, status, avg_consultation_time) 
                     VALUES (?, ?, ?, ?)""",
                  (data['name'], data['specialization'], 'Available', data['avg_time']))
        
        doctor_id = c.lastrowid
        conn.commit()
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({'success': True, 'id': doctor_id, 'message': 'Doctor added successfully'})
        
    except Exception as e:
        logger.error(f"Error adding doctor: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Update doctor information
@app.route('/api/doctors/update/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    try:
        data = request.json
        logger.info(f"Updating doctor {doctor_id}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""UPDATE doctors 
                     SET name = ?, specialization = ?, avg_consultation_time = ?
                     WHERE id = ?""",
                  (data['name'], data['specialization'], data['avg_time'], doctor_id))
        
        conn.commit()
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({'success': True, 'message': 'Doctor updated successfully'})
        
    except Exception as e:
        logger.error(f"Error updating doctor: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Delete doctor
@app.route('/api/doctors/delete/<int:doctor_id>', methods=['DELETE'])
def delete_doctor(doctor_id):
    try:
        logger.info(f"Deleting doctor {doctor_id}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("SELECT COUNT(*) FROM patients WHERE doctor_id = ? AND status IN ('waiting', 'consulting')", (doctor_id,))
        patient_count = c.fetchone()[0]
        
        if patient_count > 0:
            conn.close()
            return jsonify({'success': False, 'message': 'Cannot delete doctor with active patients'}), 400
        
        c.execute("DELETE FROM doctors WHERE id = ?", (doctor_id,))
        conn.commit()
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({'success': True, 'message': 'Doctor deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting doctor: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Get doctor's patients
@app.route('/api/doctor/<int:doctor_id>/patients', methods=['GET'])
def get_doctor_patients(doctor_id):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("""SELECT p.token_number, p.name, p.queue_position, p.estimated_wait_time, p.status,
                    p.registration_time
                     FROM patients p
                     WHERE p.doctor_id = ? AND p.status IN ('waiting', 'consulting')
                     ORDER BY 
                        CASE 
                            WHEN p.status = 'consulting' THEN 0 
                            ELSE p.queue_position 
                        END ASC""", (doctor_id,))
        patients = c.fetchall()
        
        patient_list = []
        for p in patients:
            patient_list.append({
                'token': p[0],
                'name': p[1],
                'position': p[2] if p[4] == 'waiting' else 0,
                'wait_time': p[3] if p[4] == 'waiting' else 0,
                'status': p[4],
                'registration_time': p[5]
            })
        
        conn.close()
        return jsonify(patient_list)
        
    except Exception as e:
        logger.error(f"Error getting doctor patients: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Complete consultation and move to next patient
@app.route('/api/doctor/complete-consultation/<int:doctor_id>', methods=['POST'])
def complete_consultation(doctor_id):
    try:
        logger.info(f"Completing consultation for doctor {doctor_id}")
        
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        c.execute("SELECT current_patient FROM doctors WHERE id = ?", (doctor_id,))
        result = c.fetchone()
        current_patient = result[0] if result else None
        
        completed_patient_id = None
        completed_patient_name = None
        completed_patient_token = None
        
        if current_patient:
            logger.info(f"Completing consultation for patient: {current_patient}")
            
            c.execute("SELECT id, name FROM patients WHERE token_number = ?", (current_patient,))
            patient_info = c.fetchone()
            if patient_info:
                completed_patient_id = patient_info[0]
                completed_patient_name = patient_info[1]
                completed_patient_token = current_patient
            
            c.execute("""UPDATE patients 
                         SET status = 'completed' 
                         WHERE token_number = ?""", (current_patient,))
        
        c.execute("""SELECT token_number, id FROM patients 
                     WHERE doctor_id = ? AND status = 'waiting' 
                     ORDER BY queue_position ASC LIMIT 1""", (doctor_id,))
        next_patient = c.fetchone()
        
        if next_patient:
            logger.info(f"Next patient: {next_patient[0]}")
            
            c.execute("""UPDATE doctors 
                         SET status = 'Busy', current_patient = ? 
                         WHERE id = ?""", (next_patient[0], doctor_id))
            c.execute("""UPDATE patients 
                         SET status = 'consulting' 
                         WHERE token_number = ?""", (next_patient[0],))
            
            update_queue_positions(doctor_id)
            
            socketio.emit('notification', {
                'type': 'turn_alert',
                'message': f'Your turn now! Please proceed',
                'token': next_patient[0]
            })
            
            message = f"Now consulting: {next_patient[0]}"
            next_token = next_patient[0]
        else:
            logger.info("No more patients in queue")
            c.execute("""UPDATE doctors 
                         SET status = 'Available', current_patient = NULL 
                         WHERE id = ?""", (doctor_id,))
            message = "No patients in queue"
            next_token = None
        
        conn.commit()
        conn.close()
        
        broadcast_queue_status()
        
        return jsonify({
            'success': True, 
            'message': message, 
            'next_patient': next_token,
            'completed_patient': {
                'id': completed_patient_id,
                'name': completed_patient_name,
                'token': completed_patient_token
            } if completed_patient_id else None
        })
        
    except Exception as e:
        logger.error(f"Error completing consultation: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Get today's statistics for a doctor
@app.route('/api/doctor/<int:doctor_id>/stats', methods=['GET'])
def get_doctor_stats(doctor_id):
    try:
        conn = sqlite3.connect('queue.db')
        c = conn.cursor()
        
        today = datetime.datetime.now().date().isoformat()
        
        c.execute("""SELECT COUNT(*) FROM patients 
                     WHERE doctor_id = ? AND DATE(registration_time) = ? 
                     AND status = 'completed'""", (doctor_id, today))
        seen_today = c.fetchone()[0] or 0
        
        conn.close()
        
        return jsonify({
            'seen_today': seen_today,
            'avg_consult_time': 0
        })
        
    except Exception as e:
        logger.error(f"Error getting doctor stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Hospital Queue Management System...")
    init_db()
    logger.info("Server starting on http://localhost:5000")
    socketio.run(app, debug=True, port=5000)