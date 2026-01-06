import { db } from "./db";
import { users, attendance, locations, suspiciousLogs, type User, type InsertUser, type Attendance, type InsertAttendance, type Location, type InsertLocation, type SuspiciousLog, type InsertSuspiciousLog } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFace(userId: number, embedding: any): Promise<User>;

  // Attendance
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;

  // Locations
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;

  // Suspicious
  logSuspicious(log: InsertSuspiciousLog): Promise<SuspiciousLog>;
  getSuspiciousLogs(): Promise<SuspiciousLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserFace(userId: number, embedding: any): Promise<User> {
    const [updated] = await db.update(users)
      .set({ faceEmbedding: embedding })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [newRecord] = await db.insert(attendance).values(record).returning();
    return newRecord;
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(eq(attendance.userId, userId))
      .orderBy(desc(attendance.createdAt));
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance).orderBy(desc(attendance.createdAt));
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLoc] = await db.insert(locations).values(location).returning();
    return newLoc;
  }

  async logSuspicious(log: InsertSuspiciousLog): Promise<SuspiciousLog> {
    const [newLog] = await db.insert(suspiciousLogs).values(log).returning();
    return newLog;
  }

  async getSuspiciousLogs(): Promise<SuspiciousLog[]> {
    return await db.select().from(suspiciousLogs).orderBy(desc(suspiciousLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
