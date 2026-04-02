import React, { useState, useEffect } from 'react';
import {
  Users, Search,
  Shield, Eye, CheckSquare
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { projectsApi } from '../../api/projects';
import './ManagerMembers.css';

type UserRole = 'manager' | 'annotator' | 'reviewer';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  manager:   { label: 'Manager',   color: '#f97316', bg: '#fff7ed' },
  annotator: { label: 'Annotator', color: '#3b82f6', bg: '#eff6ff' },
  reviewer:  { label: 'Reviewer',  color: '#10b981', bg: '#f0fdf4' },
};

const AVATAR_GRADIENT: Record<UserRole, string> = {
  manager:   'linear-gradient(135deg,#f97316,#fb923c)',
  annotator: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  reviewer:  'linear-gradient(135deg,#10b981,#34d399)',
};

interface MemberEntry {
  userId: number;
  role: UserRole;
  status: string;
  projectIds: string[];
}

const ManagerMembers: React.FC = () => {
  const { projects, tasks, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const validProjects = projects.filter(p => p.id && !isNaN(Number(p.id)));
    if (validProjects.length === 0) return;
    setLoadingMembers(true);
    Promise.all(validProjects.map(p => projectsApi.listMembers(Number(p.id)).then((data: any[]) =>
      (Array.isArray(data) ? data : []).map((m: any) => ({ ...m, projectId: p.id }))
    ).catch(() => [])))
      .then(results => {
        // Gộp unique theo userId+role
        const map = new Map<string, MemberEntry>();
        results.flat().forEach((m: any) => {
          const key = `${m.user_id}_${m.role}`;
          if (map.has(key)) {
            map.get(key)!.projectIds.push(m.projectId);
          } else {
            map.set(key, {
              userId: m.user_id,
              role: m.role as UserRole,
              status: m.status,
              projectIds: [m.projectId],
            });
          }
        });
        setMembers(Array.from(map.values()));
      })
      .finally(() => setLoadingMembers(false));
  }, [projects]);

  const filtered = members.filter(m => {
    const matchSearch = String(m.userId).includes(search);
    const matchRole   = roleFilter === 'all' || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const loading = dataLoading || loadingMembers;

  return (
    <div className="manager-members-page animate-fade-in">
      <div className="page-title-row">
        <div>
          <h1><Users size={24} /> Thành viên Workspace</h1>
          <p className="page-subtitle">Tất cả thành viên trong tổ chức. Chỉ xem.</p>
        </div>
      </div>

      <div className="stats-row">
        {(['all', 'manager', 'annotator', 'reviewer'] as const).map(role => {
          const count = role === 'all' ? members.length : members.filter(m => m.role === role).length;
          const cfg = role === 'all' ? null : ROLE_CONFIG[role];
          return (
            <div className="stat-card" key={role}>
              <span className="stat-label">{role === 'all' ? 'Tổng thành viên' : cfg!.label + 's'}</span>
              <h3 className="stat-value" style={cfg ? { color: cfg.color } : {}}>{count}</h3>
            </div>
          );
        })}
      </div>

      <div className="filter-row">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo User ID..."
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

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : (
        <div className="members-cards-grid">
          {filtered.length === 0 && (
            <div className="empty-state">Không tìm thấy thành viên nào.</div>
          )}
          {filtered.map(m => {
            const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG['annotator'];
            const memberProjects = projects.filter(p => m.projectIds.includes(p.id));
            const tasksCount = tasks.filter(t =>
              String(t.annotatorId) === String(m.userId) ||
              String(t.reviewerId) === String(m.userId)
            ).length;
            const initials = `U${m.userId}`;

            return (
              <div key={`${m.userId}_${m.role}`} className="member-profile-card">
                <div className="mpc-top">
                  <div className="mpc-avatar" style={{ background: AVATAR_GRADIENT[m.role] }}>
                    {initials}
                  </div>
                  <span className="mpc-role-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    {m.role === 'manager' ? <Shield size={12} /> : m.role === 'reviewer' ? <Eye size={12} /> : <CheckSquare size={12} />}
                    {cfg.label}
                  </span>
                </div>

                <div className="mpc-name">User #{m.userId}</div>
                <div className="mpc-email" style={{ color: m.status === 'active' ? '#10b981' : '#f59e0b' }}>
                  {m.status === 'active' ? '● Đang hoạt động' : '● Chờ xác nhận'}
                </div>

                {memberProjects.length > 0 && (
                  <div className="mpc-projects">
                    <span className="mpc-projects-label">Tham gia dự án:</span>
                    <div className="mpc-project-tags">
                      {memberProjects.map(p => (
                        <span key={p.id} className="mpc-project-tag">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mpc-footer">
                  <span className="mpc-tasks-total">{tasksCount} task được giao</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagerMembers;
