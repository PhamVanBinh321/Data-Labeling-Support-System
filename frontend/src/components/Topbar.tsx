import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Topbar: React.FC = () => {
  const { activeRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Simple breadcrumb generator based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/projects')) return 'Projects';
    if (path.includes('/datasets')) return 'Datasets';
    if (path.includes('/members')) return 'Members';
    if (path.includes('/tasks')) return 'My Tasks';
    if (path.includes('/performance')) return 'Performance';
    if (path.includes('/queue')) return 'Review Queue';
    if (path.includes('/metrics')) return 'Quality Metrics';
    if (path.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{getPageTitle()}</h2>
      </div>
      
      <div className="topbar-right">
        <button className="btn btn-icon" style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
          <Bell size={20} color="#64748b" />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--danger-red)', borderRadius: '50%' }}></span>
        </button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
        
        <div className="user-profile">
          <div className="avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-email" style={{ textTransform: 'capitalize' }}>Role: {activeRole}</span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          title="Đăng xuất & Đổi Role"
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--danger-red)',
            padding: '0.5rem',
            marginLeft: '0.5rem'
          }}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
