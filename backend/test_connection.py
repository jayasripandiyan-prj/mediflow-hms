# test_connection.py
import requests
import json
import time

def test_server():
    print("=" * 50)
    print("TESTING HOSPITAL QUEUE SYSTEM")
    print("=" * 50)
    
    # Test if server is running
    print("\n1. Checking if server is running...")
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=2)
        print(f"   ✅ Server is running! Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Server is not running!")
        print("   Please start the server first with: python app.py")
        return
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return
    
    # Test get doctors
    print("\n2. Fetching doctors list...")
    try:
        response = requests.get("http://localhost:5000/api/doctors")
        if response.status_code == 200:
            doctors = response.json()
            print(f"   ✅ Found {len(doctors)} doctors:")
            for doctor in doctors:
                print(f"      • {doctor['name']} - {doctor['specialization']} ({doctor['status']})")
        else:
            print(f"   ❌ Failed to get doctors. Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test queue status
    print("\n3. Checking queue status...")
    try:
        response = requests.get("http://localhost:5000/api/queue/status")
        if response.status_code == 200:
            queue = response.json()
            print(f"   ✅ Queue status retrieved. {len(queue)} patients in queue.")
        else:
            print(f"   ❌ Failed to get queue status. Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ TEST COMPLETE")
    print("=" * 50)
    print("\nIf all tests passed, your system is ready!")
    print("Open http://localhost:3000 in your browser to use the application.")

if __name__ == "__main__":
    test_server()