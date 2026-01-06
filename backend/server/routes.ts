import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { aiService } from "./aiService";

const SessionStore = MemoryStore(session);

// Extend express-session
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }),
      secret: "your-secret-key", // In prod use ENV
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false } // Set to true in prod with HTTPS
    })
  );

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password } = api.auth.login.input.parse(req.body);
    // Try to find user by username first, then by email
    let user = await storage.getUserByUsername(username);
    if (!user) {
      user = await storage.getUserByEmail(username);
    }
    
    // Simple password check (In prod use bcrypt)
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json(user);
  });
  
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }
    
    // Check if user already exists by username or email
    const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }
    
    // Create new user
    const newUser = await storage.createUser({ 
      username, 
      email,
      password, // In production, hash the password
      role: "USER" 
    });
    
    // Set session
    req.session.userId = newUser.id;
    
    res.json(newUser);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    res.json(user || null);
  });

  // Face Enrollment
  app.post(api.face.enroll.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    
    const { userId } = api.face.enroll.input.parse(req.body);
    
    // Check if the user has permission to enroll their face
    if (req.session.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: Cannot enroll face for another user" });
    }
    
    try {
      // Get the image data from the request body
      // We expect the image to be sent as base64 string
      const faceImageBase64 = req.body.faceImage;
      if (!faceImageBase64) {
        return res.status(400).json({ message: "Face image is required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(faceImageBase64, 'base64');
      
      // Process the face image with AI service
      const enrollmentResult = await aiService.enrollFace(imageBuffer);
      
      if (!enrollmentResult.success || !enrollmentResult.embedding) {
        return res.status(400).json({ message: enrollmentResult.message });
      }
      
      // Store the embedding in the database
      const updated = await storage.updateUserFace(userId, enrollmentResult.embedding);
      
      res.json({ 
        ...updated, 
        message: enrollmentResult.message,
        quality_score: enrollmentResult.quality_score
      });
    } catch (error: any) {
      console.error('Face enrollment error:', error);
      return res.status(500).json({ message: error.message || "Face enrollment service error" });
    }
  });

  // Mark Attendance (Core Logic)
  app.post(api.attendance.mark.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    
    const { lat, lng, faceEmbedding } = api.attendance.mark.input.parse(req.body);
    const userId = req.session.userId;
    const ip = req.ip;

    // 1. Geo-fence Check
    const locations = await storage.getLocations();
    let isInside = false;
    
    // Simple distance calc
    for (const loc of locations) {
      const R = 6371e3; // metres
      const φ1 = lat * Math.PI/180;
      const φ2 = loc.lat * Math.PI/180;
      const Δφ = (loc.lat-lat) * Math.PI/180;
      const Δλ = (loc.lng-lng) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c;
      if (d <= loc.radius) isInside = true;
    }

    if (!isInside && locations.length > 0) { // Only check if locations exist
       await storage.logSuspicious({
         userId,
         reason: "LOCATION_MISMATCH",
         ipAddress: ip,
         lat, lng
       });
       return res.status(400).json({ message: "You are not at a valid location" });
    }

    // 2. Face Verification (Real AI Service)
    try {
      // Get the user's stored face embedding
      const user = await storage.getUser(userId);
      if (!user || !user.faceEmbedding) {
        return res.status(400).json({ message: "User has not enrolled their face" });
      }
      
      // Verify the face against the stored embedding
      // Note: faceEmbedding from the request needs to be a Buffer for image data
      // For now, we'll assume the frontend sends image data as base64 and backend converts it to buffer
      const storedEmbedding = Array.isArray(user.faceEmbedding) ? user.faceEmbedding : [];
      if (storedEmbedding.length === 0) {
        return res.status(400).json({ message: "User face embedding is not valid" });
      }
      
      // Convert base64 faceEmbedding to buffer for verification
      let imageBuffer: Buffer;
      if (typeof faceEmbedding === 'string') {
        imageBuffer = Buffer.from(faceEmbedding, 'base64');
      } else {
        return res.status(400).json({ message: "Face embedding must be a base64 string" });
      }
      
      const verificationResult = await aiService.verifyFace(imageBuffer, storedEmbedding);
      
      if (!verificationResult.match) {
        await storage.logSuspicious({
          userId,
          reason: "LOW_CONFIDENCE",
          ipAddress: ip,
          lat, lng
        });
        return res.status(400).json({ 
          message: "Face verification failed", 
          confidence: verificationResult.confidence 
        });
      }

      // Success
      const record = await storage.createAttendance({
        userId,
        status: "PRESENT",
        ipAddress: ip,
        lat, lng,
        confidence: verificationResult.confidence
      });

      res.json({ status: "success", record, confidence: verificationResult.confidence });
    } catch (error: any) {
      console.error('Face verification error:', error);
      
      // Log suspicious activity if it's a verification failure
      if (error.message.includes('Face verification failed') || 
          error.message.includes('confidence') || 
          error.message.includes('match')) {
        await storage.logSuspicious({
          userId,
          reason: "VERIFICATION_ERROR",
          ipAddress: ip,
          lat, lng
        });
      }
      
      return res.status(500).json({ message: error.message || "Face verification service error" });
    }
  });

  app.get(api.attendance.history.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const history = await storage.getAttendanceByUser(req.session.userId);
    res.json(history);
  });

  // Admin Routes
  app.get(api.admin.attendance.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // In real app: check role === ADMIN
    const all = await storage.getAllAttendance();
    res.json(all);
  });

  app.get(api.admin.suspicious.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const logs = await storage.getSuspiciousLogs();
    res.json(logs);
  });

  app.get('/api/admin/users', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // In real app: check role === ADMIN
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Seed Data
  if (await storage.getUserByUsername("admin") === undefined) {
    await storage.createUser({ username: "admin", email: "admin@company.com", password: "password", role: "ADMIN", faceEmbedding: {} });
    await storage.createUser({ username: "user", email: "john@company.com", password: "password", role: "USER", faceEmbedding: {} });
    await storage.createLocation({ name: "Campus", lat: 37.7749, lng: -122.4194, radius: 500 });
  }

  return httpServer;
}
