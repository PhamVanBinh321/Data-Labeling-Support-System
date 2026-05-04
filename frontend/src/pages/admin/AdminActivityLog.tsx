import React, { useState, useMemo } from 'react';
import {
  Activity, Search, Filter, ChevronDown, RefreshCw,
  LogIn, LogOut, UserPlus, Edit2, Trash2, ShieldAlert,
  FolderPlus, CheckCircle, XCircle, Download
} from 'lucide-react';
import './AdminActivityLog.css';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType =
  | 'login' | 'logout' | 'register'
  | 'user_update' | 'user_delete'
  | 'project_create' | 'task_complete' | 'task_reject'
  | 'permission_change';

interface LogEntry {
  id: number;
  user: string;
  role: string;
  action: ActionType;
  description: string;
  ip: string;
  timestamp: string; // ISO
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_LOGS: LogEntry[] = [
  { id: 1,  user: 'Nguyễn Văn An',   role: 'admin',     action: 'login',            description: 'Đăng nhập hệ thống',                        ip: '192.168.1.10', timestamp: '2026-05-05T01:52:00' },
  { id: 2,  user: 'Trần Thị Bình',   role: 'manager',   action: 'project_create',   description: 'Tạo project "Dataset COCO 2026"',             ip: '10.0.0.25',   timestamp: '2026-05-05T01:48:15' },
  { id: 3,  user: 'Lê Hoàng Cường',  role: 'annotator', action: 'task_complete',    description: 'Hoàn thành task #1024 (ảnh xe cộ)',           ip: '10.0.0.31',   timestamp: '2026-05-05T01:44:50' },
  { id: 4,  user: 'Hoàng Thị Lan',   role: 'reviewer',  action: 'task_reject',      description: 'Từ chối task #1019 — sai nhãn',              ip: '10.0.0.42',   timestamp: '2026-05-05T01:40:02' },
  { id: 5,  user: 'Nguyễn Văn An',   role: 'admin',     action: 'user_update',      description: 'Cập nhật vai trò của Vũ Quốc Minh → inactive', ip: '192.168.1.10', timestamp: '2026-05-05T01:35:20' },
  { id: 6,  user: 'Phạm Minh Đức',   role: 'annotator', action: 'login',            description: 'Đăng nhập hệ thống',                        ip: '10.0.1.5',    timestamp: '2026-05-05T01:30:00' },
  { id: 7,  user: 'Đỗ Thanh Nga',    role: 'manager',   action: 'user_update',      description: 'Cập nhật thông tin thành viên Đinh Thị Thu', ip: '10.0.0.27',   timestamp: '2026-05-05T01:22:10' },
  { id: 8,  user: 'Nguyễn Văn An',   role: 'admin',     action: 'permission_change',description: 'Thay đổi quyền truy cập annotation-service',  ip: '192.168.1.10', timestamp: '2026-05-05T01:15:45' },
  { id: 9,  user: 'Tô Minh Sơn',     role: 'annotator', action: 'task_complete',    description: 'Hoàn thành task #998 (ảnh người)',           ip: '10.0.1.12',   timestamp: '2026-05-05T01:08:33' },
  { id: 10, user: 'Bùi Văn Phong',   role: 'annotator', action: 'login',            description: 'Đăng nhập thất bại — sai mật khẩu',         ip: '10.0.1.9',    timestamp: '2026-05-05T01:00:00' },
  { id: 11, user: 'Nguyễn Văn An',   role: 'admin',     action: 'user_delete',      description: 'Xoá tài khoản test_user_99',                 ip: '192.168.1.10', timestamp: '2026-05-04T23:55:11' },
  { id: 12, user: 'Cao Việt Xuyên',  role: 'reviewer',  action: 'task_complete',    description: 'Phê duyệt task #1002 (segment)',             ip: '10.0.0.50',   timestamp: '2026-05-04T23:40:22' },
  { id: 13, user: 'Phan Thị Vân',    role: 'annotator', action: 'task_complete',    description: 'Hoàn thành task #1003 (bounding box)',       ip: '10.0.1.18',   timestamp: '2026-05-04T23:30:05' },
  { id: 14, user: 'Trần Thị Bình',   role: 'manager',   action: 'project_create',   description: 'Tạo project "Traffic Sign Detection"',       ip: '10.0.0.25',   timestamp: '2026-05-04T23:15:00' },
  { id: 15, user: 'Vũ Quốc Minh',    role: 'annotator', action: 'logout',           description: 'Đăng xuất hệ thống',                        ip: '10.0.1.6',    timestamp: '2026-05-04T22:55:40' },
  { id: 16, user: 'Ngô Thị Quỳnh',   role: 'reviewer',  action: 'task_reject',      description: 'Từ chối task #995 — thiếu annotation',      ip: '10.0.0.43',   timestamp: '2026-05-04T22:30:10' },
  { id: 17, user: 'Trịnh Thị Yến',  role: 'annotator', action: 'login',            description: 'Đăng nhập hệ thống',                        ip: '10.0.1.22',   timestamp: '2026-05-04T22:05:00' },
  { id: 18, user: 'Đinh Thị Thu',    role: 'annotator', action: 'task_complete',    description: 'Hoàn thành task #987 (phân loại ảnh)',       ip: '10.0.1.15',   timestamp: '2026-05-04T21:50:18' },
  { id: 19, user: 'Nguyễn Văn An',   role: 'admin',     action: 'permission_change',description: 'Khoá tài khoản Bùi Văn Phong',              ip: '192.168.1.10', timestamp: '2026-05-04T21:30:00' },
  { id: 20, user: 'Lý Hữu Uy',       role: 'manager',   action: 'logout',           description: 'Đăng xuất hệ thống',                        ip: '10.0.0.28',   timestamp: '2026-05-04T21:00:00' },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode; color: string }> = {
  login:             { label: 'Đăng nhập',       icon: <LogIn size={14} />,       color: 'log-login'      },
  logout:            { label: 'Đăng xuất',       icon: <LogOut size={14} />,      color: 'log-logout'     },
  register:          { label: 'Đăng ký',         icon: <UserPlus size={14} />,    color: 'log-register'   },
  user_update:       { label: 'Sửa người dùng',  icon: <Edit2 size={14} />,       color: 'log-update'     },
  user_delete:       { label: 'Xoá người dùng',  icon: <Trash2 size={14} />,      color: 'log-delete'     },
  project_create:    { label: 'Tạo project',     icon: <FolderPlus size={14} />,  color: 'log-project'    },
  task_complete:     { label: 'Hoàn thành task', icon: <CheckCircle size={14} />, color: 'log-complete'   },
  task_reject:       { label: 'Từ chối task',    icon: <XCircle size={14} />,     color: 'log-reject'     },
  permission_change: { label: 'Đổi quyền',       icon: <ShieldAlert size={14} />, color: 'log-permission' },
};

const ACTION_OPTIONS: { value: ActionType | 'all'; label: string }[] = [
  { value: 'all',              label: 'Tất cả hành động'  },
  { value: 'login',            label: 'Đăng nhập'         },
  { value: 'logout',           label: 'Đăng xuất'         },
  { value: 'user_update',      label: 'Sửa người dùng'    },
  { value: 'user_delete',      label: 'Xoá người dùng'    },
  { value: 'project_create',   label: 'Tạo project'       },
  { value: 'task_complete',    label: 'Hoàn thành task'   },
  { value: 'task_reject',      label: 'Từ chối task'      },
  { value: 'permission_change',label: 'Đổi quyền'         },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return `${Math.floor(diff / 86400)}d trước`;
}

const ROLE_COLORS: Record<string, string> = {
  admin:     '#92400e',
  manager:   '#5b21b6',
  annotator: '#1e40af',
  reviewer:  '#065f46',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminActivityLog: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter(log => {
      const matchSearch = !search
        || log.user.toLowerCase().includes(search.toLowerCase())
        || log.description.toLowerCase().includes(search.toLowerCase())
        || log.ip.includes(search);
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogs = MOCK_LOGS.filter(l => l.timestamp.startsWith(todayStr)).length;
  const loginCount = MOCK_LOGS.filter(l => l.action === 'login').length;
  const alertCount = MOCK_LOGS.filter(l => ['user_delete', 'permission_change'].includes(l.action)).length;

  return (
    <div className="activity-log-page animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-left">
          <Activity size={24} />
          <div>
            <h1>Nhật ký Hoạt động</h1>
            <p>Theo dõi toàn bộ hành động của người dùng trong hệ thống</p>
          </div>
        </div>
        <button className="btn btn-secondary btn-icon-text">
          <Download size={15} /> Xuất log
        </button>
      </div>

      {/* Stat Cards */}
      <div className="log-stats-row">
        <div className="log-stat-card">
          <div className="log-stat-icon icon-blue"><Activity size={20} /></div>
          <div>
            <span className="stat-label">Tổng sự kiện</span>
            <h3 className="stat-value">{MOCK_LOGS.length}</h3>
          </div>
        </div>
        <div className="log-stat-card">
          <div className="log-stat-icon icon-green"><CheckCircle size={20} /></div>
          <div>
            <span className="stat-label">Hôm nay</span>
            <h3 className="stat-value">{todayLogs}</h3>
          </div>
        </div>
        <div className="log-stat-card">
          <div className="log-stat-icon icon-purple"><LogIn size={20} /></div>
          <div>
            <span className="stat-label">Đăng nhập</span>
            <h3 className="stat-value">{loginCount}</h3>
          </div>
        </div>
        <div className="log-stat-card">
          <div className="log-stat-icon icon-red"><ShieldAlert size={20} /></div>
          <div>
            <span className="stat-label">Cảnh báo</span>
            <h3 className="stat-value">{alertCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="log-filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            id="log-search"
            type="text"
            placeholder="Tìm theo tên, mô tả, IP..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
        </div>

        <div className="filter-group">
          <Filter size={15} />
          <div className="select-wrapper">
            <select
              id="action-filter"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value as ActionType | 'all'); setPage(1); }}
            >
              {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>

          {(search || actionFilter !== 'all') && (
            <button className="btn-reset-filter" onClick={() => { setSearch(''); setActionFilter('all'); setPage(1); }}>
              <RefreshCw size={13} /> Xoá bộ lọc
            </button>
          )}
        </div>

        <span className="results-count">{filtered.length} sự kiện</span>
      </div>

      {/* Log Table */}
      <div className="log-table-card">
        <div className="log-table-wrapper">
          <table className="log-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người dùng</th>
                <th>Hành động</th>
                <th>Mô tả</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    <Activity size={32} />
                    <p>Không tìm thấy nhật ký nào</p>
                  </td>
                </tr>
              ) : paged.map(log => {
                const cfg = ACTION_CONFIG[log.action];
                return (
                  <tr key={log.id} className="log-row">
                    <td className="log-time-cell">
                      <span className="log-time-main">{formatTime(log.timestamp)}</span>
                      <span className="log-time-ago">{timeAgo(log.timestamp)}</span>
                    </td>
                    <td>
                      <div className="log-user-cell">
                        <span className="log-user-name">{log.user}</span>
                        <span
                          className="log-role-badge"
                          style={{ color: ROLE_COLORS[log.role] ?? '#64748b' }}
                        >
                          {log.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`log-action-badge ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="log-desc">{log.description}</td>
                    <td className="log-ip">{log.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="log-pagination">
            <span className="pagination-info">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivityLog;
