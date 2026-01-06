# Face Recognition Microservice for Attendance System

A production-ready, stateless AI microservice for face enrollment and verification built with FastAPI, DeepFace, and OpenCV.

## 🎯 Features

### 1. **Face Enrollment**
- Detects face in uploaded image
- Generates high-dimensional face embedding (512-D using FaceNet512)
- Returns embedding vector for external storage
- Quality scoring and validation

### 2. **Face Verification**
- Compares live face against stored embedding
- Returns match status (true/false)
- Provides confidence score (0-100%)
- Threshold-based decision making

### 3. **Liveness Detection (Basic)**
- Rejects static low-quality images
- Face consistency validation
- Quality threshold enforcement
- Blur and lighting checks

### 4. **Security Features**
- Non-face image rejection
- Multiple face detection
- Suspicious activity logging
- Size and quality validation
- No raw image storage (stateless)

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│ Application │
└──────┬──────┘
       │
       │ HTTP REST API
       │
┌──────▼──────────────────────────────────────┐
│         FastAPI Application                  │
│  ┌────────────────┐  ┌───────────────────┐  │
│  │ /enroll        │  │ /verify           │  │
│  │ Endpoint       │  │ Endpoint          │  │
│  └────────┬───────┘  └────────┬──────────┘  │
│           │                   │              │
│  ┌────────▼───────────────────▼──────────┐  │
│  │   Face Recognition Service            │  │
│  │  • Face Detection (OpenCV)            │  │
│  │  • Embedding Generation (FaceNet512)  │  │
│  │  • Similarity Calculation             │  │
│  │  • Quality Assessment                 │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 🚀 Installation

### Prerequisites
- Python 3.8+
- pip
- Virtual environment (recommended)

### Setup

1. **Clone or download the project**
```bash
cd face-recognition-microservice
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

4. **Configure environment (optional)**
```bash
cp .env.example .env
# Edit .env if you need to customize settings
```

5. **Run the service**
```bash
python main.py
```

The service will start on `http://localhost:8000`

## 📡 API Documentation

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "face_recognition_microservice",
  "timestamp": "2024-01-15T10:00:00.000000"
}
```

---

### Face Enrollment

Enroll a new face by uploading an image. The service detects the face, validates quality, and returns a 512-dimensional embedding vector.

```http
POST /enroll
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST "http://localhost:8000/enroll" \
  -F "image=@person_face.jpg"
```

**Success Response (200):**
```json
{
  "success": true,
  "embedding": [0.123, -0.456, 0.789, ... (512 values)],
  "message": "Face enrolled successfully",
  "face_detected": true,
  "quality_score": 87.5,
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

**Error Responses:**

*No Face Detected (200 with success=false):*
```json
{
  "success": false,
  "embedding": null,
  "message": "No face detected in the image. Please ensure face is clearly visible.",
  "face_detected": false,
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

*Multiple Faces (400):*
```json
{
  "success": false,
  "message": "Multiple faces detected (3). Please provide image with single face.",
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

*Low Quality (400):*
```json
{
  "success": false,
  "message": "Image quality too low (score: 25.3/100). Please provide clearer image with better lighting.",
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

---

### Face Verification

Verify a live face image against a stored embedding. Returns whether faces match and confidence score.

```http
POST /verify
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST "http://localhost:8000/verify" \
  -F "image=@live_face.jpg" \
  -F 'stored_embedding=[0.123,-0.456,0.789,...]'
```

**Success Response - Match (200):**
```json
{
  "success": true,
  "match": true,
  "confidence": 92.45,
  "message": "Verification completed successfully",
  "similarity_score": 0.0755,
  "threshold_used": 0.40,
  "timestamp": "2024-01-15T10:35:00.000000"
}
```

**Success Response - No Match (200):**
```json
{
  "success": true,
  "match": false,
  "confidence": 45.32,
  "message": "Verification completed successfully",
  "similarity_score": 0.5468,
  "threshold_used": 0.40,
  "timestamp": "2024-01-15T10:36:00.000000"
}
```

**Error Response - No Face (200 with success=false):**
```json
{
  "success": false,
  "match": false,
  "confidence": 0.0,
  "message": "No face detected in the image. Please ensure face is clearly visible.",
  "threshold_used": 0.40,
  "timestamp": "2024-01-15T10:37:00.000000"
}
```

---

## 🔧 Configuration

### Model Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MODEL_NAME` | Facenet512 | Face recognition model (512-D embeddings) |
| `DETECTOR_BACKEND` | opencv | Face detection backend |
| `VERIFICATION_THRESHOLD` | 0.40 | Cosine distance threshold (lower = stricter) |

### Quality Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MIN_FACE_SIZE` | 80px | Minimum face dimension |
| `MIN_IMAGE_SIZE` | 150px | Minimum image dimension |
| `MAX_IMAGE_SIZE` | 4096px | Maximum image dimension |
| `QUALITY_THRESHOLD` | 30.0 | Minimum quality score (0-100) |

## 📊 Performance Metrics

### Model Performance
- **Model**: FaceNet512
- **Embedding Size**: 512 dimensions
- **Accuracy**: ~99.6% on LFW dataset
- **Speed**: ~100-200ms per request (CPU)

### Quality Scoring
Quality score (0-100) based on:
- **Sharpness** (50%): Laplacian variance
- **Brightness** (30%): Optimal lighting check
- **Face Size** (20%): Face-to-image ratio

## 🔒 Security Features

### 1. **Image Validation**
- File type verification
- Size constraints (150px - 4096px)
- Face detection requirement

### 2. **Quality Checks**
- Minimum quality score threshold
- Blur detection
- Lighting validation
- Face size verification

### 3. **Liveness Detection (Basic)**
- Quality threshold prevents low-res prints
- Face consistency checks
- Multiple validation layers

### 4. **Logging**
- All suspicious attempts logged
- Failed verifications tracked
- Security alerts for anomalies

### 5. **Stateless Design**
- No raw image storage
- No database connections
- Caller manages embedding storage

## 🧪 Testing

### Using the Example Client

```python
from example_client import FaceRecognitionClient

# Initialize client
client = FaceRecognitionClient("http://localhost:8000")

# Enroll a face
result = client.enroll_face("person1.jpg")
embedding = result['embedding']

# Verify a face
verification = client.verify_face("person1_verify.jpg", embedding)
print(f"Match: {verification['match']}")
print(f"Confidence: {verification['confidence']}%")
```

### Run Example Script

```bash
python example_client.py
```

This displays example API requests/responses and can run live tests with your images.

## 🏢 Production Deployment

### Using Docker (Recommended)

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Build and run:
```bash
docker build -t face-recognition-service .
docker run -p 8000:8000 face-recognition-service
```

### Using Gunicorn (Production Server)

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📈 Integration Example

### Attendance System Integration

```python
import requests
import json

class AttendanceSystem:
    def __init__(self):
        self.face_service = "http://localhost:8000"
        self.db = self.connect_database()  # Your DB connection
    
    def register_employee(self, employee_id: str, photo_path: str):
        """Register new employee"""
        # 1. Call face enrollment service
        with open(photo_path, 'rb') as f:
            response = requests.post(
                f"{self.face_service}/enroll",
                files={'image': f}
            )
        
        result = response.json()
        
        if result['success']:
            # 2. Store embedding in your database
            self.db.store_embedding(
                employee_id=employee_id,
                embedding=result['embedding'],
                quality_score=result['quality_score']
            )
            return True
        return False
    
    def mark_attendance(self, live_photo_path: str):
        """Mark attendance using face verification"""
        # 1. Get all employee embeddings from DB
        employees = self.db.get_all_employees()
        
        # 2. Check against each employee
        for employee in employees:
            with open(live_photo_path, 'rb') as f:
                response = requests.post(
                    f"{self.face_service}/verify",
                    files={'image': f},
                    data={'stored_embedding': json.dumps(employee['embedding'])}
                )
            
            result = response.json()
            
            # 3. If match found, mark attendance
            if result['match'] and result['confidence'] > 85:
                self.db.mark_attendance(
                    employee_id=employee['id'],
                    timestamp=result['timestamp'],
                    confidence=result['confidence']
                )
                return employee
        
        return None  # No match found
```

## 🔍 Troubleshooting

### Issue: Model Download Fails
**Solution**: Ensure internet connectivity on first run. The service downloads FaceNet512 model (~90MB).

### Issue: Low Verification Accuracy
**Solutions**:
- Ensure enrollment and verification images have similar lighting
- Use high-quality cameras (minimum 720p)
- Ensure faces are clearly visible and centered
- Adjust `VERIFICATION_THRESHOLD` (lower = stricter)

### Issue: Slow Performance
**Solutions**:
- Use GPU-enabled TensorFlow for faster inference
- Increase worker count in production
- Consider using FaceNet128 for faster processing (less accurate)

### Issue: "No Face Detected" Errors
**Solutions**:
- Ensure face is clearly visible and well-lit
- Face should occupy at least 15-20% of image
- Avoid extreme angles or occlusions
- Check minimum image size (150x150px)

## 📝 Best Practices

1. **Enrollment**
   - Use high-quality, well-lit images
   - Front-facing photos work best
   - Avoid sunglasses, masks, or occlusions
   - Store multiple embeddings per person for better accuracy

2. **Verification**
   - Consistent lighting conditions
   - Similar camera angles to enrollment
   - Real-time frame capture from video stream
   - Implement retry logic for low-confidence results

3. **Security**
   - Set appropriate confidence thresholds (85%+ recommended)
   - Monitor failed verification attempts
   - Implement rate limiting at application level
   - Use HTTPS in production

4. **Scalability**
   - Service is stateless - scale horizontally
   - Offload embedding storage to external database
   - Use load balancer for multiple instances
   - Consider caching frequently accessed embeddings

## 📚 Technology Stack

- **FastAPI**: Modern, fast web framework
- **DeepFace**: Face recognition library
- **FaceNet512**: State-of-the-art face recognition model
- **OpenCV**: Computer vision library
- **TensorFlow**: Deep learning framework
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

## 📄 License

This is a demonstration project for educational purposes.

## 🤝 Support

For issues, questions, or contributions, please refer to the project repository or documentation.

## 🔄 Version History

- **v1.0.0** - Initial release
  - Face enrollment with FaceNet512
  - Face verification with confidence scoring
  - Basic liveness detection
  - Quality assessment
  - Security logging

---

**Built with ❤️ for secure and efficient attendance systems**
