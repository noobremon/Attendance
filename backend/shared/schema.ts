import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // In real app, hash this
  role: text("role", { enum: ["ADMIN", "INSTRUCTOR", "USER"] }).default("USER").notNull(),
  faceEmbedding: jsonb("face_embedding"), // Store generic JSON for embedding
  createdAt: timestamp("created_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radius: integer("radius").notNull(), // meters
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key ref logic in code
  status: text("status", { enum: ["PRESENT", "LATE", "ABSENT"] }).notNull(),
  ipAddress: text("ip_address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  confidence: doublePrecision("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suspiciousLogs = pgTable("suspicious_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  reason: text("reason").notNull(), // IP_MISMATCH, LOCATION_MISMATCH, LOW_CONFIDENCE
  ipAddress: text("ip_address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });
export const insertSuspiciousLogSchema = createInsertSchema(suspiciousLogs).omit({ id: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type SuspiciousLog = typeof suspiciousLogs.$inferSelect;
export type InsertSuspiciousLog = z.infer<typeof insertSuspiciousLogSchema>;

// === API CONTRACT TYPES ===

export type LoginRequest = { username: string; password: string };
export type LoginResponse = User;

export type EnrollFaceRequest = { userId: number; embedding: any };
export type MarkAttendanceRequest = { lat: number; lng: number; faceEmbedding: any };

export type MarkAttendanceResponse = { status: "success" | "failed"; message?: string; record?: Attendance };
