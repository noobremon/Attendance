import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('attendanceUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Use email as username since backend supports both
    const { user, token } = await authApi.login(email, password);
    setUser(user);
    localStorage.setItem('attendanceUser', JSON.stringify(user));
    localStorage.setItem('attendanceToken', token);
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    // Map the frontend data to backend requirements
    const registerData = {
      username: data.name,
      email: data.email,
      password: data.password
    };
    const { user, token } = await authApi.register(registerData);
    setUser(user);
    localStorage.setItem('attendanceUser', JSON.stringify(user));
    localStorage.setItem('attendanceToken', token);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    localStorage.removeItem('attendanceUser');
    localStorage.removeItem('attendanceToken');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('attendanceUser', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
