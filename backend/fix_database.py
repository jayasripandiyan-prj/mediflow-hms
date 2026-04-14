# fix_database.py
import sqlite3
import os

def fix_database():
    print("=" * 50)
    print("HOSPITAL QUEUE SYSTEM - DATABASE FIX")
    print("=" * 50)
    
    # Check if database exists
    if os.path.exists('queue.db'):
        print(f"\n✅ Database file found: queue.db ({os.path.getsize('queue.db')} bytes)")
    else:
        print("\n❌ Database file not found. Creating new one...")
    
    # Connect to database
    conn = sqlite3.connect('queue.db')
    c = conn.cursor()
    
    # Get current schema
    print("\n📊 CURRENT DATABASE SCHEMA:")
    print("-" * 30)
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    
    if not tables:
        print("No tables found. Creating fresh database...")
    else:
        for table in tables:
            table_name = table[0]
            print(f"\nTable: {table_name}")
            c.execute(f"PRAGMA table_info({table_name})")
            columns = c.fetchall()
            for col in columns:
                print(f"  - {col[1]}: {col[2]}")
    
    print("\n🔧 FIXING DATABASE STRUCTURE...")
    print("-" * 30)
    
    # Drop and recreate doctors table with correct schema
    print("Recreating doctors table with correct schema...")
    c.execute("DROP TABLE IF EXISTS doctors")
    c.execute('''CREATE TABLE doctors
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  specialization TEXT NOT NULL,
                  status TEXT DEFAULT 'Available',
                  current_patient TEXT,
                  avg_consultation_time INTEGER DEFAULT 15,
                  next_available_time TEXT)''')
    print("✅ Doctors table created")
    
    # Recreate patients table
    print("Recreating patients table...")
    c.execute("DROP TABLE IF EXISTS patients")
    c.execute('''CREATE TABLE patients
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
    print("✅ Patients table created")
    
    # Recreate queue_history table
    print("Recreating queue_history table...")
    c.execute("DROP TABLE IF EXISTS queue_history")
    c.execute('''CREATE TABLE queue_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  doctor_id INTEGER,
                  patient_id INTEGER,
                  wait_time INTEGER,
                  consultation_time INTEGER,
                  timestamp TEXT,
                  FOREIGN KEY (doctor_id) REFERENCES doctors (id),
                  FOREIGN KEY (patient_id) REFERENCES patients (id))''')
    print("✅ Queue history table created")
    
    # Insert sample doctors
    print("\n👨‍⚕️ INSERTING SAMPLE DOCTORS:")
    print("-" * 30)
    
    doctors = [
        ('Dr. Rajesh Kumar', 'Cardiologist', 'Available', None, 15),
        ('Dr. Priya Sharma', 'Neurologist', 'Available', None, 20),
        ('Dr. Amit Patel', 'Orthopedic', 'Available', None, 12),
        ('Dr. Sneha Reddy', 'Pediatrician', 'Available', None, 10),
        ('Dr. Vikram Singh', 'General Physician', 'Available', None, 8)
    ]
    
    for doctor in doctors:
        c.execute("""INSERT INTO doctors 
                     (name, specialization, status, current_patient, avg_consultation_time) 
                     VALUES (?, ?, ?, ?, ?)""",
                  (doctor[0], doctor[1], doctor[2], doctor[3], doctor[4]))
        print(f"✅ Added: {doctor[0]} - {doctor[1]}")
    
    # Commit changes
    conn.commit()
    
    # Verify the fix
    print("\n✅ VERIFYING DATABASE:")
    print("-" * 30)
    
    c.execute("SELECT COUNT(*) FROM doctors")
    doctor_count = c.fetchone()[0]
    print(f"Doctors in database: {doctor_count}")
    
    c.execute("SELECT * FROM doctors")
    doctors = c.fetchall()
    for doctor in doctors:
        print(f"\nDoctor ID: {doctor[0]}")
        print(f"  Name: {doctor[1]}")
        print(f"  Specialization: {doctor[2]}")
        print(f"  Status: {doctor[3]}")
        print(f"  Avg Time: {doctor[5]} minutes")
    
    # Show all tables
    print("\n📋 FINAL TABLES IN DATABASE:")
    print("-" * 30)
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    for table in tables:
        c.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = c.fetchone()[0]
        print(f"  📁 {table[0]}: {count} records")
    
    conn.close()
    
    print("\n" + "=" * 50)
    print("✅ DATABASE FIX COMPLETE!")
    print("=" * 50)
    print("\nNext steps:")
    print("1. Run: python app.py")
    print("2. Open browser: http://localhost:5000")
    print("3. Test the API: http://localhost:5000/api/doctors")

if __name__ == "__main__":
    fix_database()