import { z } from 'zod';
import { insertUserSchema, insertLocationSchema, insertAttendanceSchema, insertSuspiciousLogSchema, users, attendance, locations, suspiciousLogs } from './schema';

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: users,
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: users,
        401: z.object({ message: z.string() }),
      },
    }
  },
  face: {
    enroll: {
      method: 'POST' as const,
      path: '/api/face/enroll',
      input: z.object({ userId: z.number(), embedding: z.any() }),
      responses: {
        200: users,
        400: z.object({ message: z.string() }),
      },
    }
  },
  attendance: {
    mark: {
      method: 'POST' as const,
      path: '/api/attendance/mark',
      input: z.object({ lat: z.number(), lng: z.number(), faceEmbedding: z.any() }),
      responses: {
        200: z.object({ status: z.string(), message: z.string().optional(), record: attendance.optional() }),
        400: z.object({ message: z.string() }),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/attendance/history',
      responses: {
        200: z.array(attendance),
      },
    }
  },
  admin: {
    attendance: {
      method: 'GET' as const,
      path: '/api/admin/attendance',
      responses: {
        200: z.array(attendance),
      },
    },
    suspicious: {
      method: 'GET' as const,
      path: '/api/admin/suspicious',
      responses: {
        200: z.array(suspiciousLogs)
      },
    }
  }
};
