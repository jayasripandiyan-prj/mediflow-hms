# 🏥 MediFlow - Hospital Queue Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Flask](https://img.shields.io/badge/Flask-2.3.2-000000)
![License](https://img.shields.io/badge/license-MIT-green)

## 📌 Overview

MediFlow is a **production-ready hospital queue management system** that eliminates waiting room chaos. Patients receive digital tokens, doctors manage consultations with one click, and admins get live analytics.

**Live Demo:** [https://mediflow.vercel.app](https://mediflow.vercel.app)

---

## ✨ Features

| Module | Capabilities |
|--------|--------------|
| **Patient Portal** | Digital token generation, real-time queue tracking, estimated wait time |
| **Doctor Dashboard** | Live patient queue, one-click consultation, delay reporting with auto-return |
| **Admin Panel** | Analytics dashboard, department congestion, peak hours analysis |
| **Medical Records** | Write reports per patient, view history with timestamps |
| **Authentication** | Role-based access (Patient/Doctor/Admin), secure session management |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, Axios, Socket.io-client, Chart.js |
| Backend | Python 3, Flask, Flask-SocketIO, Flask-CORS |
| Database | SQLite3 |
| Real-time | WebSocket |
| Deployment | Vercel (frontend), Render (backend) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py