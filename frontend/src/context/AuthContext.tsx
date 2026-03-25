import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { AuthUser } from '../api/auth';

// Định nghĩa các Role có trong hệ thống
export type Role = 'manager' | 'annotator' | 'reviewer' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  activeRole: Role;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('access_token')
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role>(() => {
    const storedRole = localStorage.getItem('annotate_pro_role');
    return (storedRole as Role) || null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Khởi động: load user từ token đã lưu
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        setIsAuthenticated(true);
        if (u.role) {
          setActiveRole(u.role as Role);
          localStorage.setItem('annotate_pro_role', u.role);
        }
      })
      .catch(() => {
        // Token hết hạn hoặc không hợp lệ — interceptor sẽ xử lý refresh
        setIsAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    setIsAuthenticated(true);
    if (data.user.role) {
      setActiveRole(data.user.role as Role);
      localStorage.setItem('annotate_pro_role', data.user.role);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('annotate_pro_role');
    setIsAuthenticated(false);
    setActiveRole(null);
    setUser(null);
  };

  const setRole = async (role: Role) => {
    if (!role) return;
    const updatedUser = await authApi.setRole(role);
    setUser(updatedUser);
    setActiveRole(role);
    localStorage.setItem('annotate_pro_role', role);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, activeRole, user, loading,
      login, register, logout, setRole,
    }}>
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
