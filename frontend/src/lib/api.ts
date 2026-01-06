// Real API utilities for connecting to backend

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'USER';
  faceEmbedding: number[] | null;
  createdAt: string;
  // Additional fields for frontend compatibility
  name?: string;
  enrolledFace?: boolean;
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  ipAddress?: string;
  lat?: number;
  lng?: number;
  confidence?: number;
  createdAt: string;
  // Additional fields for frontend compatibility
  date?: string;
  checkIn?: string;
  checkOut?: string | null;
  verificationScore?: number;
  userName?: string;
}

export interface SuspiciousLog {
  id: number;
  userId: number;
  reason: string;
  ipAddress?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface Location {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('attendanceToken');
};

// Helper function to make API requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    const token = `mock-jwt-token-${data.id}`; // In real app, the backend would return the actual token
    localStorage.setItem('attendanceToken', token);
    localStorage.setItem('attendanceUser', JSON.stringify(data));

    return { user: data, token };
  },

  register: async (data: { username: string; password: string; email: string }): Promise<{ user: User; token: string }> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Registration failed');
    }

    const userData = await response.json();
    const token = `mock-jwt-token-${userData.id}`; // In real app, the backend would return the actual token
    localStorage.setItem('attendanceToken', token);
    localStorage.setItem('attendanceUser', JSON.stringify(userData));

    return { user: userData, token };
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    localStorage.removeItem('attendanceToken');
    localStorage.removeItem('attendanceUser');
  },

  getMe: async (): Promise<User> => {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return response.json();
  },
};

// Face API
export const faceApi = {
  enrollFace: async (userId: number, imageData: string): Promise<{ success: boolean; message: string; quality_score?: number }> => {
    const response = await apiRequest('/api/face/enroll', {
      method: 'POST',
      body: JSON.stringify({ 
        userId,
        faceImage: imageData // Send as base64 string
      }),
    });

    return response;
  },

  verifyFace: async (userId: number, imageData: string): Promise<{ verified: boolean; score: number; message: string }> => {
    // This would typically be called as part of attendance marking
    // The verification happens on the backend when marking attendance
    throw new Error('Direct face verification is not available. Use markAttendance instead.');
  },
};

// Attendance API
export const attendanceApi = {
  markAttendance: async (lat: number, lng: number, imageData: string): Promise<{ status: string; record: AttendanceRecord; confidence?: number }> => {
    const response = await apiRequest('/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ 
        lat, 
        lng, 
        faceEmbedding: imageData // Send image as base64 string
      }),
    });

    return response;
  },

  getHistory: async (userId: number): Promise<AttendanceRecord[]> => {
    const response = await apiRequest('/api/attendance/history');
    return response;
  },

  getAllAttendance: async (): Promise<AttendanceRecord[]> => {
    const response = await apiRequest('/api/admin/attendance');
    return response;
  },
};

// Admin API
export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiRequest('/api/admin/users');
    return response;
  },

  getDashboardStats: async (): Promise<{
    totalUsers: number;
    enrolledUsers: number;
    todayAttendance: number;
    proxyAttempts: number;
    weeklyData: { day: string; present: number; late: number; absent: number }[];
    monthlyTrend: { month: string; attendance: number }[];
  }> => {
    // For now, we'll return mock data or fetch from available endpoints
    // In a real implementation, we'd need to create this endpoint in the backend
    const [allAttendance, suspiciousLogs] = await Promise.all([
      attendanceApi.getAllAttendance().catch(() => []),
      apiRequest('/api/admin/suspicious').catch(() => []),
    ]);

    const stats = {
      totalUsers: 10, // Mock value for now
      enrolledUsers: 8, // Mock value for now
      todayAttendance: allAttendance.filter(record => 
        new Date(record.createdAt).toDateString() === new Date().toDateString()
      ).length,
      proxyAttempts: suspiciousLogs.length,
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

    return stats;
  },
};