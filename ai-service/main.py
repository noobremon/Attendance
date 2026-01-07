"""
Face Recognition Microservice for Attendance System
A stateless AI service for face enrollment and verification
"""

# Import patch first to handle compatibility issues
import startup_patch

from fastapi import FastAPI, HTTPException, File, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import uvicorn
import logging
from datetime import datetime

from face_recognition_service import (
    FaceRecognitionService,
    FaceNotDetectedException,
    MultipleFacesException,
    LowQualityImageException,
    InvalidImageException
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition Microservice",
    description="Stateless face recognition service for attendance systems",
    version="1.0.0"
)

# Initialize face recognition service
face_service = FaceRecognitionService()

# Pydantic models for request/response validation
class EnrollmentResponse(BaseModel):
    success: bool
    embedding: Optional[List[float]] = None
    message: str
    face_detected: bool
    quality_score: Optional[float] = Field(None, ge=0, le=100)
    timestamp: str

class VerificationRequest(BaseModel):
    stored_embedding: List[float] = Field(..., description="Face embedding from enrollment")

class VerificationResponse(BaseModel):
    success: bool
    match: bool
    confidence: float = Field(..., ge=0, le=100)
    message: str
    similarity_score: Optional[float] = None
    threshold_used: float
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str

# Security logging
class SecurityLogger:
    @staticmethod
    def log_suspicious_activity(endpoint: str, reason: str, details: str):
        logger.warning(
            f"SECURITY ALERT - Endpoint: {endpoint} | Reason: {reason} | Details: {details}"
        )

security_logger = SecurityLogger()


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Face Recognition Microservice",
        "version": "1.0.0",
        "endpoints": {
            "enrollment": "/enroll",
            "verification": "/verify",
            "health": "/health"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="face_recognition_microservice",
        timestamp=datetime.utcnow().isoformat()
    )


@app.post("/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_200_OK)
async def enroll_face(image: UploadFile = File(...)):
    """
    Face Enrollment Endpoint
    
    Accepts an image, detects face, generates embedding vector.
    Does NOT store raw images - only returns embedding for caller to store.
    
    Args:
        image: Image file (JPEG, PNG)
    
    Returns:
        EnrollmentResponse with embedding vector or error details
    """
    try:
        # Read image data
        image_data = await image.read()
        
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            security_logger.log_suspicious_activity(
                endpoint="/enroll",
                reason="Invalid file type",
                content_type=image.content_type or "None"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only image files are accepted."
            )
        
        # Process face and generate embedding
        result = face_service.enroll_face(image_data)
        
        return EnrollmentResponse(
            success=True,
            embedding=result['embedding'],
            message="Face enrolled successfully",
            face_detected=True,
            quality_score=result.get('quality_score'),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except FaceNotDetectedException as e:
        security_logger.log_suspicious_activity(
            endpoint="/enroll",
            reason="No face detected",
            details=str(e)
        )
        return EnrollmentResponse(
            success=False,
            embedding=None,
            message=str(e),
            face_detected=False,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except MultipleFacesException as e:
        security_logger.log_suspicious_activity(
            endpoint="/enroll",
            reason="Multiple faces detected",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except LowQualityImageException as e:
        security_logger.log_suspicious_activity(
            endpoint="/enroll",
            reason="Low quality image",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except InvalidImageException as e:
        security_logger.log_suspicious_activity(
            endpoint="/enroll",
            reason="Invalid image",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except Exception as e:
        logger.error(f"Enrollment error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during face enrollment"
        )


@app.post("/verify", response_model=VerificationResponse, status_code=status.HTTP_200_OK)
async def verify_face(
    image: UploadFile = File(...),
    stored_embedding: str = None  # JSON string of embedding
):
    """
    Face Verification Endpoint
    
    Compares live face image with stored embedding.
    Returns match status and confidence score.
    
    Args:
        image: Live face image
        stored_embedding: JSON string of stored face embedding
    
    Returns:
        VerificationResponse with match result and confidence score
    """
    try:
        # Validate stored embedding
        if not stored_embedding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="stored_embedding is required"
            )
        
        # Parse embedding
        import json
        try:
            embedding_list = json.loads(stored_embedding)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid stored_embedding format. Must be valid JSON array."
            )
        
        # Read image data
        image_data = await image.read()
        
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            security_logger.log_suspicious_activity(
                endpoint="/verify",
                reason="Invalid file type",
                content_type=image.content_type or "None"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only image files are accepted."
            )
        
        # Perform verification
        result = face_service.verify_face(image_data, embedding_list)
        
        # Log failed verification attempts
        if not result['match']:
            security_logger.log_suspicious_activity(
                endpoint="/verify",
                reason="Face verification failed",
                details=f"Confidence: {result['confidence']:.2f}%, Threshold: {result['threshold']}"
            )
        
        return VerificationResponse(
            success=True,
            match=result['match'],
            confidence=result['confidence'],
            message="Verification completed successfully",
            similarity_score=result.get('similarity_score'),
            threshold_used=result['threshold'],
            timestamp=datetime.utcnow().isoformat()
        )
        
    except FaceNotDetectedException as e:
        security_logger.log_suspicious_activity(
            endpoint="/verify",
            reason="No face detected in verification",
            details=str(e)
        )
        return VerificationResponse(
            success=False,
            match=False,
            confidence=0.0,
            message=str(e),
            threshold_used=face_service.VERIFICATION_THRESHOLD,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except MultipleFacesException as e:
        security_logger.log_suspicious_activity(
            endpoint="/verify",
            reason="Multiple faces in verification",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except LowQualityImageException as e:
        security_logger.log_suspicious_activity(
            endpoint="/verify",
            reason="Low quality image in verification",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except InvalidImageException as e:
        security_logger.log_suspicious_activity(
            endpoint="/verify",
            reason="Invalid image in verification",
            details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during face verification"
        )


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
