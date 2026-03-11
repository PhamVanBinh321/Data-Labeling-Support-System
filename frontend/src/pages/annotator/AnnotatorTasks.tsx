import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Clock, AlertTriangle, CheckCircle,
  XCircle, Eye, ChevronRight, ClipboardList
} from 'lucide-react';
import { MOCK_USERS } from '../../data/mockData';
import type { Task } from '../../data/mockData';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import TaskDetailPanel from '../../components/annotator/TaskDetailPanel';
import './AnnotatorTasks.css';

// ── Logged-in annotator (always usr-002 for now) ──
const ME = MOCK_USERS.find(u => u.id === 'usr-002')!;

type FilterTab = 'all' | 'todo' | 'in-review' | 'done' | 'rejected';

const TAB_LABELS: Record<FilterTab, string> = {
  all:       'Tất cả',
  todo:      'Cần làm',
  'in-review': 'Đang duyệt',
  done:      'Xong',
  rejected:  'Bị trả về',
};

const FILTER_FN: Record<FilterTab, (t: Task) => boolean> = {
  all:       () => true,
  todo:      t => t.status === 'pending' || t.status === 'in-progress',
  'in-review': t => t.status === 'in-review',
  done:      t => t.status === 'approved' || t.status === 'completed',
  rejected:  t => t.status === 'rejected',
};

const PRIORITY_ICON = {
  High:   <AlertTriangle size={14} className="priority-icon high" />,
  Medium: <Clock size={14} className="priority-icon medium" />,
  Low:    null,
};

const AnnotatorTasks: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, projects } = useData();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // All tasks assigned to current annotator
  const myTasks = useMemo(
    () => tasks.filter(t => t.annotatorId === ME.id),
    [tasks]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return myTasks
      .filter(FILTER_FN[activeTab])
      .filter(t => {
        const proj = projects.find(p => p.id === t.projectId);
        return (
          t.name.toLowerCase().includes(q) ||
          (proj?.name ?? '').toLowerCase().includes(q)
        );
      });
  }, [myTasks, activeTab, search, projects]);

  // Dynamic stats
  const stats = useMemo(() => ({
    todo:     myTasks.filter(FILTER_FN.todo).length,
    rejected: myTasks.filter(FILTER_FN.rejected).length,
    done:     myTasks.filter(FILTER_FN.done).length,
    inReview: myTasks.filter(FILTER_FN['in-review']).length,
  }), [myTasks]);

  const handleAction = (task: Task) => {
    // Row click → open detail drawer
    setSelectedTask(task);
  };

  const handleOpenWorkspace = (task: Task) => {
    const actionable = ['pending', 'in-progress', 'rejected'].includes(task.status);
    if (actionable) navigate(`/workspace/${task.id}`);
  };

  const tabCount = (tab: FilterTab) => {
    const n = myTasks.filter(FILTER_FN[tab]).length;
    return n > 0 ? <span className="tab-count">{n}</span> : null;
  };

  const columns = [
    {
      key: 'name',
      title: 'Task',
      render: (t: Task) => {
        const proj = projects.find(p => p.id === t.projectId);
        return (
          <div className="task-name-cell">
            <strong>{t.name}</strong>
            {t.status === 'rejected' && t.rejectReason && (
              <span className="rejected-hint">
                <XCircle size={12} /> Có phản hồi từ Reviewer
              </span>
            )}
            <span className="at-project-name">{proj?.name ?? '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      title: 'Loại',
      render: (t: Task) => {
        const proj = projects.find(p => p.id === t.projectId);
        return <span className="type-badge">{proj?.typeName ?? '—'}</span>;
      },
    },
    {
      key: 'progress',
      title: 'Tiến độ',
      render: (t: Task) => {
        const pct = t.totalImages > 0 ? Math.round((t.completedImages / t.totalImages) * 100) : 0;
        return (
          <div className="task-progress-cell">
            <div className="progress-numbers">
              <span>{t.completedImages}/{t.totalImages} ảnh</span>
              <span className="progress-percent">{pct}%</span>
            </div>
            <div className="progress-bar-bg-sm">
              <div
                className="progress-bar-fill-sm"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#f97316' }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'deadline',
      title: 'Hạn chót',
      render: (t: Task) => (
        <div className="deadline-cell">
          {PRIORITY_ICON[t.priority]}
          <span className={t.priority === 'High' ? 'text-red font-medium' : ''}>{t.deadline}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (t: Task) => <StatusBadge status={t.status as StatusType} />,
    },
    {
      key: 'action',
      title: '',
      render: (t: Task) => {
        const actionable = ['pending', 'in-progress', 'rejected'].includes(t.status);
        const label =
          t.status === 'rejected'   ? 'Làm lại' :
          t.status === 'in-progress' ? 'Tiếp tục' :
          t.status === 'pending'    ? 'Bắt đầu' :
          'Xem';
        const icon = actionable ? <ChevronRight size={15} /> : <Eye size={15} />;
        return (
          <button
            className={`btn btn-sm btn-icon-text ${actionable ? 'btn-primary' : 'btn-ghost'}`}
            onClick={(e) => { e.stopPropagation(); handleOpenWorkspace(t); }}
            disabled={t.status === 'in-review' || t.status === 'approved' || t.status === 'completed'}
          >
            {label} {icon}
          </button>
        );
      },
    },
  ];

  return (
    <div className="annotator-tasks-page animate-fade-in">

      {/* Page title */}
      <div className="at-page-header">
        <div>
          <h1><ClipboardList size={22} /> Danh sách Task của tôi</h1>
          <p className="page-subtitle">Xin chào, <strong>{ME.name}</strong>! Dưới đây là các task được giao cho bạn.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Cần làm</span>
          <h3 className="stat-value text-orange">{stats.todo}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đang duyệt</span>
          <h3 className="stat-value" style={{ color: '#6366f1' }}>{stats.inReview}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bị trả về</span>
          <h3 className="stat-value text-red">{stats.rejected}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã xong</span>
          <h3 className="stat-value text-green">{stats.done}</h3>
        </div>
      </div>

      {/* Rejected banner */}
      {stats.rejected > 0 && (
        <div className="rejected-banner">
          <XCircle size={18} />
          <div>
            <strong>Bạn có {stats.rejected} task bị Reviewer từ chối!</strong>
            <span> Vui lòng xem phản hồi và làm lại để đảm bảo chất lượng.</span>
          </div>
          <button className="btn btn-sm btn-outline-red" onClick={() => setActiveTab('rejected')}>
            Xem ngay
          </button>
        </div>
      )}

      {/* Search + Filter tabs */}
      <div className="at-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm task hoặc tên dự án..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="at-filter-tabs">
          {(Object.keys(TAB_LABELS) as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`at-tab ${activeTab === tab ? 'active' : ''} ${tab === 'rejected' && stats.rejected > 0 ? 'has-alert' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]} {tabCount(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="at-empty">
          <CheckCircle size={48} className="at-empty-icon" />
          <p>Không có task nào phù hợp.</p>
        </div>
      ) : (
        <DataTable<Task>
          data={filtered}
          columns={columns}
          keyExtractor={t => t.id}
          onRowClick={handleAction}
          pageSize={8}
        />
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default AnnotatorTasks;
