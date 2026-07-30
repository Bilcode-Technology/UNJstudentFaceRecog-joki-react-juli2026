'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserRole {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  nim?: string;
  angkatan?: string;
  roles: UserRole[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (res.ok && data?.status === 'success' && data?.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      let errorMsg = data.message || 'Login gagal';
      if (data.errors && typeof data.errors === 'object') {
        const fieldErrors = Object.values(data.errors).flat().filter(Boolean);
        if (fieldErrors.length > 0) {
          errorMsg = fieldErrors.join('. ');
        }
      }
      throw new Error(errorMsg);
    }

    if (data.data?.user) {
      setUser(data.data.user);
    } else {
      await refreshUser();
    }

    return data;
  };

  const register = async (payload: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      let errorMsg = data.message || 'Registrasi gagal';
      if (data.errors && typeof data.errors === 'object') {
        const fieldErrors = Object.values(data.errors).flat().filter(Boolean);
        if (fieldErrors.length > 0) {
          errorMsg = fieldErrors.join('. ');
        }
      }
      throw new Error(errorMsg);
    }

    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
