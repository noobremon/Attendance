// === MONGODB SCHEMA DEFINITIONS ===
// Using Mongoose schemas
import { Schema } from 'mongoose';
import { z } from 'zod';

export const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In real app, hash this
  role: { type: String, enum: ['ADMIN', 'INSTRUCTOR', 'USER'], default: 'USER' },
  faceEmbedding: { type: Schema.Types.Mixed }, // Store generic JSON for embedding
  createdAt: { type: Date, default: Date.now },
});

export const LocationSchema = new Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, required: true }, // meters
});

export const AttendanceSchema = new Schema({
  userId: { type: Number, required: true }, // Foreign key ref logic in code
  status: { type: String, enum: ['PRESENT', 'LATE', 'ABSENT'], required: true },
  ipAddress: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  confidence: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export const SuspiciousLogSchema = new Schema({
  userId: { type: Number },
  reason: { type: String, required: true }, // IP_MISMATCH, LOCATION_MISMATCH, LOW_CONFIDENCE
  ipAddress: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

// === TYPES FOR FRONTEND COMPATIBILITY ===
export interface User {
  _id?: string;
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'USER';
  faceEmbedding?: any;
  createdAt: Date;
}

export interface Location {
  _id?: string;
  id?: number;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface Attendance {
  _id?: string;
  id?: number;
  userId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  ipAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  confidence?: number | null;
  createdAt: Date;
}

export interface SuspiciousLog {
  _id?: string;
  id?: number;
  userId?: number | null;
  reason: string;
  ipAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  createdAt: Date;
}

// === API CONTRACT TYPES ===
export type LoginRequest = { username: string; password: string };
export type LoginResponse = User;

export type EnrollFaceRequest = { userId: number; embedding: any };
export type MarkAttendanceRequest = { lat: number; lng: number; faceEmbedding: any };

export type MarkAttendanceResponse = { status: "success" | "failed"; message?: string; record?: Attendance };

// === INSERT TYPES (for CREATE operations) ===
export interface InsertUser {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'USER';
  faceEmbedding?: any;
}

export interface InsertLocation {
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface InsertAttendance {
  userId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  ipAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  confidence?: number | null;
}

export interface InsertSuspiciousLog {
  userId?: number | null;
  reason: string;
  ipAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
}

// === ZOD SCHEMAS FOR VALIDATION ===
export const insertUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'USER']),
  faceEmbedding: z.any().optional(),
});

export const insertLocationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  radius: z.number(),
});

export const insertAttendanceSchema = z.object({
  userId: z.number(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT']),
  ipAddress: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
});

export const insertSuspiciousLogSchema = z.object({
  userId: z.number().nullable().optional(),
  reason: z.string(),
  ipAddress: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

// Zod schemas for existing interfaces
export const users = z.object({
  _id: z.string().optional(),
  id: z.number().optional(),
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'USER']),
  faceEmbedding: z.any().optional(),
  createdAt: z.date(),
});

export const locations = z.object({
  _id: z.string().optional(),
  id: z.number().optional(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  radius: z.number(),
});

export const attendance = z.object({
  _id: z.string().optional(),
  id: z.number().optional(),
  userId: z.number(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT']),
  ipAddress: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
  createdAt: z.date(),
});

export const suspiciousLogs = z.object({
  _id: z.string().optional(),
  id: z.number().optional(),
  userId: z.number().nullable().optional(),
  reason: z.string(),
  ipAddress: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  createdAt: z.date(),
});