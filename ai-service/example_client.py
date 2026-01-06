"""
Example API Client for Face Recognition Microservice
Demonstrates how to interact with the enrollment and verification endpoints
"""

import requests
import json
import base64
from typing import Dict, Optional
import os


class FaceRecognitionClient:
    """Client for interacting with Face Recognition Microservice"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def health_check(self) -> Dict:
        """Check if service is healthy"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def enroll_face(self, image_path: str) -> Dict:
        """
        Enroll a face from an image file
        
        Args:
            image_path: Path to image file
            
        Returns:
            Enrollment response with embedding
        """
        with open(image_path, 'rb') as f:
            files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
            response = self.session.post(
                f"{self.base_url}/enroll",
                files=files
            )
        
        response.raise_for_status()
        return response.json()
    
    def verify_face(self, image_path: str, stored_embedding: list) -> Dict:
        """
        Verify a face against stored embedding
        
        Args:
            image_path: Path to image file
            stored_embedding: Previously enrolled embedding
            
        Returns:
            Verification response with match result
        """
        with open(image_path, 'rb') as f:
            files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
            data = {'stored_embedding': json.dumps(stored_embedding)}
            response = self.session.post(
                f"{self.base_url}/verify",
                files=files,
                data=data
            )
        
        response.raise_for_status()
        return response.json()


def example_enrollment_workflow():
    """Example: Enroll a face"""
    print("=" * 60)
    print("ENROLLMENT WORKFLOW EXAMPLE")
    print("=" * 60)
    
    client = FaceRecognitionClient()
    
    # Check health
    print("\n1. Checking service health...")
    health = client.health_check()
    print(f"   Status: {health['status']}")
    
    # Enroll face
    print("\n2. Enrolling face...")
    image_path = "sample_images/person1_enroll.jpg"  # Replace with actual path
    
    try:
        result = client.enroll_face(image_path)
        
        if result['success']:
            print(f"   ✓ Enrollment successful!")
            print(f"   Face detected: {result['face_detected']}")
            print(f"   Quality score: {result.get('quality_score', 'N/A')}/100")
            print(f"   Embedding dimension: {len(result['embedding'])}")
            print(f"   Timestamp: {result['timestamp']}")
            
            # Save embedding for later verification
            embedding = result['embedding']
            with open('stored_embedding.json', 'w') as f:
                json.dump({'embedding': embedding}, f)
            print(f"   Embedding saved to: stored_embedding.json")
            
            return embedding
        else:
            print(f"   ✗ Enrollment failed: {result['message']}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Request failed: {str(e)}")
        return None


def example_verification_workflow(stored_embedding: Optional[list] = None):
    """Example: Verify a face"""
    print("\n" + "=" * 60)
    print("VERIFICATION WORKFLOW EXAMPLE")
    print("=" * 60)
    
    client = FaceRecognitionClient()
    
    # Load stored embedding if not provided
    if stored_embedding is None:
        print("\n1. Loading stored embedding...")
        try:
            with open('stored_embedding.json', 'r') as f:
                data = json.load(f)
                stored_embedding = data['embedding']
            print(f"   ✓ Loaded embedding (dim: {len(stored_embedding)})")
        except FileNotFoundError:
            print("   ✗ No stored embedding found. Run enrollment first.")
            return
    
    # Verify face
    print("\n2. Verifying face...")
    verify_image_path = "sample_images/person1_verify.jpg"  # Replace with actual path
    
    try:
        result = client.verify_face(verify_image_path, stored_embedding)
        
        if result['success']:
            print(f"   ✓ Verification completed!")
            print(f"   Match: {'YES ✓' if result['match'] else 'NO ✗'}")
            print(f"   Confidence: {result['confidence']:.2f}%")
            print(f"   Similarity score: {result.get('similarity_score', 'N/A')}")
            print(f"   Threshold used: {result['threshold_used']}")
            print(f"   Timestamp: {result['timestamp']}")
            
            if result['match']:
                print("\n   🎉 Person identified! Attendance can be marked.")
            else:
                print("\n   ⚠️  Person not recognized. Access denied.")
        else:
            print(f"   ✗ Verification failed: {result['message']}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Request failed: {str(e)}")


def example_request_format():
    """Display example request/response formats"""
    print("\n" + "=" * 60)
    print("API REQUEST/RESPONSE EXAMPLES")
    print("=" * 60)
    
    print("\n1. ENROLLMENT REQUEST")
    print("-" * 60)
    print("""
POST /enroll
Content-Type: multipart/form-data

Form Data:
- image: [binary image file]

Example using curl:
curl -X POST "http://localhost:8000/enroll" \\
  -F "image=@person_face.jpg"
""")
    
    print("\n2. ENROLLMENT RESPONSE (Success)")
    print("-" * 60)
    enrollment_response = {
        "success": True,
        "embedding": [0.123, -0.456, 0.789, "... (512 values total)"],
        "message": "Face enrolled successfully",
        "face_detected": True,
        "quality_score": 87.5,
        "timestamp": "2024-01-15T10:30:00.000000"
    }
    print(json.dumps(enrollment_response, indent=2))
    
    print("\n3. VERIFICATION REQUEST")
    print("-" * 60)
    print("""
POST /verify
Content-Type: multipart/form-data

Form Data:
- image: [binary image file]
- stored_embedding: "[0.123, -0.456, 0.789, ...]"

Example using curl:
curl -X POST "http://localhost:8000/verify" \\
  -F "image=@live_face.jpg" \\
  -F 'stored_embedding=[0.123,-0.456,0.789,...]'
""")
    
    print("\n4. VERIFICATION RESPONSE (Match)")
    print("-" * 60)
    verification_response = {
        "success": True,
        "match": True,
        "confidence": 92.45,
        "message": "Verification completed successfully",
        "similarity_score": 0.0755,
        "threshold_used": 0.40,
        "timestamp": "2024-01-15T10:35:00.000000"
    }
    print(json.dumps(verification_response, indent=2))
    
    print("\n5. VERIFICATION RESPONSE (No Match)")
    print("-" * 60)
    no_match_response = {
        "success": True,
        "match": False,
        "confidence": 45.32,
        "message": "Verification completed successfully",
        "similarity_score": 0.5468,
        "threshold_used": 0.40,
        "timestamp": "2024-01-15T10:36:00.000000"
    }
    print(json.dumps(no_match_response, indent=2))
    
    print("\n6. ERROR RESPONSE (No Face Detected)")
    print("-" * 60)
    error_response = {
        "success": False,
        "message": "No face detected in the image. Please ensure face is clearly visible.",
        "timestamp": "2024-01-15T10:37:00.000000"
    }
    print(json.dumps(error_response, indent=2))


if __name__ == "__main__":
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "Face Recognition Microservice Client" + " " * 11 + "║")
    print("╚" + "=" * 58 + "╝")
    
    # Display example formats
    example_request_format()
    
    print("\n" + "=" * 60)
    print("LIVE EXAMPLES (requires running service)")
    print("=" * 60)
    print("\nNote: Update image paths in the code before running:")
    print("- sample_images/person1_enroll.jpg")
    print("- sample_images/person1_verify.jpg")
    
    # Uncomment to run live examples (requires images)
    # embedding = example_enrollment_workflow()
    # if embedding:
    #     example_verification_workflow(embedding)
    
    print("\n" + "=" * 60)
    print("For production integration, see the FaceRecognitionClient class")
    print("=" * 60 + "\n")
