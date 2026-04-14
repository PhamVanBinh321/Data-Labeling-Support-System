import React, { useState, useEffect } from 'react';
import { X, ChevronRight, AlertTriangle, Users, Calendar, Image } from 'lucide-react';
import type { Project } from '../../data/mockData';
import toast from 'react-hot-toast';
import './CreateTaskPanel.css';
import { tasksApi } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { annotationsApi } from '../../api/annotations';

interface ApiMember { id: number; user_id: number; role: string; status: string; }

interface CreateTaskPanelProps {
  project: Project;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

const PRIORITY_OPTIONS = [
  { value: 'High',   label: '🔴 Cao',       color: '#ef4444' },
  { value: 'Medium', label: '🟡 Trung bình', color: '#f59e0b' },
  { value: 'Low',    label: '🟢 Thấp',       color: '#10b981' },
];


const CreateTaskPanel: React.FC<CreateTaskPanelProps> = ({ project, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    imageFrom: 1,
    imageTo: 100,
    annotatorId: '',
    reviewerId: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    deadline: '',
  });
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers]       = useState<ApiMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);

  useEffect(() => {
    projectsApi.listMembers(Number(project.id))
      .then((data: any) => setMembers(Array.isArray(data) ? data.filter((m: ApiMember) => m.status === 'active') : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [project.id]);

  useEffect(() => {
    annotationsApi.listProjectImages(Number(project.id))
      .then((res: any) => setUnassignedCount(res?.unassigned_count ?? 0))
      .catch(() => setUnassignedCount(0));
  }, [project.id]);

  const memberAnnotators = members.filter(m => m.role === 'annotator');
  const memberReviewers  = members.filter(m => m.role === 'reviewer');

  const imageCount = Math.max(0, form.imageTo - form.imageFrom + 1);
  const poolLoaded = unassignedCount !== null;
  const notEnoughImages = poolLoaded && imageCount > unassignedCount!;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())                   e.name        = 'Tên batch không được để trống.';
    if (form.imageFrom < 1)                  e.imageFrom   = 'Số ảnh bắt đầu phải >= 1.';
    if (form.imageTo < form.imageFrom)       e.imageTo     = 'Ảnh kết thúc phải >= ảnh bắt đầu.';
    if (poolLoaded && imageCount > unassignedCount!)
      e.imageTo = `Chỉ còn ${unassignedCount} ảnh chưa được phân công. Không thể tạo task với ${imageCount} ảnh.`;
    if (!form.annotatorId)                   e.annotatorId = 'Vui lòng chọn Annotator.';
    if (!form.reviewerId)                    e.reviewerId  = 'Vui lòng chọn Reviewer.';
    if (!form.deadline)                      e.deadline    = 'Vui lòng chọn hạn chót.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    let createdTaskId: number | null = null;
    try {
      const created = await tasksApi.create({
        project_id:   Number(project.id),
        name:         form.name,
        annotator_id: Number(form.annotatorId),
        reviewer_id:  Number(form.reviewerId),
        deadline:     form.deadline,
        priority:     form.priority,
      });
      createdTaskId = created.id;

      // Gán ảnh — nếu thất bại thì rollback xóa task vừa tạo
      if (imageCount > 0) {
        await annotationsApi.assignImagesToTask(Number(project.id), created.id, imageCount);
      }

      toast.success(`Đã tạo task "${form.name}" thành công!`);
      await onSubmit();
      onClose();
    } catch (err: any) {
      // Rollback: xóa task nếu assign ảnh thất bại
      if (createdTaskId) {
        try { await tasksApi.delete(createdTaskId); } catch { /* best-effort */ }
      }
      const msg = err?.response?.data?.message || 'Tạo task thất bại. Kiểm tra lại thông tin.';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <div className="create-task-panel">
        <div className="panel-header">
          <div className="panel-header-title">
            <ChevronRight size={18} className="panel-arrow" />
            <div>
              <h2>Tạo Task mới</h2>
              <p className="panel-sub">{project.name}</p>
            </div>
          </div>
          <button className="panel-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="panel-info-strip">
          <span><Image size={14} /> Tổng dataset: <strong>{project.totalImages.toLocaleString()}</strong> ảnh</span>
          <span className={unassignedCount === 0 ? 'danger' : ''}>
            Chưa phân công: <strong>
              {poolLoaded ? unassignedCount!.toLocaleString() : '...'}
            </strong> ảnh
          </span>
          <span><Users size={14} /> Annotators: <strong>{memberAnnotators.length}</strong></span>
        </div>

        {poolLoaded && unassignedCount === 0 && (
          <div className="panel-warning">
            <AlertTriangle size={16} />
            Tất cả ảnh trong project đã được phân công cho task khác. Không thể tạo task mới.
          </div>
        )}
        {!loadingMembers && memberAnnotators.length === 0 && (
          <div className="panel-warning">
            <AlertTriangle size={16} />
            Dự án chưa có Annotator nào. Hãy vào tab <strong>Thành viên</strong> để mời trước.
          </div>
        )}

        <form className="panel-form" onSubmit={handleSubmit}>
          {/* Batch Name */}
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

          {/* Image Range */}
          <div className="pf-group">
            <label>Phạm vi ảnh <span className="required">*</span></label>
            <div className="range-inputs">
              <div className="range-input-wrap">
                <span className="range-label">Từ ảnh</span>
                <input type="number" min={1} value={form.imageFrom}
                  onChange={e => setForm({ ...form, imageFrom: Number(e.target.value) })}
                  className={errors.imageFrom ? 'error' : ''} />
              </div>
              <span className="range-sep">→</span>
              <div className="range-input-wrap">
                <span className="range-label">Đến ảnh</span>
                <input type="number" min={1} value={form.imageTo}
                  onChange={e => setForm({ ...form, imageTo: Number(e.target.value) })}
                  className={errors.imageTo ? 'error' : ''} />
              </div>
            </div>
            {(errors.imageFrom || errors.imageTo) && (
              <span className="field-error">{errors.imageFrom || errors.imageTo}</span>
            )}
            {imageCount > 0 && (
              <div className={`image-count-badge ${notEnoughImages ? 'danger' : ''}`}>
                <Image size={13} /> Task này sẽ có <strong>{imageCount.toLocaleString()} ảnh</strong>
                {poolLoaded && !notEnoughImages && (
                  <span style={{ color: '#6b7280', marginLeft: 6 }}>
                    (còn {unassignedCount} ảnh chưa phân công)
                  </span>
                )}
              </div>
            )}
            {notEnoughImages && (
              <div className="panel-warning" style={{ marginTop: 8 }}>
                <AlertTriangle size={14} />
                Chỉ còn <strong>{unassignedCount}</strong> ảnh chưa được phân công. Hãy giảm số lượng.
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="pf-group">
            <label>Mức độ ưu tiên</label>
            <div className="priority-selector">
              {PRIORITY_OPTIONS.map(p => (
                <button key={p.value} type="button"
                  className={`priority-btn ${form.priority === p.value ? 'active' : ''}`}
                  style={form.priority === p.value ? { borderColor: p.color, backgroundColor: p.color + '18' } : {}}
                  onClick={() => setForm({ ...form, priority: p.value as any })}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="pf-group">
            <label><Calendar size={14} /> Hạn chót <span className="required">*</span></label>
            <input type="date" min={today} value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
              className={errors.deadline ? 'error' : ''} />
            {errors.deadline && <span className="field-error">{errors.deadline}</span>}
          </div>

          {/* Annotator */}
          <div className="pf-group">
            <label><Users size={14} /> Giao cho Annotator <span className="required">*</span></label>
            {loadingMembers ? (
              <div className="no-members-hint">Đang tải danh sách thành viên...</div>
            ) : memberAnnotators.length === 0 ? (
              <div className="no-members-hint">Chưa có Annotator trong dự án.</div>
            ) : (
              <div className="member-select-cards">
                {memberAnnotators.map(m => (
                  <div key={m.user_id}
                    className={`member-select-card ${form.annotatorId === String(m.user_id) ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, annotatorId: String(m.user_id) })}>
                    <div className="msc-avatar">👤</div>
                    <div className="msc-info">
                      <strong>Annotator</strong>
                      <span>User ID: {m.user_id}</span>
                    </div>
                    {form.annotatorId === String(m.user_id) && <span className="msc-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {errors.annotatorId && <span className="field-error">{errors.annotatorId}</span>}
          </div>

          {/* Reviewer */}
          <div className="pf-group">
            <label><Users size={14} /> Reviewer phụ trách <span className="required">*</span></label>
            {loadingMembers ? (
              <div className="no-members-hint">Đang tải danh sách thành viên...</div>
            ) : memberReviewers.length === 0 ? (
              <div className="no-members-hint">Chưa có Reviewer trong dự án.</div>
            ) : (
              <div className="member-select-cards">
                {memberReviewers.map(m => (
                  <div key={m.user_id}
                    className={`member-select-card reviewer-card ${form.reviewerId === String(m.user_id) ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, reviewerId: String(m.user_id) })}>
                    <div className="msc-avatar reviewer-ava">👤</div>
                    <div className="msc-info">
                      <strong>Reviewer</strong>
                      <span>User ID: {m.user_id}</span>
                    </div>
                    {form.reviewerId === String(m.user_id) && <span className="msc-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {errors.reviewerId && <span className="field-error">{errors.reviewerId}</span>}
          </div>

          <div className="panel-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || notEnoughImages || unassignedCount === 0}>
              {submitting ? 'Đang tạo...' : 'Tạo Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateTaskPanel;
