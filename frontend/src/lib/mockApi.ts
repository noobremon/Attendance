// Mock API utilities for simulating backend calls

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'USER';
  enrolledFace: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: 'present' | 'late' | 'absent' | 'proxy_detected';
  verificationScore: number;
  location?: string;
}

// Simulated delay for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user database
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'ADMIN',
    enrolledFace: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    email: 'john@company.com',
    name: 'John Doe',
    role: 'USER',
    enrolledFace: true,
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    email: 'jane@company.com',
    name: 'Jane Smith',
    role: 'USER',
    enrolledFace: false,
    createdAt: '2024-02-15',
  },
];

// Mock attendance records
const mockAttendance: AttendanceRecord[] = [
  { id: '1', userId: '2', userName: 'John Doe', date: '2024-12-30', checkIn: '09:05', checkOut: '17:30', status: 'present', verificationScore: 98.5 },
  { id: '2', userId: '2', userName: 'John Doe', date: '2024-12-31', checkIn: '09:15', checkOut: '17:45', status: 'late', verificationScore: 97.2 },
  { id: '3', userId: '2', userName: 'John Doe', date: '2025-01-02', checkIn: '08:55', checkOut: '18:00', status: 'present', verificationScore: 99.1 },
  { id: '4', userId: '2', userName: 'John Doe', date: '2025-01-03', checkIn: '09:00', checkOut: null, status: 'present', verificationScore: 98.8 },
  { id: '5', userId: '3', userName: 'Jane Smith', date: '2024-12-30', checkIn: '08:45', checkOut: '17:15', status: 'present', verificationScore: 96.5 },
  { id: '6', userId: '3', userName: 'Jane Smith', date: '2024-12-31', checkIn: '09:30', checkOut: '17:00', status: 'late', verificationScore: 45.2, location: 'Unknown' },
];

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    await delay(1200);
    const user = mockUsers.find(u => u.email === email);
    if (!user || password.length < 6) {
      throw new Error('Invalid credentials');
    }
    return { user, token: 'mock-jwt-token-' + user.id };
  },

  register: async (data: { email: string; password: string; name: string }): Promise<{ user: User; token: string }> => {
    await delay(1500);
    if (mockUsers.find(u => u.email === data.email)) {
      throw new Error('Email already registered');
    }
    const newUser: User = {
      id: String(mockUsers.length + 1),
      email: data.email,
      name: data.name,
      role: 'USER',
      enrolledFace: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    return { user: newUser, token: 'mock-jwt-token-' + newUser.id };
  },

  logout: async (): Promise<void> => {
    await delay(500);
  },
};

// Face enrollment API
export const faceApi = {
  enrollFace: async (userId: string, imageData: string): Promise<{ success: boolean; message: string }> => {
    await delay(2000);
    // Simulate face detection and enrollment
    if (Math.random() > 0.1) {
      return { success: true, message: 'Face enrolled successfully' };
    }
    throw new Error('No face detected. Please try again.');
  },

  verifyFace: async (userId: string, imageData: string): Promise<{ verified: boolean; score: number; message: string }> => {
    await delay(1500);
    const score = 85 + Math.random() * 15;
    const verified = score > 90;
    return {
      verified,
      score: Math.round(score * 10) / 10,
      message: verified ? 'Face verified successfully' : 'Verification failed. Please try again.',
    };
  },
};

// Attendance API
export const attendanceApi = {
  markAttendance: async (userId: string, imageData: string, type: 'check-in' | 'check-out'): Promise<{ success: boolean; record: AttendanceRecord }> => {
    await delay(2000);
    const score = 85 + Math.random() * 15;
    const now = new Date();
    const record: AttendanceRecord = {
      id: String(Date.now()),
      userId,
      userName: 'Current User',
      date: now.toISOString().split('T')[0],
      checkIn: type === 'check-in' ? now.toTimeString().slice(0, 5) : '09:00',
      checkOut: type === 'check-out' ? now.toTimeString().slice(0, 5) : null,
      status: score > 90 ? 'present' : 'proxy_detected',
      verificationScore: Math.round(score * 10) / 10,
    };
    return { success: true, record };
  },

  getHistory: async (userId: string): Promise<AttendanceRecord[]> => {
    await delay(800);
    return mockAttendance.filter(a => a.userId === userId);
  },

  getAllAttendance: async (): Promise<AttendanceRecord[]> => {
    await delay(800);
    return mockAttendance;
  },
};

// Admin API
export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    await delay(600);
    return mockUsers;
  },

  getDashboardStats: async (): Promise<{
    totalUsers: number;
    enrolledUsers: number;
    todayAttendance: number;
    proxyAttempts: number;
    weeklyData: { day: string; present: number; late: number; absent: number }[];
    monthlyTrend: { month: string; attendance: number }[];
  }> => {
    await delay(800);
    return {
      totalUsers: mockUsers.length,
      enrolledUsers: mockUsers.filter(u => u.enrolledFace).length,
      todayAttendance: 2,
      proxyAttempts: 1,
      weeklyData: [
        { day: 'Mon', present: 45, late: 5, absent: 3 },
        { day: 'Tue', present: 48, late: 3, absent: 2 },
        { day: 'Wed', present: 50, late: 2, absent: 1 },
        { day: 'Thu', present: 47, late: 4, absent: 2 },
        { day: 'Fri', present: 44, late: 6, absent: 3 },
      ],
      monthlyTrend: [
        { month: 'Sep', attendance: 92 },
        { month: 'Oct', attendance: 94 },
        { month: 'Nov', attendance: 91 },
        { month: 'Dec', attendance: 95 },
      ],
    };
  },
};
