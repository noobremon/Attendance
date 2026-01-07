"""
Face Recognition Service
Core logic for face detection, embedding generation, and verification
"""

import cv2
import numpy as np
# Environment configuration
import os
os.environ['TF_KERAS'] = '1'

# NOTE: Patching is done in startup_patch.py which is imported in main.py before this module
# So the LocallyConnected2D should already be available

# Delay DeepFace import to avoid import conflicts
deepface_module = None

def get_deepface():
    global deepface_module
    if deepface_module is None:
        # Import DeepFace after patches are applied
        import deepface as df
        deepface_module = df
    return deepface_module

# Import other modules we need
import cv2
import numpy as np
from typing import Dict, List, Tuple
import logging
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


# Custom exceptions
class FaceNotDetectedException(Exception):
    """Raised when no face is detected in the image"""
    pass


class MultipleFacesException(Exception):
    """Raised when multiple faces are detected"""
    pass


class LowQualityImageException(Exception):
    """Raised when image quality is too low"""
    pass


class InvalidImageException(Exception):
    """Raised when image cannot be processed"""
    pass


class FaceRecognitionService:
    """
    Face Recognition Service using DeepFace
    Handles face detection, embedding generation, and verification
    """
    
    # Configuration
    MODEL_NAME = "Facenet512"  # High accuracy model (512-dim embeddings)
    DETECTOR_BACKEND = "opencv"  # Fast and reliable
    VERIFICATION_THRESHOLD = 0.40  # Cosine distance threshold (lower = stricter)
    MIN_FACE_SIZE = 80  # Minimum face dimension in pixels
    MIN_IMAGE_SIZE = 150  # Minimum image dimension
    MAX_IMAGE_SIZE = 4096  # Maximum image dimension
    QUALITY_THRESHOLD = 30.0  # Minimum quality score
    
    def __init__(self):
        """Initialize the face recognition service"""
        logger.info(f"Initializing FaceRecognitionService with model: {self.MODEL_NAME}")
        
        # Don't pre-load model to avoid startup issues
        # Model will be loaded on first use
        logger.info("Face recognition service initialized. Models will load on first use.")
    
    def _load_image_from_bytes(self, image_data: bytes) -> np.ndarray:
        """
        Load image from bytes and convert to numpy array
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            numpy array (BGR format for OpenCV)
        """
        try:
            # Convert bytes to PIL Image
            pil_image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if necessary
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(pil_image)
            
            # Convert RGB to BGR for OpenCV
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            return img_bgr
            
        except Exception as e:
            raise InvalidImageException(f"Failed to load image: {str(e)}")
    
    def _validate_image_size(self, image: np.ndarray) -> None:
        """
        Validate image dimensions
        
        Args:
            image: Image as numpy array
            
        Raises:
            LowQualityImageException: If image is too small or too large
        """
        height, width = image.shape[:2]
        
        if height < self.MIN_IMAGE_SIZE or width < self.MIN_IMAGE_SIZE:
            raise LowQualityImageException(
                f"Image too small. Minimum size: {self.MIN_IMAGE_SIZE}x{self.MIN_IMAGE_SIZE}px"
            )
        
        if height > self.MAX_IMAGE_SIZE or width > self.MAX_IMAGE_SIZE:
            raise LowQualityImageException(
                f"Image too large. Maximum size: {self.MAX_IMAGE_SIZE}x{self.MAX_IMAGE_SIZE}px"
            )
    
    def _calculate_quality_score(self, image: np.ndarray, face_region: Dict) -> float:
        """
        Calculate image quality score
        
        Args:
            image: Full image as numpy array
            face_region: Dictionary with face coordinates
            
        Returns:
            Quality score (0-100)
        """
        try:
            # Extract face region
            x, y, w, h = face_region['x'], face_region['y'], face_region['w'], face_region['h']
            face_img = image[y:y+h, x:x+w]
            
            # Calculate sharpness using Laplacian variance
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate brightness
            brightness = np.mean(gray)
            
            # Calculate face size score
            face_area = w * h
            image_area = image.shape[0] * image.shape[1]
            size_ratio = face_area / image_area
            
            # Normalize scores
            sharpness_score = min(laplacian_var / 500 * 100, 100)  # Scale to 0-100
            brightness_score = 100 - abs(brightness - 127) / 127 * 100  # Optimal around 127
            size_score = min(size_ratio * 500, 100)  # Larger faces get higher scores
            
            # Weighted average
            quality_score = (
                sharpness_score * 0.5 +
                brightness_score * 0.3 +
                size_score * 0.2
            )
            
            return round(quality_score, 2)
            
        except Exception as e:
            logger.warning(f"Quality calculation failed: {str(e)}")
            return 50.0  # Default neutral score
    
    def _detect_face(self, image: np.ndarray) -> Tuple[Dict, float]:
        """
        Detect face in image with quality checks
        
        Args:
            image: Image as numpy array
            
        Returns:
            Tuple of (face_region_dict, quality_score)
            
        Raises:
            FaceNotDetectedException: No face found
            MultipleFacesException: Multiple faces found
            LowQualityImageException: Face too small or poor quality
        """
        try:
            # Detect faces using OpenCV's Haar Cascade
            DeepFace = get_deepface()
            face_objs = DeepFace.extract_faces(
                img_path=image,
                detector_backend=self.DETECTOR_BACKEND,
                enforce_detection=False,
                align=True
            )
            
            # Filter out low-confidence detections
            valid_faces = [face for face in face_objs if face.get('confidence', 0) > 0.9]
            
            if len(valid_faces) == 0:
                raise FaceNotDetectedException(
                    "No face detected in the image. Please ensure face is clearly visible."
                )
            
            if len(valid_faces) > 1:
                raise MultipleFacesException(
                    f"Multiple faces detected ({len(valid_faces)}). Please provide image with single face."
                )
            
            # Get the face region
            face_region = valid_faces[0]['facial_area']
            
            # Check face size
            face_width = face_region['w']
            face_height = face_region['h']
            
            if face_width < self.MIN_FACE_SIZE or face_height < self.MIN_FACE_SIZE:
                raise LowQualityImageException(
                    f"Face too small ({face_width}x{face_height}px). "
                    f"Minimum: {self.MIN_FACE_SIZE}x{self.MIN_FACE_SIZE}px"
                )
            
            # Calculate quality score
            quality_score = self._calculate_quality_score(image, face_region)
            
            if quality_score < self.QUALITY_THRESHOLD:
                raise LowQualityImageException(
                    f"Image quality too low (score: {quality_score:.1f}/100). "
                    f"Please provide clearer image with better lighting."
                )
            
            logger.info(
                f"Face detected - Size: {face_width}x{face_height}px, "
                f"Quality: {quality_score:.1f}/100"
            )
            
            return face_region, quality_score
            
        except FaceNotDetectedException:
            raise
        except MultipleFacesException:
            raise
        except LowQualityImageException:
            raise
        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            raise FaceNotDetectedException(f"Face detection failed: {str(e)}")
    
    def _generate_embedding(self, image: np.ndarray) -> List[float]:
        """
        Generate face embedding using DeepFace
        
        Args:
            image: Image as numpy array
            
        Returns:
            Face embedding as list of floats
        """
        try:
            # Generate embedding
            DeepFace = get_deepface()
            embedding_objs = DeepFace.represent(
                img_path=image,
                model_name=self.MODEL_NAME,
                detector_backend=self.DETECTOR_BACKEND,
                enforce_detection=True,
                align=True
            )
            
            if not embedding_objs:
                raise FaceNotDetectedException("Failed to generate face embedding")
            
            # Extract embedding vector
            embedding = embedding_objs[0]['embedding']
            
            logger.info(f"Generated embedding with dimension: {len(embedding)}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding generation error: {str(e)}")
            raise
    
    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First face embedding
            embedding2: Second face embedding
            
        Returns:
            Cosine distance (0 = identical, 2 = completely different)
        """
        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Calculate cosine distance
        # Distance = 1 - (dot_product / (norm1 * norm2))
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        cosine_similarity = dot_product / (norm1 * norm2)
        cosine_distance = 1 - cosine_similarity
        
        return cosine_distance
    
    def enroll_face(self, image_data: bytes) -> Dict:
        """
        Enroll a face: detect face and generate embedding
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary with embedding and metadata
        """
        # Load image
        image = self._load_image_from_bytes(image_data)
        
        # Validate image size
        self._validate_image_size(image)
        
        # Detect face with quality checks
        face_region, quality_score = self._detect_face(image)
        
        # Generate embedding
        embedding = self._generate_embedding(image)
        
        return {
            'embedding': embedding,
            'quality_score': quality_score,
            'face_size': {
                'width': face_region['w'],
                'height': face_region['h']
            }
        }
    
    def verify_face(self, image_data: bytes, stored_embedding: List[float]) -> Dict:
        """
        Verify a face against stored embedding
        
        Args:
            image_data: Raw image bytes
            stored_embedding: Previously stored face embedding
            
        Returns:
            Dictionary with match result and confidence
        """
        # Load image
        image = self._load_image_from_bytes(image_data)
        
        # Validate image size
        self._validate_image_size(image)
        
        # Detect face (basic liveness check - ensures it's not a static low-quality image)
        face_region, quality_score = self._detect_face(image)
        
        # Generate embedding for current image
        current_embedding = self._generate_embedding(image)
        
        # Calculate similarity
        distance = self._calculate_similarity(current_embedding, stored_embedding)
        
        # Determine match
        is_match = distance <= self.VERIFICATION_THRESHOLD
        
        # Convert distance to confidence score (0-100)
        # Lower distance = higher confidence
        # distance ranges from 0 (identical) to 2 (completely different)
        confidence = max(0, min(100, (1 - distance) * 100))
        
        logger.info(
            f"Verification - Distance: {distance:.4f}, "
            f"Threshold: {self.VERIFICATION_THRESHOLD}, "
            f"Match: {is_match}, "
            f"Confidence: {confidence:.2f}%"
        )
        
        return {
            'match': is_match,
            'confidence': round(confidence, 2),
            'similarity_score': round(distance, 4),
            'threshold': self.VERIFICATION_THRESHOLD,
            'quality_score': quality_score
        }
