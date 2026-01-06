# Attendance Hub - Full Stack Integration Guide

This document explains how all components of the attendance hub system work together to provide a complete face recognition-based attendance tracking solution.

## Architecture Overview

The system consists of three main components:

1. **Frontend** - React application with face capture and UI
2. **Backend** - Node.js API server with database integration
3. **AI Service** - Python face recognition service

## How It All Works Together

### 1. User Authentication Flow
- Frontend: Users log in via `/auth` route
- Backend: Authenticates users and manages sessions
- Database: Stores user credentials and roles

### 2. Face Enrollment Process
- Frontend: User captures face image via camera component
- Frontend: Sends base64 image to backend `/api/face/enroll`
- Backend: Forwards image to AI service for processing
- AI Service: Generates face embedding using DeepFace
- Backend: Stores embedding in database
- Frontend: Receives confirmation and updates UI

### 3. Attendance Marking Process
- Frontend: User captures face for attendance check-in/check-out
- Frontend: Sends location data + face image to `/api/attendance/mark`
- Backend: 
  - Performs geofencing validation
  - Forwards face image to AI service
  - AI Service: Verifies face against stored embedding
  - Backend: Records attendance in database if verification passes
- Frontend: Shows confirmation with confidence score

### 4. Data Management
- Admin dashboard shows all attendance records
- Suspicious activity tracking
- User management interface

## Running the Complete System

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- PostgreSQL database

### 1. Start the AI Service
```bash
cd ai-service
pip install -r requirements.txt
python main.py
```
The AI service will run on `http://localhost:8000`

### 2. Start the Backend
```bash
cd backend
npm install
# Set up your .env file with database connection
cp .env.example .env
# Update DATABASE_URL in .env
npm run dev
```
The backend will run on `http://localhost:5000`

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`

## API Endpoints

### Backend API (Node.js server on port 5000)
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/face/enroll` - Face enrollment (connects to AI service)
- `POST /api/attendance/mark` - Mark attendance (connects to AI service)
- `GET /api/attendance/history` - Get user attendance history
- `GET /api/admin/attendance` - Get all attendance (admin)
- `GET /api/admin/users` - Get all users (admin)

### AI Service API (Python server on port 8000)
- `POST /enroll` - Face enrollment
- `POST /verify` - Face verification
- `GET /health` - Service health check

## Environment Configuration

### Backend (.env)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/attendance_hub"
AI_SERVICE_URL="http://localhost:8000"
SESSION_SECRET="your-secret-key"
PORT=5000
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:5000
```

## Data Flow Example

1. **User Enrolls Face:**
   Frontend → Backend `/api/face/enroll` → AI Service `/enroll` → Database

2. **User Marks Attendance:**
   Frontend → Backend `/api/attendance/mark` → 
   - Geofencing check → 
   - AI Service `/verify` → 
   - Database (if successful) → 
   - Frontend response

## Error Handling

- Network errors between services are handled gracefully
- Face verification failures are logged for security
- Geofencing violations prevent attendance marking
- Session management prevents unauthorized access

## Security Features

- Face-based authentication prevents proxy attendance
- Geofencing ensures location-based attendance
- Session-based authentication
- Suspicious activity logging