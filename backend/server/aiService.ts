import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

interface EnrollmentResponse {
  success: boolean;
  embedding?: number[];
  message: string;
  face_detected: boolean;
  quality_score?: number;
  timestamp: string;
}

interface VerificationResponse {
  success: boolean;
  match: boolean;
  confidence: number;
  message: string;
  similarity_score?: number;
  threshold_used: number;
  timestamp: string;
}

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export class AIService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async enrollFace(imageData: Buffer): Promise<EnrollmentResponse> {
    try {
      const form = new FormData();
      form.append('image', imageData, { 
        filename: 'face.jpg',
        contentType: 'image/jpeg'
      });
      
      const response = await axios.post(`${this.baseUrl}/enroll`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 15000, // 15 second timeout for face processing
      });
      
      return response.data;
    } catch (error: any) {
      console.error('AI Service enrollment error:', error.response?.data || error.message);
      throw new Error(`Face enrollment failed: ${error.response?.data?.message || error.message || error}`);
    }
  }

  async verifyFace(imageData: Buffer, storedEmbedding: number[]): Promise<VerificationResponse> {
    try {
      const form = new FormData();
      form.append('image', imageData, {
        filename: 'face.jpg',
        contentType: 'image/jpeg'
      });
      form.append('stored_embedding', JSON.stringify(storedEmbedding));
      
      const response = await axios.post(`${this.baseUrl}/verify`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 15000, // 15 second timeout for face processing
      });
      
      return response.data;
    } catch (error: any) {
      console.error('AI Service verification error:', error.response?.data || error.message);
      throw new Error(`Face verification failed: ${error.response?.data?.message || error.message || error}`);
    }
  }

  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
      });
      
      return response.data;
    } catch (error: any) {
      console.error('AI Service health check error:', error.message);
      throw new Error(`AI service health check failed: ${error.message}`);
    }
  }
}

export const aiService = new AIService();