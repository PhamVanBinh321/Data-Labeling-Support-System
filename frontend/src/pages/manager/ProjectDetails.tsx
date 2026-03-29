import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Settings, Upload, Download, Users, BarChart2,
  CheckCircle, Clock, Plus, FileText, UserPlus, Search,
  Mail, Shield, X, Lock, Pencil, Trash2, Save
} from 'lucide-react';
import { MOCK_PROJECTS } from '../../data/mockData';
import type { Task, MemberStatus, LabelDefinition } from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import CreateTaskPanel from '../../components/manager/CreateTaskPanel';
import toast from 'react-hot-toast';
import './ProjectDetails.css';
import { useData } from '../../context/DataContext';
import { projectsApi } from '../../api/projects';
import { tasksApi } from '../../api/tasks';
import { annotationsApi } from '../../api/annotations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiMember {
  id: number;
  user_id: number;
  role: string;
  status: MemberStatus;
  invited_at?: string;
}

type TabId = 'overview' | 'tasks' | 'members' | 'import' | 'export' | 'settings';

const STATUS_COLOR: Record<MemberStatus, string> = {
  active:   '#10b981',
  pending:  '#f59e0b',
  declined: '#ef4444',
};
const STATUS_LABEL: Record<MemberStatus, string> = {
  active:   'Đang hoạt động',
  pending:  'Chờ xác nhận',
  declined: 'Đã từ chối',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks: allTasks, getProjectById, refreshTasks, refreshProjects } = useData();

  // Project: từ DataContext, fallback MOCK
  const dataProject = getProjectById(projectId ?? '');
  const project = dataProject ?? MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0];

  // Tasks: từ DataContext filtered by project
  const tasks = allTasks.filter(t => t.projectId === project.id);

  // ── Tab & UI state ──
  const [activeTab, setActiveTab]       = useState<TabId>('overview');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // ── Members (API) ──
  const [apiMembers, setApiMembers]         = useState<ApiMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const fetchMembers = async () => {
    try {
      const data = await projectsApi.listMembers(Number(project.id));
      setApiMembers(Array.isArray(data) ? data : []);
    } catch {
      setApiMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [project.id]);   // eslint-disable-line

  // ── Invite state ──
  const [inviteUserId,  setInviteUserId]  = useState('');
  const [inviteRole,    setInviteRole]    = useState<'annotator' | 'reviewer'>('annotator');
  const [inviting,      setInviting]      = useState(false);

  // ── Assign modal controlled state ──
  const [assignAnnotatorId, setAssignAnnotatorId] = useState('');
  const [assignReviewerId,  setAssignReviewerId]  = useState('');
  const [assignDeadline,    setAssignDeadline]    = useState('');
  const [assigning,         setAssigning]         = useState(false);

  // ── Import state ──
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [isDragging,  setIsDragging]  = useState(false);
  const [uploading,   setUploading]   = useState(false);

  // ── Export state ──
  const [exportTaskId, setExportTaskId] = useState('');
  const [exporting,    setExporting]    = useState(false);

  // ── Settings ──
  const [settingsForm, setSettingsForm] = useState(() => ({
    name:        project?.name        ?? '',
    description: project?.description ?? '',
    guidelines:  project?.guidelines  ?? '',
    status:      (project?.status ?? 'active') as 'active' | 'completed' | 'paused' | 'draft',
    labels:      project?.labels ? [...project.labels] : [] as LabelDefinition[],
  }));
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [settingsDirty,  setSettingsDirty]  = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ─── Computed ────────────────────────────────────────────────────────────────

  const annotationProgress = Math.round((project.annotatedImages / project.totalImages) * 100) || 0;
  const approvalProgress   = Math.round((project.approvedImages  / project.totalImages) * 100) || 0;

  const memberAnnotators = apiMembers.filter(m => m.role === 'annotator');
  const memberReviewers  = apiMembers.filter(m => m.role === 'reviewer');

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    const userId = Number(inviteUserId);
    if (!userId || isNaN(userId)) { toast.error('User ID không hợp lệ.'); return; }
    setInviting(true);
    try {
      await projectsApi.inviteMember(Number(project.id), { user_id: userId, role: inviteRole });
      toast.success('Đã gửi lời mời thành công!');
      await fetchMembers();
      setInviteUserId('');
    } catch {
      toast.error('Mời thành viên thất bại. Kiểm tra lại User ID.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) return;
    try {
      await projectsApi.removeMember(Number(project.id), memberId);
      toast.success('Đã xóa thành viên khỏi dự án.');
      await fetchMembers();
    } catch {
      toast.error('Xóa thành viên thất bại.');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await projectsApi.update(Number(project.id), {
        name:        settingsForm.name,
        description: settingsForm.description,
        guidelines:  settingsForm.guidelines,
      });
      if (settingsForm.status !== project.status) {
        await projectsApi.updateStatus(Number(project.id), settingsForm.status);
      }
      await refreshProjects();
      setSettingsDirty(false);
      toast.success('Đã lưu cài đặt dự án thành công!');
    } catch {
      toast.error('Lưu cài đặt thất bại.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    let success = 0, failed = 0;
    for (const file of importFiles) {
      const fd = new FormData();
      fd.append('project_id', project.id);
      fd.append('file', file);
      try {
        await annotationsApi.uploadImage(fd);
        success++;
      } catch { failed++; }
    }
    setUploading(false);
    setImportFiles([]);
    if (failed === 0) toast.success(`Upload ${success} ảnh vào project thành công!`);
    else toast(`Upload xong: ${success} thành công, ${failed} thất bại.`, { icon: '⚠️' });
  };

  const handleExport = async (format: 'coco' | 'yolo' | 'csv') => {
    if (!exportTaskId) { toast.error('Vui lòng chọn Task để export.'); return; }
    setExporting(true);
    try {
      const response = await annotationsApi.exportTask(Number(exportTaskId), format);
      const ext  = format === 'coco' ? 'json' : format === 'yolo' ? 'zip' : 'csv';
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `task_${exportTaskId}_${format}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} thành công!`);
    } catch {
      toast.error('Export thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveAssign = async () => {
    if (!selectedTask) return;
    setAssigning(true);
    try {
      await tasksApi.update(Number(selectedTask.id), {
        ...(assignAnnotatorId ? { annotator_id: Number(assignAnnotatorId) } : {}),
        ...(assignReviewerId  ? { reviewer_id:  Number(assignReviewerId)  } : {}),
        ...(assignDeadline    ? { deadline:      assignDeadline            } : {}),
      });
      await refreshTasks();
      toast.success('Đã lưu phân công thành công!');
      setShowAssignModal(false);
    } catch {
      toast.error('Lưu phân công thất bại.');
    } finally {
      setAssigning(false);
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    setImportFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImportFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  // ─── Task table columns ───────────────────────────────────────────────────────

  const taskColumns = [
    { key: 'name',     title: 'Tên batch',   render: (t: Task) => <strong>{t.name}</strong> },
    { key: 'annotator', title: 'Annotator',  render: (t: Task) => <span>User #{t.annotatorId}</span> },
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
    { key: 'status',   title: 'Trạng thái', render: (t: Task) => <StatusBadge status={t.status as StatusType} /> },
    {
      key: 'actions', title: '',
      render: (t: Task) => (
        <button className="btn btn-sm btn-secondary" onClick={e => {
          e.stopPropagation();
          setSelectedTask(t);
          setAssignAnnotatorId(t.annotatorId ?? '');
          setAssignReviewerId(t.reviewerId ?? '');
          setAssignDeadline(t.deadline ?? '');
          setShowAssignModal(true);
        }}>
          <Users size={14} /> Phân công
        </button>
      )
    }
  ];

  // ─── JSX ─────────────────────────────────────────────────────────────────────

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
          <button className="btn btn-secondary btn-icon-text" onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Cài đặt
          </button>
          <button className="btn btn-primary btn-icon-text" onClick={() => setActiveTab('tasks')}>
            <Plus size={18} /> Tạo Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {([
          { id: 'overview'  as TabId, label: 'Tổng quan',               icon: <BarChart2 size={16} /> },
          { id: 'tasks'     as TabId, label: `Tasks (${tasks.length})`,  icon: <FileText  size={16} /> },
          { id: 'members'   as TabId, label: `Thành viên (${apiMembers.length})`, icon: <Users size={16} /> },
          { id: 'import'    as TabId, label: 'Import dữ liệu',           icon: <Upload    size={16} /> },
          { id: 'export'    as TabId, label: 'Export',                   icon: <Download  size={16} /> },
          { id: 'settings'  as TabId, label: 'Cài đặt',                  icon: <Settings  size={16} /> },
        ] as const).map(tab => (
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
            <button className="btn btn-primary btn-icon-text btn-sm" onClick={() => setShowCreateTask(true)}>
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
            <button className="btn btn-primary btn-icon-text" onClick={() => { setShowInviteModal(true); setInviteUserId(''); }}>
              <UserPlus size={18} /> Mời thành viên
            </button>
          </div>

          {loadingMembers ? (
            <div className="form-hint">Đang tải danh sách thành viên...</div>
          ) : (
            <>
              {/* Annotators */}
              <div className="member-group">
                <div className="member-group-header">
                  <Shield size={16} className="group-icon annotator-icon" />
                  <h4>Annotators</h4>
                  <span className="member-count-badge">{memberAnnotators.length}</span>
                </div>
                <div className="member-cards-grid">
                  {memberAnnotators.length === 0 && <div className="member-empty">Chưa có Annotator nào. Hãy mời thêm!</div>}
                  {memberAnnotators.map(mem => (
                    <div key={mem.id} className="member-card">
                      <div className="member-avatar">👤</div>
                      <div className="member-info">
                        <strong>User #{mem.user_id}</strong>
                        <span className="member-email"><Mail size={12} />ID: {mem.user_id}</span>
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
                  ))}
                </div>
              </div>

              {/* Reviewers */}
              <div className="member-group">
                <div className="member-group-header">
                  <CheckCircle size={16} className="group-icon reviewer-icon" />
                  <h4>Reviewers</h4>
                  <span className="member-count-badge">{memberReviewers.length}</span>
                </div>
                <div className="member-cards-grid">
                  {memberReviewers.length === 0 && <div className="member-empty">Chưa có Reviewer nào. Hãy mời thêm!</div>}
                  {memberReviewers.map(mem => (
                    <div key={mem.id} className="member-card">
                      <div className="member-avatar reviewer">👤</div>
                      <div className="member-info">
                        <strong>User #{mem.user_id}</strong>
                        <span className="member-email"><Mail size={12} />ID: {mem.user_id}</span>
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
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: Import ─── */}
      {activeTab === 'import' && (
        <div className="tab-content import-tab">
          <h3>Import Dữ liệu vào Dự án</h3>
          <p className="form-hint">Ảnh upload sẽ vào <strong>project pool</strong>. Sau đó tạo Task và chọn số lượng ảnh để gán từ pool vào task.</p>

          <div className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}>
            <Upload size={40} className="dz-icon" />
            <p className="dz-title">Kéo & thả ảnh vào đây</p>
            <p className="dz-sub">Hỗ trợ: JPG, PNG, WEBP · Tối đa 500MB/lần</p>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              Chọn file từ máy tính
              <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
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
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleUpload} disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Đang upload...' : `Upload ${importFiles.length} file`}
              </button>
            </div>
          )}

          <div className="import-options">
            <h4>Hoặc kết nối từ Cloud Storage</h4>
            <div className="cloud-options">
              <button className="cloud-btn disabled" disabled><span>☁️</span> AWS S3 (Sắp có)</button>
              <button className="cloud-btn disabled" disabled><span>🔵</span> Azure Blob (Sắp có)</button>
              <button className="cloud-btn disabled" disabled><span>🟡</span> Google Cloud (Sắp có)</button>
              <button className="cloud-btn disabled" disabled><span>🔄</span> NiFi (Sắp có)</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Export ─── */}
      {activeTab === 'export' && (
        <div className="tab-content export-tab">
          <h3>Export Dữ liệu đã hoàn thành</h3>
          <p className="form-hint">Chỉ những ảnh đã được Reviewer phê duyệt mới được xuất ra.</p>

          {/* Task selector */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600 }}>Chọn Task để export <span className="required">*</span></label>
            <select className="select-filter" value={exportTaskId} onChange={e => setExportTaskId(e.target.value)}>
              <option value="">-- Chọn Task --</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
            </select>
          </div>

          <div className="export-formats">
            {([
              { name: 'COCO JSON',     fmt: 'coco' as const, ext: '.json', desc: 'Định dạng phổ biến nhất cho Object Detection & Segmentation', icon: '📦' },
              { name: 'YOLO TXT',      fmt: 'yolo' as const, ext: '.zip',  desc: 'Dành cho YOLOv5/v8 – mỗi ảnh 1 file txt', icon: '🎯' },
              { name: 'CSV Raw',       fmt: 'csv'  as const, ext: '.csv',  desc: 'Dữ liệu thô từ hệ thống dạng CSV', icon: '{ }' },
            ]).map(fmt => (
              <div key={fmt.name} className="export-card">
                <div className="export-icon">{fmt.icon}</div>
                <div className="export-info">
                  <strong>{fmt.name}</strong>
                  <span className="export-ext">{fmt.ext}</span>
                  <p>{fmt.desc}</p>
                </div>
                <button className="btn btn-primary btn-sm" disabled={exporting || !exportTaskId}
                  onClick={() => handleExport(fmt.fmt)}>
                  <Download size={16} /> {exporting ? 'Đang xuất...' : 'Tải xuống'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: Settings ─── */}
      {activeTab === 'settings' && (
        <div className="tab-content settings-tab">
          <div className="settings-section">
            <div className="settings-section-header">
              <Pencil size={16} className="ss-icon editable" />
              <h3>Thông tin cơ bản</h3>
              <span className="editable-badge">Có thể chỉnh sửa</span>
            </div>
            <div className="settings-form-grid">
              <div className="sf-group">
                <label>Tên dự án</label>
                <input type="text" value={settingsForm.name}
                  onChange={e => { setSettingsForm(f => ({ ...f, name: e.target.value })); setSettingsDirty(true); }}
                  className="sf-input" />
              </div>
              <div className="sf-group">
                <label>Trạng thái</label>
                <select value={settingsForm.status}
                  onChange={e => { setSettingsForm(f => ({ ...f, status: e.target.value as any })); setSettingsDirty(true); }}
                  className="sf-input">
                  <option value="active">Đang hoạt động</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="draft">Bản nháp</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="sf-group" style={{ marginTop: '1rem' }}>
              <label>Mô tả</label>
              <textarea rows={3} value={settingsForm.description}
                onChange={e => { setSettingsForm(f => ({ ...f, description: e.target.value })); setSettingsDirty(true); }}
                className="sf-input sf-textarea" />
            </div>
          </div>

          {/* Labels */}
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
                        onChange={e => setSettingsForm(f => ({ ...f, labels: f.labels.map(l => l.id === lbl.id ? { ...l, color: e.target.value } : l) }))}
                        className="lel-color-input" />
                      <input type="text" value={lbl.name}
                        onChange={e => setSettingsForm(f => ({ ...f, labels: f.labels.map(l => l.id === lbl.id ? { ...l, name: e.target.value } : l) }))}
                        className="lel-name-input sf-input" />
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

          {/* Guidelines */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Pencil size={16} className="ss-icon editable" />
              <h3>Hướng dẫn gán nhãn</h3>
            </div>
            <textarea rows={8} value={settingsForm.guidelines}
              onChange={e => { setSettingsForm(f => ({ ...f, guidelines: e.target.value })); setSettingsDirty(true); }}
              className="sf-input sf-textarea" placeholder="Nhập hướng dẫn cho annotator..." />
          </div>

          {/* Locked fields */}
          <div className="settings-section locked-section">
            <div className="settings-section-header">
              <Lock size={16} className="ss-icon locked" />
              <h3>Thông tin cố định (Không thể thay đổi)</h3>
            </div>
            <div className="locked-fields-grid">
              <div className="locked-field"><Lock size={13} /><div><strong>Loại nhiệm vụ</strong><p>{project.typeName}</p></div></div>
              <div className="locked-field"><Lock size={13} /><div><strong>Project ID</strong><p className="mono">{project.id}</p></div></div>
              <div className="locked-field"><Lock size={13} /><div><strong>Ngày tạo</strong><p>{project.createdAt}</p></div></div>
            </div>
          </div>

          <div className="settings-save-row">
            <button className={`btn ${settingsDirty ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!settingsDirty || savingSettings}
              onClick={handleSaveSettings}>
              <Save size={16} /> {savingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            {settingsDirty && <span className="unsaved-hint">Bạn có thay đổi chưa được lưu.</span>}
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
              <label>Annotator ID</label>
              <input type="number" className="select-filter" value={assignAnnotatorId}
                onChange={e => setAssignAnnotatorId(e.target.value)}
                placeholder="User ID của Annotator" />
            </div>
            <div className="form-group">
              <label>Reviewer ID</label>
              <input type="number" className="select-filter" value={assignReviewerId}
                onChange={e => setAssignReviewerId(e.target.value)}
                placeholder="User ID của Reviewer" />
            </div>
            <div className="form-group">
              <label>Hạn chót</label>
              <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} className="select-filter" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveAssign} disabled={assigning}>
                <CheckCircle size={16} /> {assigning ? 'Đang lưu...' : 'Lưu phân công'}
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

            <div className="invite-role-selector">
              <button className={`role-tab ${inviteRole === 'annotator' ? 'active' : ''}`} onClick={() => setInviteRole('annotator')}>
                <Shield size={16} /> Mời Annotator
              </button>
              <button className={`role-tab ${inviteRole === 'reviewer' ? 'active' : ''}`} onClick={() => setInviteRole('reviewer')}>
                <CheckCircle size={16} /> Mời Reviewer
              </button>
            </div>

            <div className="invite-search-box">
              <Search size={16} />
              <input
                type="number"
                placeholder="Nhập User ID của người dùng..."
                value={inviteUserId}
                onChange={e => setInviteUserId(e.target.value)}
                autoFocus
              />
            </div>

            <p className="form-hint" style={{ padding: '0 1.5rem' }}>
              Nhập User ID (số) của người dùng muốn mời. Người dùng có thể tìm ID của mình trong trang hồ sơ.
            </p>

            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Đóng</button>
              <button className="btn btn-primary btn-icon-text" onClick={handleInvite} disabled={!inviteUserId || inviting}>
                <UserPlus size={16} /> {inviting ? 'Đang mời...' : 'Gửi lời mời'}
              </button>
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
          onSubmit={async () => { await refreshTasks(); setShowCreateTask(false); }}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
