# Deployment & Usage Guide

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# Clone the repository
cd face-recognition-microservice

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

Service will be available at: `http://localhost:8000`

### 2. Using Docker

```bash
# Build the image
docker build -t face-recognition-service .

# Run the container
docker run -p 8000:8000 face-recognition-service

# Or use docker-compose
docker-compose up -d
```

## 📱 Integration Examples

### Python Integration

```python
import requests
import json

BASE_URL = "http://localhost:8000"

# Enrollment
def enroll_employee(image_path, employee_id):
    with open(image_path, 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/enroll",
            files={'image': f}
        )
    
    if response.status_code == 200:
        result = response.json()
        if result['success']:
            # Store embedding in your database
            save_to_database(employee_id, result['embedding'])
            return True
    return False

# Verification
def verify_attendance(image_path, stored_embedding):
    with open(image_path, 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/verify",
            files={'image': f},
            data={'stored_embedding': json.dumps(stored_embedding)}
        )
    
    if response.status_code == 200:
        result = response.json()
        return result['match'], result['confidence']
    return False, 0.0
```

### JavaScript/Node.js Integration

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

// Enrollment
async function enrollEmployee(imagePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    
    try {
        const response = await axios.post(`${BASE_URL}/enroll`, form, {
            headers: form.getHeaders()
        });
        
        if (response.data.success) {
            // Store embedding
            return response.data.embedding;
        }
    } catch (error) {
        console.error('Enrollment failed:', error.message);
    }
    return null;
}

// Verification
async function verifyAttendance(imagePath, storedEmbedding) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('stored_embedding', JSON.stringify(storedEmbedding));
    
    try {
        const response = await axios.post(`${BASE_URL}/verify`, form, {
            headers: form.getHeaders()
        });
        
        return {
            match: response.data.match,
            confidence: response.data.confidence
        };
    } catch (error) {
        console.error('Verification failed:', error.message);
    }
    return null;
}
```

### cURL Examples

```bash
# Health Check
curl http://localhost:8000/health

# Enrollment
curl -X POST "http://localhost:8000/enroll" \
  -F "image=@employee_photo.jpg"

# Verification
curl -X POST "http://localhost:8000/verify" \
  -F "image=@live_photo.jpg" \
  -F 'stored_embedding=[0.123,-0.456,0.789,...]'
```

## 🏗️ Architecture Patterns

### Pattern 1: Centralized Embedding Storage

```
┌─────────────┐
│  Client App │
└──────┬──────┘
       │
       ├─→ Enroll: POST /enroll
       │   ↓
       │   Face Service
       │   ↓
       │   Returns embedding
       │   ↓
       └─→ Store in Central DB
       
       ├─→ Verify: POST /verify
       │   ↓
       │   Fetch embedding from DB
       │   ↓
       │   Face Service
       │   ↓
       └─→ Returns match result
```

### Pattern 2: Distributed Architecture

```
┌─────────────┐     ┌─────────────┐
│   Web App   │     │  Mobile App │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └────────┬──────────┘
                │
         ┌──────▼──────┐
         │ API Gateway │
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│ Face   │ │ Face   │ │ Face   │
│Service1│ │Service2│ │Service3│
└────────┘ └────────┘ └────────┘
```

## 📊 Performance Optimization

### 1. Caching Frequently Used Embeddings

```python
from functools import lru_cache
import hashlib

class EmbeddingCache:
    def __init__(self):
        self.cache = {}
    
    def get_key(self, employee_id):
        return hashlib.md5(employee_id.encode()).hexdigest()
    
    def get(self, employee_id):
        return self.cache.get(self.get_key(employee_id))
    
    def set(self, employee_id, embedding):
        self.cache[self.get_key(employee_id)] = embedding
```

### 2. Batch Processing

```python
async def verify_multiple(image_paths, employee_embeddings):
    """Verify multiple faces in parallel"""
    tasks = []
    for image_path in image_paths:
        task = verify_face_async(image_path, employee_embeddings)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    return results
```

### 3. Load Balancing

Use nginx for load balancing multiple instances:

```nginx
upstream face_service {
    least_conn;
    server face-service-1:8000;
    server face-service-2:8000;
    server face-service-3:8000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://face_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Security Best Practices

### 1. Add Authentication

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Validate token against your auth system
    if not is_valid_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    return token

# Protect endpoints
@app.post("/enroll", dependencies=[Depends(verify_token)])
async def enroll_face(...):
    ...
```

### 2. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/enroll")
@limiter.limit("10/minute")
async def enroll_face(request: Request, ...):
    ...
```

### 3. HTTPS/TLS

Always use HTTPS in production:

```bash
# Using Let's Encrypt with certbot
sudo certbot --nginx -d your-domain.com
```

## 📈 Monitoring & Logging

### 1. Add Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, make_asgi_app

# Metrics
enrollment_counter = Counter('enrollments_total', 'Total enrollments')
verification_counter = Counter('verifications_total', 'Total verifications')
verification_latency = Histogram('verification_seconds', 'Verification latency')

# Add metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

### 2. Structured Logging

```python
import logging
import json
from datetime import datetime

class StructuredLogger:
    def log_enrollment(self, success, quality_score, duration):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event': 'enrollment',
            'success': success,
            'quality_score': quality_score,
            'duration_ms': duration * 1000
        }
        logging.info(json.dumps(log_data))
```

## 🧪 Testing Strategy

### 1. Unit Tests
```bash
pytest test_service.py -v
```

### 2. Integration Tests
```bash
pytest test_integration.py -v
```

### 3. Load Testing with Locust

```python
from locust import HttpUser, task, between

class FaceRecognitionUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def enroll_face(self):
        with open('test_face.jpg', 'rb') as f:
            self.client.post('/enroll', files={'image': f})
    
    @task(3)
    def verify_face(self):
        with open('test_face.jpg', 'rb') as f:
            self.client.post('/verify', 
                files={'image': f},
                data={'stored_embedding': '[...]'}
            )
```

Run: `locust -f locustfile.py --host http://localhost:8000`

## 🔄 Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy Face Recognition Service

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t face-service .
      
      - name: Run tests
        run: docker run face-service pytest
      
      - name: Deploy to production
        run: |
          docker tag face-service registry.example.com/face-service
          docker push registry.example.com/face-service
```

## 📱 Mobile App Integration

### iOS (Swift) Example

```swift
func enrollFace(image: UIImage) async throws -> [Double] {
    let url = URL(string: "http://your-server.com/enroll")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    
    let boundary = UUID().uuidString
    request.setValue("multipart/form-data; boundary=\(boundary)", 
                     forHTTPHeaderField: "Content-Type")
    
    var data = Data()
    data.append("--\(boundary)\r\n")
    data.append("Content-Disposition: form-data; name=\"image\"; filename=\"face.jpg\"\r\n")
    data.append("Content-Type: image/jpeg\r\n\r\n")
    data.append(image.jpegData(compressionQuality: 0.8)!)
    data.append("\r\n--\(boundary)--\r\n")
    
    request.httpBody = data
    
    let (responseData, _) = try await URLSession.shared.data(for: request)
    let result = try JSONDecoder().decode(EnrollmentResponse.self, from: responseData)
    
    return result.embedding
}
```

### Android (Kotlin) Example

```kotlin
suspend fun enrollFace(bitmap: Bitmap): List<Double>? = withContext(Dispatchers.IO) {
    val url = "http://your-server.com/enroll"
    
    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "image", "face.jpg",
            bitmap.toRequestBody()
        )
        .build()
    
    val request = Request.Builder()
        .url(url)
        .post(requestBody)
        .build()
    
    val response = OkHttpClient().newCall(request).execute()
    val json = JSONObject(response.body?.string() ?: "")
    
    if (json.getBoolean("success")) {
        json.getJSONArray("embedding").toList()
    } else null
}
```

## 🎯 Best Practices Summary

1. **Always use HTTPS in production**
2. **Implement rate limiting**
3. **Add authentication/authorization**
4. **Monitor performance metrics**
5. **Log all security events**
6. **Scale horizontally with load balancers**
7. **Cache frequently accessed embeddings**
8. **Use connection pooling for databases**
9. **Implement circuit breakers**
10. **Have rollback strategy**

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Slow first request
- **Solution**: Model downloads on first use (~90MB). Subsequent requests are fast.

**Issue**: Out of memory errors
- **Solution**: Reduce worker count or use smaller model (FaceNet128)

**Issue**: Low accuracy
- **Solution**: Check image quality, lighting, and camera resolution

### Getting Help

1. Check the README documentation
2. Review API examples
3. Check logs: `docker logs face_recognition_microservice`
4. Test with known good images
5. Verify network connectivity

---

**Ready for production deployment! 🚀**
