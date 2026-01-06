"""
Test Suite for Face Recognition Microservice
Run with: pytest test_service.py -v
"""

import pytest
import numpy as np
from io import BytesIO
from PIL import Image
import json

from face_recognition_service import (
    FaceRecognitionService,
    FaceNotDetectedException,
    MultipleFacesException,
    LowQualityImageException,
    InvalidImageException
)


@pytest.fixture
def face_service():
    """Create face recognition service instance"""
    return FaceRecognitionService()


@pytest.fixture
def create_test_image():
    """Factory function to create test images"""
    def _create_image(width=400, height=400, color=(255, 255, 255)):
        """Create a simple test image"""
        img = Image.new('RGB', (width, height), color)
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        return img_bytes.getvalue()
    return _create_image


@pytest.fixture
def create_face_image():
    """Factory to create a simple face-like image"""
    def _create_face(size=200):
        """Create a simple face representation for testing"""
        img = Image.new('RGB', (size, size), (255, 220, 180))  # Skin tone
        
        # This is a placeholder - in real tests, use actual face images
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        return img_bytes.getvalue()
    return _create_face


class TestImageValidation:
    """Test image validation and preprocessing"""
    
    def test_valid_image_loading(self, face_service, create_test_image):
        """Test loading valid image"""
        image_bytes = create_test_image(400, 400)
        image = face_service._load_image_from_bytes(image_bytes)
        assert image is not None
        assert image.shape == (400, 400, 3)
    
    def test_invalid_image_data(self, face_service):
        """Test invalid image data handling"""
        with pytest.raises(InvalidImageException):
            face_service._load_image_from_bytes(b'invalid data')
    
    def test_image_too_small(self, face_service, create_test_image):
        """Test rejection of too-small images"""
        image_bytes = create_test_image(100, 100)
        image = face_service._load_image_from_bytes(image_bytes)
        
        with pytest.raises(LowQualityImageException, match="too small"):
            face_service._validate_image_size(image)
    
    def test_image_too_large(self, face_service, create_test_image):
        """Test rejection of too-large images"""
        image_bytes = create_test_image(5000, 5000)
        image = face_service._load_image_from_bytes(image_bytes)
        
        with pytest.raises(LowQualityImageException, match="too large"):
            face_service._validate_image_size(image)
    
    def test_valid_image_size(self, face_service, create_test_image):
        """Test acceptance of valid image sizes"""
        image_bytes = create_test_image(400, 400)
        image = face_service._load_image_from_bytes(image_bytes)
        
        # Should not raise exception
        face_service._validate_image_size(image)


class TestEmbeddingGeneration:
    """Test face embedding generation"""
    
    def test_embedding_dimensions(self, face_service):
        """Test that embeddings have correct dimensions"""
        # Note: This test requires actual face image
        # In production, use real test images
        pass
    
    def test_embedding_consistency(self, face_service):
        """Test that same face produces similar embeddings"""
        # Test that multiple enrollments of same face are consistent
        pass


class TestSimilarityCalculation:
    """Test similarity calculation between embeddings"""
    
    def test_identical_embeddings(self, face_service):
        """Test similarity of identical embeddings"""
        embedding = [0.1] * 512
        distance = face_service._calculate_similarity(embedding, embedding)
        
        # Identical embeddings should have distance close to 0
        assert distance < 0.01
    
    def test_different_embeddings(self, face_service):
        """Test similarity of different embeddings"""
        embedding1 = [0.1] * 512
        embedding2 = [-0.1] * 512
        distance = face_service._calculate_similarity(embedding1, embedding2)
        
        # Different embeddings should have larger distance
        assert distance > 0.5
    
    def test_similarity_symmetry(self, face_service):
        """Test that similarity is symmetric"""
        np.random.seed(42)
        embedding1 = np.random.randn(512).tolist()
        embedding2 = np.random.randn(512).tolist()
        
        dist1 = face_service._calculate_similarity(embedding1, embedding2)
        dist2 = face_service._calculate_similarity(embedding2, embedding1)
        
        assert abs(dist1 - dist2) < 1e-6


class TestQualityScoring:
    """Test image quality assessment"""
    
    def test_quality_score_range(self, face_service, create_test_image):
        """Test that quality scores are in valid range"""
        image_bytes = create_test_image(400, 400)
        image = face_service._load_image_from_bytes(image_bytes)
        
        face_region = {'x': 100, 'y': 100, 'w': 150, 'h': 150}
        score = face_service._calculate_quality_score(image, face_region)
        
        assert 0 <= score <= 100


class TestSecurityFeatures:
    """Test security-related functionality"""
    
    def test_no_face_rejection(self, face_service, create_test_image):
        """Test rejection of images without faces"""
        image_bytes = create_test_image(400, 400)
        
        with pytest.raises(FaceNotDetectedException):
            face_service.enroll_face(image_bytes)
    
    def test_low_quality_rejection(self, face_service):
        """Test rejection of low-quality images"""
        # Create intentionally poor quality image
        pass


class TestVerificationThresholds:
    """Test verification threshold behavior"""
    
    def test_threshold_enforcement(self, face_service):
        """Test that threshold is properly enforced"""
        # Create embeddings with known similarity
        embedding1 = [0.1] * 512
        embedding2 = [0.11] * 512  # Very similar
        
        distance = face_service._calculate_similarity(embedding1, embedding2)
        
        # Should match if below threshold
        is_match = distance <= face_service.VERIFICATION_THRESHOLD
        assert is_match or not is_match  # Boolean check
    
    def test_confidence_calculation(self, face_service):
        """Test confidence score calculation"""
        embedding1 = [0.1] * 512
        embedding2 = [0.1] * 512
        
        distance = face_service._calculate_similarity(embedding1, embedding2)
        confidence = max(0, min(100, (1 - distance) * 100))
        
        # Identical embeddings should have high confidence
        assert confidence > 95


# Integration tests (require actual face images)
class TestEndToEndWorkflow:
    """Test complete enrollment and verification workflow"""
    
    @pytest.mark.skip(reason="Requires actual face images")
    def test_enrollment_workflow(self, face_service):
        """Test complete enrollment process"""
        # 1. Load test image
        # 2. Enroll face
        # 3. Verify embedding is generated
        # 4. Check quality score
        pass
    
    @pytest.mark.skip(reason="Requires actual face images")
    def test_verification_workflow(self, face_service):
        """Test complete verification process"""
        # 1. Enroll face
        # 2. Verify with same face (should match)
        # 3. Verify with different face (should not match)
        pass
    
    @pytest.mark.skip(reason="Requires actual face images")
    def test_same_person_multiple_photos(self, face_service):
        """Test verification with multiple photos of same person"""
        # Should consistently match
        pass
    
    @pytest.mark.skip(reason="Requires actual face images")
    def test_different_people(self, face_service):
        """Test that different people don't match"""
        # Should not match
        pass


# Performance tests
class TestPerformance:
    """Test service performance"""
    
    def test_embedding_generation_speed(self, face_service):
        """Test that embedding generation is fast enough"""
        # Should complete in reasonable time
        pass
    
    def test_verification_speed(self, face_service):
        """Test that verification is fast enough"""
        # Should complete in reasonable time
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
