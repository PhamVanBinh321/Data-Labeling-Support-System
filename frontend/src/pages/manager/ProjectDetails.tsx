import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Settings, Upload, Download, Users, BarChart2,
  CheckCircle, Clock, Plus, FileText, UserPlus, Search,
  Mail, Shield, Star, X, Lock, Pencil, Trash2, Save
} from 'lucide-react';
import {
  MOCK_PROJECTS, MOCK_TASKS, MOCK_USERS,
  MOCK_PROJECT_MEMBERS
} from '../../data/mockData';
import type { Task, ProjectMember, MemberStatus, LabelDefinition } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import CreateTaskPanel from '../../components/manager/CreateTaskPanel';
import toast from 'react-hot-toast';
import './ProjectDetails.css';

type TabId = 'overview' | 'tasks' | 'members' | 'import' | 'export' | 'settings';

const STATUS_COLOR: Record<MemberStatus, string> = {
  active: '#10b981',
  pending: '#f59e0b',
  declined: '#ef4444',
};
const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Đang hoạt động',
  pending: 'Chờ xác nhận',
  declined: 'Đã từ chối',
};

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // ── Invite state ──
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteRole, setInviteRole] = useState<'annotator' | 'reviewer'>('annotator');
  const [invitedNow, setInvitedNow] = useState<string[]>([]);
  // ── Members local state ──
  const [localMembers, setLocalMembers] = useState<ProjectMember[]>(MOCK_PROJECT_MEMBERS);
  // ── Task creation state ──
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>(MOCK_TASKS);

  const project = MOCK_PROJECTS.find(p => p.id === projectId) || MOCK_PROJECTS[0];

  // ── Settings form state (initialised after project is resolved) ──
  const [settingsForm, setSettingsForm] = useState(() => ({
    name:        project?.name        ?? '',
    description: project?.description ?? '',
    guidelines:  project?.guidelines  ?? '',
    status:      (project?.status     ?? 'active') as 'active' | 'completed' | 'paused' | 'draft',
    labels:      project?.labels      ? [...project.labels] : [] as LabelDefinition[],
  }));
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);

  // local project override state so settings saves are reflected immediately
  const [localProject, setLocalProject] = useState(project);
  const tasks = localTasks.filter(t => t.projectId === project.id);
  const annotators = MOCK_USERS.filter(u => u.role === 'annotator');
  const reviewers = MOCK_USERS.filter(u => u.role === 'reviewer');
  const members = localMembers.filter(m => m.projectId === project.id);

  const annotationProgress = Math.round((project.annotatedImages / project.totalImages) * 100) || 0;
  const approvalProgress = Math.round((project.approvedImages / project.totalImages) * 100) || 0;

  // Users eligible to invite: ALL users (not Manager) that are NOT already members
  const memberUserIds = new Set(members.map(m => m.userId));
  const candidateUsers = MOCK_USERS.filter(u =>
    u.role !== 'manager' &&
    !memberUserIds.has(u.id) &&
    (u.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(inviteSearch.toLowerCase()))
  );

  const handleInvite = (userId: string) => {
    const newMember: ProjectMember = {
      id: `pm-new-${Date.now()}`,
      projectId: project.id,
      userId,
      role: inviteRole,
      status: 'pending',
      invitedAt: new Date().toISOString().split('T')[0],
    };
    setLocalMembers(prev => [...prev, newMember]);
    setInvitedNow(prev => [...prev, userId]);
  };

  const handleRemoveMember = (memberId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) {
      setLocalMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Đã xóa thành viên khỏi dự án.');
    }
  };

  // ─── Drag & Drop ───
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setImportFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImportFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  // ─── Task columns ───
  const taskColumns = [
    { key: 'name', title: 'Tên batch', render: (t: Task) => <strong>{t.name}</strong> },
    {
      key: 'annotator', title: 'Annotator',
      render: (t: Task) => {
        const u = MOCK_USERS.find(u => u.id === t.annotatorId);
        return u ? <div className="user-chip"><span className="avatar-sm">{u.avatar}</span>{u.name}</div> : '—';
      }
    },
    {
      key: 'progress', title: 'Tiến độ',
      render: (t: Task) => {
        const pct = t.totalImages > 0 ? Math.round((t.completedImages / t.totalImages) * 100) : 0;
        return (
          <div className="progress-cell">
            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
            <span>{pct}%</span>
          </div>
        );
      }
    },
    { key: 'deadline', title: 'Hạn chót' },
    { key: 'status', title: 'Trạng thái', render: (t: Task) => <StatusBadge status={t.status as StatusType} /> },
    {
      key: 'actions', title: '',
      render: (t: Task) => (
        <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setSelectedTask(t); setShowAssignModal(true); }}>
          <Users size={14} /> Phân công
        </button>
      )
    }
  ];

  return (
    <div className="project-details-page animate-fade-in">
      {/* Breadcrumb */}
      <div className="page-breadcrumb">
        <Link to="/manager/projects" className="breadcrumb-link"><ArrowLeft size={16} /> Dự án</Link>
        <span>/</span>
        <span className="breadcrumb-current">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="project-header-card">
        <div className="project-header-left">
          <div className="project-type-badge">{project.typeName}</div>
          <h1>{project.name}</h1>
          <p className="project-desc">{project.description}</p>
          <div className="project-meta-row">
            <span><Clock size={14} /> Cập nhật: {project.updatedAt}</span>
            <StatusBadge
              status={project.status === 'active' ? 'in-progress' : project.status === 'completed' ? 'completed' : project.status === 'paused' ? 'pending' : 'draft'}
              label={project.status === 'active' ? 'Đang hoạt động' : project.status === 'completed' ? 'Hoàn thành' : project.status === 'paused' ? 'Tạm dừng' : 'Bản nháp'}
            />
          </div>
        </div>
        <div className="project-header-actions">
          <button className="btn btn-secondary btn-icon-text"><Settings size={18} /> Cài đặt</button>
          <button className="btn btn-primary btn-icon-text" onClick={() => setActiveTab('tasks')}>
            <Plus size={18} /> Tạo Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { id: 'overview' as TabId, label: 'Tổng quan', icon: <BarChart2 size={16} /> },
          { id: 'tasks' as TabId, label: `Tasks (${tasks.length})`, icon: <FileText size={16} /> },
          { id: 'members' as TabId, label: `Thành viên (${members.length})`, icon: <Users size={16} /> },
          { id: 'import' as TabId, label: 'Import dữ liệu', icon: <Upload size={16} /> },
          { id: 'export' as TabId, label: 'Export', icon: <Download size={16} /> },
          { id: 'settings' as TabId, label: 'Cài đặt', icon: <Settings size={16} /> },
        ].map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Overview ─── */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="stats-row stats-4col">
            <div className="stat-card"><span className="stat-label">Tổng ảnh</span><h3 className="stat-value">{project.totalImages.toLocaleString()}</h3></div>
            <div className="stat-card"><span className="stat-label">Đã gán nhãn</span><h3 className="stat-value text-blue">{project.annotatedImages.toLocaleString()}</h3></div>
            <div className="stat-card"><span className="stat-label">Đã duyệt</span><h3 className="stat-value text-green">{project.approvedImages.toLocaleString()}</h3></div>
            <div className="stat-card"><span className="stat-label">Số Task</span><h3 className="stat-value">{tasks.length}</h3></div>
          </div>
          <div className="progress-cards">
            <div className="progress-card-item">
              <div className="pci-header"><span>Tiến độ Gán nhãn</span><strong className="text-blue">{annotationProgress}%</strong></div>
              <div className="pci-bar"><div className="pci-fill blue" style={{ width: `${annotationProgress}%` }} /></div>
              <span className="pci-sub">{project.annotatedImages.toLocaleString()} / {project.totalImages.toLocaleString()} ảnh</span>
            </div>
            <div className="progress-card-item">
              <div className="pci-header"><span>Tiến độ Phê duyệt</span><strong className="text-green">{approvalProgress}%</strong></div>
              <div className="pci-bar"><div className="pci-fill green" style={{ width: `${approvalProgress}%` }} /></div>
              <span className="pci-sub">{project.approvedImages.toLocaleString()} / {project.totalImages.toLocaleString()} ảnh</span>
            </div>
          </div>
          <div className="labels-overview">
            <h3>Bộ nhãn (Ontology)</h3>
            <div className="labels-grid">
              {project.labels.map(l => (
                <div key={l.id} className="label-card">
                  <div className="label-card-color" style={{ backgroundColor: l.color }} />
                  <span>{l.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="guidelines-preview">
            <h3><FileText size={16} /> Hướng dẫn gán nhãn</h3>
            <pre>{project.guidelines || 'Chưa có hướng dẫn.'}</pre>
          </div>
        </div>
      )}

      {/* ─── TAB: Tasks ─── */}
      {activeTab === 'tasks' && (
        <div className="tab-content">
          <div className="tab-header-row">
            <h3>Danh sách Tasks / Batches</h3>
            <button
              className="btn btn-primary btn-icon-text btn-sm"
              onClick={() => setShowCreateTask(true)}
            >
              <Plus size={16} /> Tạo Task mới
            </button>
          </div>
          <DataTable<Task> data={tasks} columns={taskColumns} keyExtractor={t => t.id} />
        </div>
      )}

      {/* ─── TAB: Members ─── */}
      {activeTab === 'members' && (
        <div className="tab-content members-tab">
          <div className="tab-header-row">
            <div>
              <h3>Quản lý Thành viên Dự án</h3>
              <p className="form-hint" style={{ margin: 0 }}>Mời Annotator và Reviewer tham gia dự án để có thể phân công task cho họ.</p>
            </div>
            <button className="btn btn-primary btn-icon-text" onClick={() => { setShowInviteModal(true); setInviteSearch(''); setInvitedNow([]); }}>
              <UserPlus size={18} /> Mời thành viên
            </button>
          </div>

          {/* Annotators group */}
          <div className="member-group">
            <div className="member-group-header">
              <Shield size={16} className="group-icon annotator-icon" />
              <h4>Annotators</h4>
              <span className="member-count-badge">{members.filter(m => m.role === 'annotator').length}</span>
            </div>
            <div className="member-cards-grid">
              {members.filter(m => m.role === 'annotator').length === 0 && (
                <div className="member-empty">Chưa có Annotator nào. Hãy mời thêm!</div>
              )}
              {members.filter(m => m.role === 'annotator').map(mem => {
                const user = MOCK_USERS.find(u => u.id === mem.userId);
                if (!user) return null;
                return (
                  <div key={mem.id} className="member-card">
                    <div className="member-avatar">{user.avatar}</div>
                    <div className="member-info">
                      <strong>{user.name}</strong>
                      <span className="member-email"><Mail size={12} />{user.email}</span>
                      {user.qualityScore && (
                        <span className="member-score"><Star size={12} />{user.qualityScore}% chất lượng</span>
                      )}
                    </div>
                    <div className="member-right">
                      <span className="member-status-dot" style={{ backgroundColor: STATUS_COLOR[mem.status] }}>
                        {STATUS_LABEL[mem.status]}
                      </span>
                      <button className="member-remove-btn" title="Xóa khỏi dự án" onClick={() => handleRemoveMember(mem.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviewers group */}
          <div className="member-group">
            <div className="member-group-header">
              <CheckCircle size={16} className="group-icon reviewer-icon" />
              <h4>Reviewers</h4>
              <span className="member-count-badge">{members.filter(m => m.role === 'reviewer').length}</span>
            </div>
            <div className="member-cards-grid">
              {members.filter(m => m.role === 'reviewer').length === 0 && (
                <div className="member-empty">Chưa có Reviewer nào. Hãy mời thêm!</div>
              )}
              {members.filter(m => m.role === 'reviewer').map(mem => {
                const user = MOCK_USERS.find(u => u.id === mem.userId);
                if (!user) return null;
                return (
                  <div key={mem.id} className="member-card">
                    <div className="member-avatar reviewer">{user.avatar}</div>
                    <div className="member-info">
                      <strong>{user.name}</strong>
                      <span className="member-email"><Mail size={12} />{user.email}</span>
                      {user.qualityScore && (
                        <span className="member-score"><Star size={12} />{user.qualityScore}% chất lượng</span>
                      )}
                    </div>
                    <div className="member-right">
                      <span className="member-status-dot" style={{ backgroundColor: STATUS_COLOR[mem.status] }}>
                        {STATUS_LABEL[mem.status]}
                      </span>
                      <button className="member-remove-btn" title="Xóa khỏi dự án" onClick={() => handleRemoveMember(mem.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Import ─── */}
      {activeTab === 'import' && (
        <div className="tab-content import-tab">
          <h3>Import Dữ liệu vào Dự án</h3>
          <div className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}>
            <Upload size={40} className="dz-icon" />
            <p className="dz-title">Kéo & thả ảnh hoặc video vào đây</p>
            <p className="dz-sub">Hỗ trợ: JPG, PNG, WEBP, MP4 · Tối đa 500MB/lần</p>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              Chọn file từ máy tính
              <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileInput} />
            </label>
          </div>
          {importFiles.length > 0 && (
            <div className="import-file-list">
              <h4>{importFiles.length} file đã chọn</h4>
              <ul>
                {importFiles.slice(0, 8).map((f, i) => (
                  <li key={i}><span className="file-name">{f.name}</span><span className="file-size">{(f.size / 1024).toFixed(1)} KB</span></li>
                ))}
                {importFiles.length > 8 && <li className="more-files">...và {importFiles.length - 8} file khác</li>}
              </ul>
              <button
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => {
                  toast.success(`☁️ Đã upload ${importFiles.length} file thành công vào dataset!`);
                  setImportFiles([]);
                }}
              >
                <Upload size={16} /> Upload {importFiles.length} file
              </button>
            </div>
          )}
          <div className="import-options">
            <h4>Hoặc kết nối từ Cloud Storage</h4>
            <div className="cloud-options">
              <button className="cloud-btn" onClick={() => toast('Kết nối AWS S3...',   { icon: '☁️' })}><span>☁️</span> AWS S3</button>
              <button className="cloud-btn" onClick={() => toast('Kết nối Azure Blob...', { icon: '🔵' })}><span>🔵</span> Azure Blob</button>
              <button className="cloud-btn" onClick={() => toast('Kết nối GCS...',       { icon: '🟡' })}><span>🟡</span> Google Cloud</button>
              <button className="cloud-btn disabled" disabled><span>🔄</span> NiFi (Sắp có)</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Export ─── */}
      {activeTab === 'export' && (
        <div className="tab-content export-tab">
          <h3>Export Dữ liệu đã hoàn thành</h3>
          <p className="form-hint">Chỉ những ảnh đã được Reviewer phê duyệt mới được xuất ra. Hiện có <strong>{project.approvedImages.toLocaleString()} ảnh</strong> sẵn sàng.</p>
          <div className="export-formats">
            {[
              { name: 'COCO JSON', ext: '.json', desc: 'Định dạng phổ biến nhất cho Object Detection & Segmentation', icon: '📦' },
              { name: 'YOLO TXT', ext: '.txt', desc: 'Dành cho YOLOv5/v8 – mỗi ảnh 1 file txt', icon: '🎯' },
              { name: 'Pascal VOC XML', ext: '.xml', desc: 'Định dạng XML cổ điển, tương thích nhiều framework', icon: '📄' },
              { name: 'Raw JSON', ext: '.json', desc: 'Dữ liệu thô từ hệ thống, không xử lý', icon: '{ }' },
            ].map(fmt => (
              <div key={fmt.name} className="export-card">
                <div className="export-icon">{fmt.icon}</div>
                <div className="export-info">
                  <strong>{fmt.name}</strong>
                  <span className="export-ext">{fmt.ext}</span>
                  <p>{fmt.desc}</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => toast.success(`📥 Xuất ${fmt.name} thành công! File đã được tải xuống.`)}><Download size={16} /> Tải xuống</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: Settings ─── */}
      {activeTab === 'settings' && (
        <div className="tab-content settings-tab">
          {/* ─ EDITABLE SECTION ─ */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Pencil size={16} className="ss-icon editable" />
              <h3>Thông tin cơ bản</h3>
              <span className="editable-badge">Có thể chỉnh sửa</span>
            </div>
            <div className="settings-form-grid">
              <div className="sf-group">
                <label>Tên dự án</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={e => { setSettingsForm(f => ({ ...f, name: e.target.value })); setSettingsDirty(true); }}
                  className="sf-input"
                />
              </div>
              <div className="sf-group">
                <label>Trạng thái</label>
                <select
                  value={settingsForm.status}
                  onChange={e => { setSettingsForm(f => ({ ...f, status: e.target.value as any })); setSettingsDirty(true); }}
                  className="sf-input"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="draft">Bản nháp</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="sf-group" style={{ marginTop: '1rem' }}>
              <label>Mô tả</label>
              <textarea
                rows={3}
                value={settingsForm.description}
                onChange={e => { setSettingsForm(f => ({ ...f, description: e.target.value })); setSettingsDirty(true); }}
                className="sf-input sf-textarea"
              />
            </div>
          </div>

          {/* ─ LABELS SECTION ─ */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Pencil size={16} className="ss-icon editable" />
              <h3>Bộ nhãn (Ontology)</h3>
              <span className="editable-badge">Có thể chỉnh sửa</span>
            </div>
            <div className="labels-edit-list">
              {settingsForm.labels.map(lbl => (
                <div key={lbl.id} className={`lel-row ${editingLabelId === lbl.id ? 'editing' : ''}`}>
                  {editingLabelId === lbl.id ? (
                    <>
                      <input type="color" value={lbl.color}
                        onChange={e => setSettingsForm(f => ({
                          ...f,
                          labels: f.labels.map(l => l.id === lbl.id ? { ...l, color: e.target.value } : l)
                        }))}
                        className="lel-color-input"
                      />
                      <input type="text" value={lbl.name}
                        onChange={e => setSettingsForm(f => ({
                          ...f,
                          labels: f.labels.map(l => l.id === lbl.id ? { ...l, name: e.target.value } : l)
                        }))}
                        className="lel-name-input sf-input"
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => { setEditingLabelId(null); setSettingsDirty(true); }}>OK</button>
                    </>
                  ) : (
                    <>
                      <span className="lel-dot" style={{ background: lbl.color }} />
                      <span className="lel-name">{lbl.name}</span>
                      <div className="lel-actions">
                        <button className="lel-btn" title="Sửa" onClick={() => setEditingLabelId(lbl.id)}><Pencil size={14} /></button>
                        <button className="lel-btn danger" title="Xóa" onClick={() => {
                          setSettingsForm(f => ({ ...f, labels: f.labels.filter(l => l.id !== lbl.id) }));
                          setSettingsDirty(true);
                        }}><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button className="btn btn-secondary btn-sm btn-icon-text" onClick={() => {
                const newLbl: LabelDefinition = { id: `lbl-${Date.now()}`, name: 'Nhãn mới', color: '#6366f1' };
                setSettingsForm(f => ({ ...f, labels: [...f.labels, newLbl] }));
                setEditingLabelId(newLbl.id);
                setSettingsDirty(true);
              }}>
                <Plus size={15} /> Thêm nhãn
              </button>
            </div>
          </div>

          {/* ─ GUIDELINES SECTION ─ */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Pencil size={16} className="ss-icon editable" />
              <h3>Hướng dẫn gán nhãn</h3>
              <span className="editable-badge">Có thể chỉnh sửa</span>
            </div>
            <textarea
              rows={8}
              value={settingsForm.guidelines}
              onChange={e => { setSettingsForm(f => ({ ...f, guidelines: e.target.value })); setSettingsDirty(true); }}
              className="sf-input sf-textarea"
              placeholder="Nhập hướng dẫn cho annotator..."
            />
          </div>

          {/* ─ LOCKED SECTION ─ */}
          <div className="settings-section locked-section">
            <div className="settings-section-header">
              <Lock size={16} className="ss-icon locked" />
              <h3>Thông tin cố định (Không thể thay đổi)</h3>
            </div>
            <div className="locked-fields-grid">
              <div className="locked-field">
                <Lock size={13} />
                <div>
                  <strong>Loại nhiệm vụ (Task Type)</strong>
                  <p>{localProject.typeName}</p>
                  <span className="locked-reason">Thay đổi loại task sẽ làm mất toàn bộ dữ liệu annotation hiện có.</span>
                </div>
              </div>
              <div className="locked-field">
                <Lock size={13} />
                <div>
                  <strong>Dataset</strong>
                  <p>Quản lý qua tab Import</p>
                  <span className="locked-reason">Dữ liệu đã upload được quản lý riêng qua tab Import Data.</span>
                </div>
              </div>
              <div className="locked-field">
                <Lock size={13} />
                <div>
                  <strong>Project ID</strong>
                  <p className="mono">{localProject.id}</p>
                  <span className="locked-reason">ID được tạo tự động và là khóa chính trong hệ thống.</span>
                </div>
              </div>
              <div className="locked-field">
                <Lock size={13} />
                <div>
                  <strong>Ngày tạo</strong>
                  <p>{localProject.createdAt}</p>
                  <span className="locked-reason">Thông tin lịch sử không thể sửa.</span>
                </div>
              </div>
              <div className="locked-field">
                <Lock size={13} />
                <div>
                  <strong>Thành viên & Phân công</strong>
                  <p>Quản lý qua tab Thành viên</p>
                  <span className="locked-reason">Việc thêm/xóa thành viên và phân công được quản lý tại tab riêng.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="settings-save-row">
            <button
              className={`btn ${settingsDirty ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!settingsDirty}
              onClick={() => {
                setLocalProject(p => ({ ...p, ...settingsForm, labels: settingsForm.labels }));
                setSettingsDirty(false);
                toast.success('✅ Đã lưu cài đặt dự án thành công!');
              }}
            >
              <Save size={16} /> Lưu thay đổi
            </button>
            {settingsDirty && <span className="unsaved-hint">⚠️ Bạn có thay đổi chưa được lưu.</span>}
          </div>
        </div>
      )}

      {/* ─── Assign Modal ─── */}
      {showAssignModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="assign-modal" onClick={e => e.stopPropagation()}>
            <h2>Phân công Task</h2>
            <p className="modal-sub">{selectedTask.name}</p>
            <div className="form-group">
              <label>Chọn Annotator</label>
              <select className="select-filter" defaultValue={selectedTask.annotatorId}>
                {annotators.map(a => <option key={a.id} value={a.id}>{a.name} (Score: {a.qualityScore}%)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Chọn Reviewer</label>
              <select className="select-filter" defaultValue={selectedTask.reviewerId}>
                {reviewers.map(r => <option key={r.id} value={r.id}>{r.name} (Score: {r.qualityScore}%)</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Hạn chót</label>
              <input type="date" defaultValue={selectedTask.deadline} className="select-filter" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => { toast.success('✅ Đã lưu phân công thành công!'); setShowAssignModal(false); }}>
                <CheckCircle size={16} /> Lưu phân công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invite Member Modal ─── */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={e => e.stopPropagation()}>
            <div className="invite-modal-header">
              <div>
                <h2>Mời thành viên vào dự án</h2>
                <p className="modal-sub">{project.name}</p>
              </div>
              <button className="btn-icon-danger" onClick={() => setShowInviteModal(false)}><X size={20} /></button>
            </div>

            {/* Role selector */}
            <div className="invite-role-selector">
              <button
                className={`role-tab ${inviteRole === 'annotator' ? 'active' : ''}`}
                onClick={() => setInviteRole('annotator')}
              >
                <Shield size={16} /> Mời Annotator
              </button>
              <button
                className={`role-tab ${inviteRole === 'reviewer' ? 'active' : ''}`}
                onClick={() => setInviteRole('reviewer')}
              >
                <CheckCircle size={16} /> Mời Reviewer
              </button>
            </div>

            {/* Search */}
            <div className="invite-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Candidate list */}
            <div className="candidate-list">
              {candidateUsers.length === 0 ? (
                <div className="candidate-empty">
                  {inviteSearch ? 'Không tìm thấy người dùng phù hợp.' : 'Tất cả người dùng đã là thành viên của dự án.'}
                </div>
              ) : (
                candidateUsers.map(u => {
                  const alreadyInvited = invitedNow.includes(u.id);
                  return (
                    <div key={u.id} className={`candidate-item ${alreadyInvited ? 'invited' : ''}`}>
                      <div className="candidate-avatar">{u.avatar}</div>
                      <div className="candidate-info">
                        <strong>{u.name}</strong>
                        <span><Mail size={12} />{u.email}</span>
                        {u.qualityScore && <span><Star size={12} />{u.qualityScore}% • {u.tasksCompleted} tasks</span>}
                      </div>
                      <button
                        className={`btn btn-sm ${alreadyInvited ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => !alreadyInvited && handleInvite(u.id)}
                        disabled={alreadyInvited}
                      >
                        {alreadyInvited ? (<><CheckCircle size={14} /> Đã mời</>) : (<><UserPlus size={14} /> Mời</>)}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Đóng</button>
              {invitedNow.length > 0 && (
                <span className="invite-summary">✅ Đã gửi lời mời đến {invitedNow.length} người</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Task Panel ─── */}
      {showCreateTask && (
        <CreateTaskPanel
          project={project}
          existingTasks={tasks}
          onClose={() => setShowCreateTask(false)}
          onSubmit={(newTask) => setLocalTasks(prev => [...prev, newTask])}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
