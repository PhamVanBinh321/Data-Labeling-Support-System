import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications';

const Topbar: React.FC = () => {
  const { activeRole, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load unread count on mount and every 30s
  useEffect(() => {
    const fetchCount = () => {
      notificationsApi.unreadCount()
        .then((count: number) => setUnreadCount(count ?? 0))
        .catch(() => { /* silent */ });
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = async () => {
    if (!dropdownOpen) {
      try {
        const data = await notificationsApi.list({ page: 1 });
        // Backend may return paginated {results:[]} or plain array
        const items = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        setNotifications(items);
      } catch { /* silent */ }
    }
    setDropdownOpen(o => !o);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{getPageTitle()}</h2>
      </div>

      <div className="topbar-right">
        {/* Notification bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-icon"
            onClick={handleBellClick}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
          >
            <Bell size={20} color="#64748b" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                minWidth: '16px', height: '16px',
                backgroundColor: 'var(--danger-red)', borderRadius: '50%',
                fontSize: '0.65rem', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, padding: '0 2px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0,
              width: '320px', background: '#fff',
              border: '1px solid var(--border-color)', borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 1000,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Thông báo</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-blue)', fontSize: '0.8rem' }}
                  >
                    <CheckCheck size={14} /> Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Không có thông báo nào
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        background: n.is_read ? '#fff' : '#f0f7ff',
                        cursor: 'default',
                      }}
                    >
                      <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: '0.875rem', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{n.message}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(n.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>

        <div className="user-profile">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user?.name ?? 'User'}</span>
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
