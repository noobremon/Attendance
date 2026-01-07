import mongoose from 'mongoose';
import { UserSchema, LocationSchema, AttendanceSchema, SuspiciousLogSchema, type User, type Attendance, type Location, type SuspiciousLog } from "@shared/schema";

// Create Mongoose models
const User = mongoose.model('User', UserSchema);
const Location = mongoose.model('Location', LocationSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const SuspiciousLog = mongoose.model('SuspiciousLog', SuspiciousLogSchema);

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Partial<User>): Promise<User>;
  updateUserFace(userId: number, embedding: any): Promise<User>;

  // Attendance
  createAttendance(record: Partial<Attendance>): Promise<Attendance>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;

  // Locations
  getLocations(): Promise<Location[]>;
  createLocation(location: Partial<Location>): Promise<Location>;

  // Suspicious
  logSuspicious(log: Partial<SuspiciousLog>): Promise<SuspiciousLog>;
  getSuspiciousLogs(): Promise<SuspiciousLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const userDoc = await User.findOne({ _id: id });
      if (!userDoc) return undefined;
      
      return {
        _id: userDoc._id.toString(),
        id: parseInt(userDoc._id.toString()),
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password,
        role: userDoc.role,
        faceEmbedding: userDoc.faceEmbedding,
        createdAt: userDoc.createdAt
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const userDoc = await User.findOne({ username });
      if (!userDoc) return undefined;
      
      return {
        _id: userDoc._id.toString(),
        id: parseInt(userDoc._id.toString()),
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password,
        role: userDoc.role,
        faceEmbedding: userDoc.faceEmbedding,
        createdAt: userDoc.createdAt
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const userDoc = await User.findOne({ email });
      if (!userDoc) return undefined;
      
      return {
        _id: userDoc._id.toString(),
        id: parseInt(userDoc._id.toString()),
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password,
        role: userDoc.role,
        faceEmbedding: userDoc.faceEmbedding,
        createdAt: userDoc.createdAt
      };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const userDocs = await User.find({});
      return userDocs.map(doc => ({
        _id: doc._id.toString(),
        id: parseInt(doc._id.toString()),
        username: doc.username,
        email: doc.email,
        password: doc.password,
        role: doc.role,
        faceEmbedding: doc.faceEmbedding,
        createdAt: doc.createdAt
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(user: Partial<User>): Promise<User> {
    try {
      const newUserDoc = new User(user);
      await newUserDoc.save();
      
      return {
        _id: newUserDoc._id.toString(),
        id: parseInt(newUserDoc._id.toString()),
        username: newUserDoc.username,
        email: newUserDoc.email,
        password: newUserDoc.password,
        role: newUserDoc.role,
        faceEmbedding: newUserDoc.faceEmbedding,
        createdAt: newUserDoc.createdAt
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserFace(userId: number, embedding: any): Promise<User> {
    try {
      const updatedDoc = await User.findOneAndUpdate(
        { _id: userId },
        { faceEmbedding: embedding },
        { new: true }
      );
      
      if (!updatedDoc) {
        throw new Error('User not found');
      }
      
      return {
        _id: updatedDoc._id.toString(),
        id: parseInt(updatedDoc._id.toString()),
        username: updatedDoc.username,
        email: updatedDoc.email,
        password: updatedDoc.password,
        role: updatedDoc.role,
        faceEmbedding: updatedDoc.faceEmbedding,
        createdAt: updatedDoc.createdAt
      };
    } catch (error) {
      console.error('Error updating user face:', error);
      throw error;
    }
  }

  async createAttendance(record: Partial<Attendance>): Promise<Attendance> {
    try {
      const newRecordDoc = new Attendance(record);
      await newRecordDoc.save();
      
      return {
        _id: newRecordDoc._id.toString(),
        id: parseInt(newRecordDoc._id.toString()),
        userId: newRecordDoc.userId,
        status: newRecordDoc.status,
        ipAddress: newRecordDoc.ipAddress || undefined,
        lat: newRecordDoc.lat || undefined,
        lng: newRecordDoc.lng || undefined,
        confidence: newRecordDoc.confidence || undefined,
        createdAt: newRecordDoc.createdAt
      };
    } catch (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    try {
      const recordDocs = await Attendance.find({ userId: userId }).sort({ createdAt: -1 });
      return recordDocs.map(doc => ({
        _id: doc._id.toString(),
        id: parseInt(doc._id.toString()),
        userId: doc.userId,
        status: doc.status,
        ipAddress: doc.ipAddress || undefined,
        lat: doc.lat || undefined,
        lng: doc.lng || undefined,
        confidence: doc.confidence || undefined,
        createdAt: doc.createdAt
      }));
    } catch (error) {
      console.error('Error getting attendance by user:', error);
      return [];
    }
  }

  async getAllAttendance(): Promise<Attendance[]> {
    try {
      const recordDocs = await Attendance.find({}).sort({ createdAt: -1 });
      return recordDocs.map(doc => ({
        _id: doc._id.toString(),
        id: parseInt(doc._id.toString()),
        userId: doc.userId,
        status: doc.status,
        ipAddress: doc.ipAddress || undefined,
        lat: doc.lat || undefined,
        lng: doc.lng || undefined,
        confidence: doc.confidence || undefined,
        createdAt: doc.createdAt
      }));
    } catch (error) {
      console.error('Error getting all attendance:', error);
      return [];
    }
  }

  async getLocations(): Promise<Location[]> {
    try {
      const locationDocs = await Location.find({});
      return locationDocs.map(doc => ({
        _id: doc._id.toString(),
        id: parseInt(doc._id.toString()),
        name: doc.name,
        lat: doc.lat,
        lng: doc.lng,
        radius: doc.radius
      }));
    } catch (error) {
      console.error('Error getting locations:', error);
      return [];
    }
  }

  async createLocation(location: Partial<Location>): Promise<Location> {
    try {
      const newLocationDoc = new Location(location);
      await newLocationDoc.save();
      
      return {
        _id: newLocationDoc._id.toString(),
        id: parseInt(newLocationDoc._id.toString()),
        name: newLocationDoc.name,
        lat: newLocationDoc.lat,
        lng: newLocationDoc.lng,
        radius: newLocationDoc.radius
      };
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  }

  async logSuspicious(log: Partial<SuspiciousLog>): Promise<SuspiciousLog> {
    try {
      const newLogDoc = new SuspiciousLog(log);
      await newLogDoc.save();
      
      return {
        _id: newLogDoc._id.toString(),
        id: parseInt(newLogDoc._id.toString()),
        userId: newLogDoc.userId,
        reason: newLogDoc.reason,
        ipAddress: newLogDoc.ipAddress || undefined,
        lat: newLogDoc.lat || undefined,
        lng: newLogDoc.lng || undefined,
        createdAt: newLogDoc.createdAt
      };
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
      throw error;
    }
  }

  async getSuspiciousLogs(): Promise<SuspiciousLog[]> {
    try {
      const logDocs = await SuspiciousLog.find({}).sort({ createdAt: -1 });
      return logDocs.map(doc => ({
        _id: doc._id.toString(),
        id: parseInt(doc._id.toString()),
        userId: doc.userId,
        reason: doc.reason,
        ipAddress: doc.ipAddress || undefined,
        lat: doc.lat || undefined,
        lng: doc.lng || undefined,
        createdAt: doc.createdAt
      }));
    } catch (error) {
      console.error('Error getting suspicious logs:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
