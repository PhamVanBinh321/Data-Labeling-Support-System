import React, { useState } from 'react';
import {
  Users, Search, Mail, Star, CheckSquare,
  Shield, Eye
} from 'lucide-react';
import { MOCK_USERS, MOCK_PROJECT_MEMBERS } from '../../data/mockData';
import type { User, UserRole } from '../../data/mockData';
import { useData } from '../../context/DataContext';
import './ManagerMembers.css';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  manager:    { label: 'Manager',    color: '#f97316', bg: '#fff7ed' },
  annotator:  { label: 'Annotator',  color: '#3b82f6', bg: '#eff6ff' },
  reviewer:   { label: 'Reviewer',   color: '#10b981', bg: '#f0fdf4' },
};

const AVATAR_GRADIENT: Record<UserRole, string> = {
  manager:   'linear-gradient(135deg,#f97316,#fb923c)',
  annotator: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  reviewer:  'linear-gradient(135deg,#10b981,#34d399)',
};

const ManagerMembers: React.FC = () => {
  const { tasks, getProjectById } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const filtered = MOCK_USERS.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Per-user enrichment
  const enrichUser = (u: User) => {
    const memberships    = MOCK_PROJECT_MEMBERS.filter(m => m.userId === u.id && m.status === 'active');
    const activeProjects = memberships.map(m => getProjectById(m.projectId)).filter(Boolean);
    const tasksTotal     = tasks.filter(t => t.annotatorId === u.id || t.reviewerId === u.id).length;
    return { memberships, activeProjects, tasksTotal };
  };

  return (
    <div className="manager-members-page animate-fade-in">
      <div className="page-title-row">
        <div>
          <h1><Users size={24} /> Thành viên Workspace</h1>
          <p className="page-subtitle">Tất cả thành viên trong tổ chức. Chỉ xem.</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-row">
        {(['all', 'manager', 'annotator', 'reviewer'] as const).map(role => {
          const count = role === 'all' ? MOCK_USERS.length : MOCK_USERS.filter(u => u.role === role).length;
          const cfg = role === 'all' ? null : ROLE_CONFIG[role];
          return (
            <div className="stat-card" key={role}>
              <span className="stat-label">{role === 'all' ? 'Tổng thành viên' : cfg!.label + 's'}</span>
              <h3 className="stat-value" style={cfg ? { color: cfg.color } : {}}>{count}</h3>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="type-filters">
          {(['all', 'manager', 'annotator', 'reviewer'] as const).map(r => (
            <button
              key={r}
              className={`type-filter-btn ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'Tất cả' : ROLE_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Member cards grid */}
      <div className="members-cards-grid">
        {filtered.length === 0 && (
          <div className="empty-state">Không tìm thấy thành viên nào phù hợp.</div>
        )}
        {filtered.map(u => {
          const { activeProjects, tasksTotal } = enrichUser(u);
          const cfg = ROLE_CONFIG[u.role];
          return (
            <div key={u.id} className="member-profile-card">
              {/* Avatar & role */}
              <div className="mpc-top">
                <div className="mpc-avatar" style={{ background: AVATAR_GRADIENT[u.role] }}>
                  {u.avatar}
                </div>
                <span className="mpc-role-badge" style={{ color: cfg.color, background: cfg.bg }}>
                  {u.role === 'manager' ? <Shield size={12} /> : u.role === 'reviewer' ? <Eye size={12} /> : <CheckSquare size={12} />}
                  {cfg.label}
                </span>
              </div>

              {/* Info */}
              <div className="mpc-name">{u.name}</div>
              <div className="mpc-email"><Mail size={13} />{u.email}</div>

              {/* Stats row */}
              <div className="mpc-stats">
                {u.qualityScore !== undefined && (
                  <div className="mpc-stat">
                    <Star size={13} className="mpc-stat-icon gold" />
                    <span><strong>{u.qualityScore}%</strong> chất lượng</span>
                  </div>
                )}
                {u.tasksCompleted !== undefined && (
                  <div className="mpc-stat">
                    <CheckSquare size={13} className="mpc-stat-icon blue" />
                    <span><strong>{u.tasksCompleted}</strong> tasks done</span>
                  </div>
                )}
              </div>

              {/* Active projects */}
              {activeProjects.length > 0 && (
                <div className="mpc-projects">
                  <span className="mpc-projects-label">Tham gia dự án:</span>
                  <div className="mpc-project-tags">
                    {activeProjects.map(p => (
                      <span key={p.id} className="mpc-project-tag">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mpc-footer">
                <span className="mpc-tasks-total">{tasksTotal} task được giao</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManagerMembers;
