import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

// Định nghĩa các Role có trong hệ thống
export type Role = 'manager' | 'annotator' | 'reviewer' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  activeRole: Role;
  login: () => void;
  logout: () => void;
  setRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mock state cho việc dev UI
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); 
  const [activeRole, setActiveRole] = useState<Role>(() => {
    // Thử lấy role từ localStorage nếu đã từng chọn trước đây (cố định theo tài khoản)
    const storedRole = localStorage.getItem('annotate_pro_role');
    return (storedRole as Role) || null;
  });

  const login = () => setIsAuthenticated(true);
  
  const logout = () => {
    setIsAuthenticated(false);
    setActiveRole(null);
    localStorage.removeItem('annotate_pro_role');
  };
  
  const handleSetRole = (role: Role) => {
    setActiveRole(role);
    if (role) {
      localStorage.setItem('annotate_pro_role', role);
    } else {
      localStorage.removeItem('annotate_pro_role');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, activeRole, login, logout, setRole: handleSetRole }}>
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
