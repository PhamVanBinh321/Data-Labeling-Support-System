import React, { useState } from 'react';
import { X, ChevronRight, AlertTriangle, Users, Calendar, Tag, Image } from 'lucide-react';
import type { Project, Task, ProjectMember } from '../../data/mockData';
import { MOCK_USERS, MOCK_PROJECT_MEMBERS } from '../../data/mockData';
import toast from 'react-hot-toast';
import './CreateTaskPanel.css';

interface CreateTaskPanelProps {
  project: Project;
  existingTasks: Task[];
  onClose: () => void;
  onSubmit: (newTask: Task) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'High', label: '🔴 Cao', color: '#ef4444' },
  { value: 'Medium', label: '🟡 Trung bình', color: '#f59e0b' },
  { value: 'Low', label: '🟢 Thấp', color: '#10b981' },
];

const CreateTaskPanel: React.FC<CreateTaskPanelProps> = ({ project, existingTasks, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    imageFrom: 1,
    imageTo: 100,
    annotatorId: '',
    reviewerId: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Only show project members in the assignment dropdowns
  const projectMembers: ProjectMember[] = (MOCK_PROJECT_MEMBERS as ProjectMember[]).filter(
    m => m.projectId === project.id && m.status === 'active'
  );
  const memberAnnotators = MOCK_USERS.filter(u =>
    projectMembers.some(pm => pm.userId === u.id && pm.role === 'annotator')
  );
  const memberReviewers = MOCK_USERS.filter(u =>
    projectMembers.some(pm => pm.userId === u.id && pm.role === 'reviewer')
  );

  // Calculate total images already assigned in tasks
  const imagesUsed = existingTasks.reduce((sum, t) => sum + t.totalImages, 0);
  const imagesRemaining = project.totalImages - imagesUsed;

  const imageCount = Math.max(0, form.imageTo - form.imageFrom + 1);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Tên batch không được để trống.';
    if (form.imageFrom < 1) e.imageFrom = 'Số ảnh bắt đầu phải >= 1.';
    if (form.imageTo < form.imageFrom) e.imageTo = 'Ảnh kết thúc phải >= ảnh bắt đầu.';
    if (form.imageTo > project.totalImages) e.imageTo = `Dự án chỉ có ${project.totalImages} ảnh.`;
    if (!form.annotatorId) e.annotatorId = 'Vui lòng chọn Annotator.';
    if (!form.reviewerId) e.reviewerId = 'Vui lòng chọn Reviewer.';
    if (!form.deadline) e.deadline = 'Vui lòng chọn hạn chót.';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: project.id,
      name: form.name,
      annotatorId: form.annotatorId,
      reviewerId: form.reviewerId,
      status: 'pending',
      totalImages: imageCount,
      completedImages: 0,
      deadline: form.deadline,
      priority: form.priority,
    };
    setSubmitted(true);
    toast.success(`✅ Đã tạo task "${form.name}" thành công!`);
    setTimeout(() => {
      onSubmit(newTask);
      onClose();
    }, 800);
  };

  // Today as min date for deadline
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      {/* Backdrop */}
      <div className="panel-backdrop" onClick={onClose} />

      {/* Slide-in Panel */}
      <div className="create-task-panel">
        <div className="panel-header">
          <div className="panel-header-title">
            <ChevronRight size={18} className="panel-arrow" />
            <div>
              <h2>Tạo Task mới</h2>
              <p className="panel-sub">{project.name}</p>
            </div>
          </div>
          <button className="panel-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Info strip */}
        <div className="panel-info-strip">
          <span><Image size={14} /> Tổng dataset: <strong>{project.totalImages.toLocaleString()}</strong> ảnh</span>
          <span className={imagesRemaining < 0 ? 'danger' : ''}>
            <Tag size={14} /> Chưa chia: <strong>{Math.max(0, imagesRemaining).toLocaleString()}</strong> ảnh
          </span>
          <span><Users size={14} /> Annotators: <strong>{memberAnnotators.length}</strong></span>
        </div>

        {memberAnnotators.length === 0 && (
          <div className="panel-warning">
            <AlertTriangle size={16} />
            Dự án chưa có Annotator nào được duyệt. Hãy vào tab <strong>Thành viên</strong> để mời trước.
          </div>
        )}

        <form className="panel-form" onSubmit={handleSubmit}>
          {/* ── Batch Name ── */}
          <div className="pf-group">
            <label>Tên Batch / Task <span className="required">*</span></label>
            <input
              type="text"
              placeholder="Ví dụ: Batch 5 - Ảnh ban đêm"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* ── Image Range ── */}
          <div className="pf-group">
            <label>Phạm vi ảnh <span className="required">*</span></label>
            <div className="range-inputs">
              <div className="range-input-wrap">
                <span className="range-label">Từ ảnh</span>
                <input
                  type="number"
                  min={1}
                  max={project.totalImages}
                  value={form.imageFrom}
                  onChange={e => setForm({ ...form, imageFrom: Number(e.target.value) })}
                  className={errors.imageFrom ? 'error' : ''}
                />
              </div>
              <span className="range-sep">→</span>
              <div className="range-input-wrap">
                <span className="range-label">Đến ảnh</span>
                <input
                  type="number"
                  min={1}
                  max={project.totalImages}
                  value={form.imageTo}
                  onChange={e => setForm({ ...form, imageTo: Number(e.target.value) })}
                  className={errors.imageTo ? 'error' : ''}
                />
              </div>
            </div>
            {(errors.imageFrom || errors.imageTo) && (
              <span className="field-error">{errors.imageFrom || errors.imageTo}</span>
            )}
            {imageCount > 0 && (
              <div className="image-count-badge">
                <Image size={13} /> Task này sẽ có <strong>{imageCount.toLocaleString()} ảnh</strong>
              </div>
            )}
          </div>

          {/* ── Priority ── */}
          <div className="pf-group">
            <label>Mức độ ưu tiên</label>
            <div className="priority-selector">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`priority-btn ${form.priority === p.value ? 'active' : ''}`}
                  style={form.priority === p.value ? { borderColor: p.color, backgroundColor: p.color + '18' } : {}}
                  onClick={() => setForm({ ...form, priority: p.value as any })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Deadline ── */}
          <div className="pf-group">
            <label><Calendar size={14} /> Hạn chót <span className="required">*</span></label>
            <input
              type="date"
              min={today}
              value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
              className={errors.deadline ? 'error' : ''}
            />
            {errors.deadline && <span className="field-error">{errors.deadline}</span>}
          </div>

          {/* ── Assign Annotator ── */}
          <div className="pf-group">
            <label><Users size={14} /> Giao cho Annotator <span className="required">*</span></label>
            {memberAnnotators.length === 0 ? (
              <div className="no-members-hint">Chưa có Annotator trong dự án.</div>
            ) : (
              <div className="member-select-cards">
                {memberAnnotators.map(u => (
                  <div
                    key={u.id}
                    className={`member-select-card ${form.annotatorId === u.id ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, annotatorId: u.id })}
                  >
                    <div className="msc-avatar">{u.avatar}</div>
                    <div className="msc-info">
                      <strong>{u.name}</strong>
                      <span>{u.qualityScore}% chất lượng · {u.tasksCompleted} tasks</span>
                    </div>
                    {form.annotatorId === u.id && <span className="msc-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {errors.annotatorId && <span className="field-error">{errors.annotatorId}</span>}
          </div>

          {/* ── Assign Reviewer ── */}
          <div className="pf-group">
            <label><Users size={14} /> Reviewer phụ trách <span className="required">*</span></label>
            {memberReviewers.length === 0 ? (
              <div className="no-members-hint">Chưa có Reviewer trong dự án.</div>
            ) : (
              <div className="member-select-cards">
                {memberReviewers.map(u => (
                  <div
                    key={u.id}
                    className={`member-select-card reviewer-card ${form.reviewerId === u.id ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, reviewerId: u.id })}
                  >
                    <div className="msc-avatar reviewer-ava">{u.avatar}</div>
                    <div className="msc-info">
                      <strong>{u.name}</strong>
                      <span>{u.qualityScore}% chất lượng · {u.tasksCompleted} tasks</span>
                    </div>
                    {form.reviewerId === u.id && <span className="msc-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {errors.reviewerId && <span className="field-error">{errors.reviewerId}</span>}
          </div>

          {/* ── Submit ── */}
          <div className="panel-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button
              type="submit"
              className={`btn btn-primary ${submitted ? 'btn-success' : ''}`}
              disabled={submitted}
            >
              {submitted ? '✅ Đã tạo!' : 'Tạo Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateTaskPanel;
