# check_db.py
import sqlite3

conn = sqlite3.connect('queue.db')
c = conn.cursor()

print("="*50)
print("DATABASE CHECK")
print("="*50)

# Check doctors
print("\n📋 DOCTORS TABLE:")
c.execute("SELECT * FROM doctors")
doctors = c.fetchall()
for doc in doctors:
    print(f"ID: {doc[0]}, Name: {doc[1]}, Specialization: {doc[2]}, Status: {doc[3]}")

# Check patients
print("\n📋 PATIENTS TABLE:")
c.execute("SELECT * FROM patients")
patients = c.fetchall()
for pat in patients:
    print(f"ID: {pat[0]}, Name: {pat[1]}, Token: {pat[7]}, Status: {pat[9]}, Doctor ID: {pat[6]}")

conn.close()
print("\n" + "="*50)