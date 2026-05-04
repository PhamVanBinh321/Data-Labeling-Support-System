import React, { useState, useMemo } from 'react';
import {
  Users, Search, Filter, MoreVertical, Edit2, Trash2, UserCheck,
  UserX, Plus, ChevronDown, Eye, Shield, Mail, Calendar,
  CheckCircle, XCircle, Clock, RefreshCw, Download
} from 'lucide-react';
import './AdminUsers.css';

// ─── Types ───────────────────────────────────────────────────────────────────
type UserRole = 'admin' | 'manager' | 'annotator' | 'reviewer';
type UserStatus = 'active' | 'inactive' | 'suspended';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin: string;
  tasksCompleted: number;
  projectsJoined: number;
  avatar: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_USERS: User[] = [
  { id: 1,  fullName: 'Nguyễn Văn An',    email: 'an.nguyen@example.com',    role: 'admin',     status: 'active',    createdAt: '2024-01-10', lastLogin: '2026-05-04', tasksCompleted: 0,   projectsJoined: 0  , avatar: 'NA' },
  { id: 2,  fullName: 'Trần Thị Bình',    email: 'binh.tran@example.com',    role: 'manager',   status: 'active',    createdAt: '2024-02-15', lastLogin: '2026-05-03', tasksCompleted: 0,   projectsJoined: 5  , avatar: 'TB' },
  { id: 3,  fullName: 'Lê Hoàng Cường',   email: 'cuong.le@example.com',     role: 'annotator', status: 'active',    createdAt: '2024-03-01', lastLogin: '2026-05-04', tasksCompleted: 248, projectsJoined: 3  , avatar: 'LC' },
  { id: 4,  fullName: 'Phạm Minh Đức',    email: 'duc.pham@example.com',     role: 'annotator', status: 'active',    createdAt: '2024-03-12', lastLogin: '2026-05-02', tasksCompleted: 184, projectsJoined: 2  , avatar: 'PD' },
  { id: 5,  fullName: 'Hoàng Thị Lan',    email: 'lan.hoang@example.com',    role: 'reviewer',  status: 'active',    createdAt: '2024-04-05', lastLogin: '2026-05-04', tasksCompleted: 0,   projectsJoined: 4  , avatar: 'HL' },
  { id: 6,  fullName: 'Vũ Quốc Minh',     email: 'minh.vu@example.com',      role: 'annotator', status: 'inactive',  createdAt: '2024-04-20', lastLogin: '2026-03-15', tasksCompleted: 92,  projectsJoined: 1  , avatar: 'VM' },
  { id: 7,  fullName: 'Đỗ Thanh Nga',     email: 'nga.do@example.com',       role: 'manager',   status: 'active',    createdAt: '2024-05-01', lastLogin: '2026-05-03', tasksCompleted: 0,   projectsJoined: 3  , avatar: 'DN' },
  { id: 8,  fullName: 'Bùi Văn Phong',    email: 'phong.bui@example.com',    role: 'annotator', status: 'suspended', createdAt: '2024-05-18', lastLogin: '2026-02-10', tasksCompleted: 37,  projectsJoined: 1  , avatar: 'BP' },
  { id: 9,  fullName: 'Ngô Thị Quỳnh',    email: 'quynh.ngo@example.com',    role: 'reviewer',  status: 'active',    createdAt: '2024-06-03', lastLogin: '2026-05-04', tasksCompleted: 0,   projectsJoined: 5  , avatar: 'NQ' },
  { id: 10, fullName: 'Tô Minh Sơn',      email: 'son.to@example.com',       role: 'annotator', status: 'active',    createdAt: '2024-06-22', lastLogin: '2026-05-01', tasksCompleted: 311, projectsJoined: 4  , avatar: 'TS' },
  { id: 11, fullName: 'Đinh Thị Thu',     email: 'thu.dinh@example.com',     role: 'annotator', status: 'active',    createdAt: '2024-07-11', lastLogin: '2026-05-04', tasksCompleted: 156, projectsJoined: 2  , avatar: 'DT' },
  { id: 12, fullName: 'Lý Hữu Uy',        email: 'uy.ly@example.com',        role: 'manager',   status: 'inactive',  createdAt: '2024-08-05', lastLogin: '2026-04-01', tasksCompleted: 0,   projectsJoined: 2  , avatar: 'LU' },
  { id: 13, fullName: 'Phan Thị Vân',     email: 'van.phan@example.com',     role: 'annotator', status: 'active',    createdAt: '2024-09-14', lastLogin: '2026-05-03', tasksCompleted: 203, projectsJoined: 3  , avatar: 'PV' },
  { id: 14, fullName: 'Cao Việt Xuyên',   email: 'xuyen.cao@example.com',    role: 'reviewer',  status: 'active',    createdAt: '2024-10-02', lastLogin: '2026-05-02', tasksCompleted: 0,   projectsJoined: 4  , avatar: 'CX' },
  { id: 15, fullName: 'Trịnh Thị Yến',   email: 'yen.trinh@example.com',    role: 'annotator', status: 'active',    createdAt: '2024-11-17', lastLogin: '2026-05-04', tasksCompleted: 89,  projectsJoined: 2  , avatar: 'TY' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin:     { label: 'Admin',     color: 'role-admin'     },
  manager:   { label: 'Manager',   color: 'role-manager'   },
  annotator: { label: 'Annotator', color: 'role-annotator' },
  reviewer:  { label: 'Reviewer',  color: 'role-reviewer'  },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: React.ReactNode }> = {
  active:    { label: 'Hoạt động',  icon: <CheckCircle size={13} /> },
  inactive:  { label: 'Không hoạt động', icon: <Clock size={13} /> },
  suspended: { label: 'Đã khoá',   icon: <XCircle size={13} />    },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
];
function Avatar({ initials, id }: { initials: string; id: number }) {
  const bg = AVATAR_COLORS[id % AVATAR_COLORS.length];
  return (
    <div className="user-avatar" style={{ background: bg }}>
      {initials}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => void;
}
function EditModal({ user, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<User>({ ...user });
  const set = (k: keyof User, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <Edit2 size={18} />
            <span>Chỉnh sửa người dùng</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-avatar-row">
            <Avatar initials={form.avatar} id={form.id} />
            <div>
              <p className="modal-user-name">{form.fullName}</p>
              <p className="modal-user-email">{form.email}</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Họ và tên</label>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Vai trò</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="annotator">Annotator</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Trạng thái</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
                <option value="suspended">Khoá</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <Eye size={18} />
            <span>Chi tiết người dùng</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="detail-hero">
            <Avatar initials={user.avatar} id={user.id} />
            <div className="detail-hero-info">
              <h3>{user.fullName}</h3>
              <p>{user.email}</p>
              <div className="detail-badges">
                <span className={`role-badge ${ROLE_CONFIG[user.role].color}`}>
                  <Shield size={11} /> {ROLE_CONFIG[user.role].label}
                </span>
                <span className={`status-badge status-${user.status}`}>
                  {STATUS_CONFIG[user.status].icon} {STATUS_CONFIG[user.status].label}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-stats">
            <div className="detail-stat">
              <span className="ds-value">{user.tasksCompleted}</span>
              <span className="ds-label">Tasks hoàn thành</span>
            </div>
            <div className="detail-stat">
              <span className="ds-value">{user.projectsJoined}</span>
              <span className="ds-label">Projects tham gia</span>
            </div>
          </div>

          <div className="detail-meta">
            <div className="meta-row">
              <Calendar size={14} />
              <span>Ngày tạo:</span>
              <strong>{formatDate(user.createdAt)}</strong>
            </div>
            <div className="meta-row">
              <Clock size={14} />
              <span>Đăng nhập lần cuối:</span>
              <strong>{formatDate(user.lastLogin)}</strong>
            </div>
            <div className="meta-row">
              <Mail size={14} />
              <span>Email:</span>
              <strong>{user.email}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left danger-header">
            <Trash2 size={18} />
            <span>Xoá người dùng</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="confirm-text">
            Bạn có chắc muốn xoá người dùng <strong>{user.fullName}</strong>?
            Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-danger" onClick={onConfirm}>Xoá</button>
        </div>
      </div>
    </div>
  );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowMenu({ user, onView, onEdit, onDelete, onToggleStatus }: {
  user: User;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="row-menu-wrapper">
      <button className="row-menu-btn" id={`row-menu-${user.id}`} onClick={() => setOpen(o => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="row-menu-backdrop" onClick={close} />
          <div className="row-menu-dropdown">
            <button onClick={() => { onView(); close(); }}><Eye size={14}/> Xem chi tiết</button>
            <button onClick={() => { onEdit(); close(); }}><Edit2 size={14}/> Chỉnh sửa</button>
            <button onClick={() => { onToggleStatus(); close(); }}>
              {user.status === 'active' ? <UserX size={14}/> : <UserCheck size={14}/>}
              {user.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá'}
            </button>
            <button className="menu-danger" onClick={() => { onDelete(); close(); }}>
              <Trash2 size={14}/> Xoá
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Stats
  const stats = useMemo(() => ({
    total:     users.length,
    active:    users.filter(u => u.status === 'active').length,
    managers:  users.filter(u => u.role === 'manager').length,
    annotators:users.filter(u => u.role === 'annotator').length,
  }), [users]);

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.fullName.toLowerCase().includes(search.toLowerCase())
        || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter   === 'all' || u.role   === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSave = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditingUser(null);
  };

  const handleDelete = () => {
    if (!deletingUser) return;
    setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
    setDeletingUser(null);
  };

  const handleToggleStatus = (user: User) => {
    const next: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: next } : u));
  };

  return (
    <div className="admin-users-page animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-left">
          <Users size={24} />
          <div>
            <h1>Quản lý Người dùng</h1>
            <p>Xem và quản lý tất cả tài khoản trong hệ thống</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-icon-text" title="Xuất CSV">
            <Download size={15} /> Xuất CSV
          </button>
          <button className="btn btn-primary btn-icon-text" id="add-user-btn">
            <Plus size={15} /> Thêm người dùng
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="users-stats-row">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-icon"><Users size={22} /></div>
          <div>
            <span className="stat-label">Tổng người dùng</span>
            <h3 className="stat-value">{stats.total}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-card-icon"><CheckCircle size={22} /></div>
          <div>
            <span className="stat-label">Đang hoạt động</span>
            <h3 className="stat-value">{stats.active}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="stat-card-icon"><Shield size={22} /></div>
          <div>
            <span className="stat-label">Managers</span>
            <h3 className="stat-value">{stats.managers}</h3>
          </div>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="stat-card-icon"><UserCheck size={22} /></div>
          <div>
            <span className="stat-label">Annotators</span>
            <h3 className="stat-value">{stats.annotators}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            id="user-search"
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
        </div>

        <div className="filter-group">
          <Filter size={15} />
          <div className="select-wrapper">
            <select
              id="role-filter"
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value as UserRole | 'all'); setPage(1); }}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="annotator">Annotator</option>
              <option value="reviewer">Reviewer</option>
            </select>
            <ChevronDown size={14} />
          </div>

          <div className="select-wrapper">
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as UserStatus | 'all'); setPage(1); }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="suspended">Đã khoá</option>
            </select>
            <ChevronDown size={14} />
          </div>

          {(roleFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button className="btn-reset-filter" onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setSearch(''); setPage(1); }}>
              <RefreshCw size={13} /> Xoá bộ lọc
            </button>
          )}
        </div>

        <span className="results-count">{filtered.length} người dùng</span>
      </div>

      {/* Table */}
      <div className="users-table-card">
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Tasks hoàn thành</th>
                <th>Projects</th>
                <th>Ngày tạo</th>
                <th>Đăng nhập gần nhất</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    <Users size={32} />
                    <p>Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              ) : paged.map(user => (
                <tr key={user.id} className="user-row">
                  <td>
                    <div className="user-cell">
                      <Avatar initials={user.avatar} id={user.id} />
                      <div className="user-cell-info">
                        <span className="user-name">{user.fullName}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${ROLE_CONFIG[user.role].color}`}>
                      {ROLE_CONFIG[user.role].label}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {STATUS_CONFIG[user.status].icon}
                      {STATUS_CONFIG[user.status].label}
                    </span>
                  </td>
                  <td className="text-center">
                    {user.tasksCompleted > 0 ? (
                      <span className="tasks-count">{user.tasksCompleted}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="tasks-count">{user.projectsJoined}</span>
                  </td>
                  <td className="date-cell">{formatDate(user.createdAt)}</td>
                  <td className="date-cell">{formatDate(user.lastLogin)}</td>
                  <td>
                    <RowMenu
                      user={user}
                      onView={() => setViewingUser(user)}
                      onEdit={() => setEditingUser(user)}
                      onDelete={() => setDeletingUser(user)}
                      onToggleStatus={() => handleToggleStatus(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="users-pagination">
            <span className="pagination-info">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} người dùng
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

      {/* Modals */}
      {editingUser  && <EditModal   user={editingUser}  onClose={() => setEditingUser(null)}  onSave={handleSave} />}
      {viewingUser  && <DetailModal user={viewingUser}  onClose={() => setViewingUser(null)} />}
      {deletingUser && <ConfirmModal user={deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleDelete} />}
    </div>
  );
};

export default AdminUsers;
