import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import type { LabelDefinition, ProjectType } from '../../data/mockData';
import './CreateProject.css';
import toast from 'react-hot-toast';
import { projectsApi } from '../../api/projects';
import { useData } from '../../context/DataContext';

// Step markers
const STEPS = ['Thông tin cơ bản', 'Ontology & Nhãn', 'Hướng dẫn'];

interface FormData {
  name: string;
  type: ProjectType;
  description: string;
  labels: LabelDefinition[];
  guidelines: string;
}

const PROJECT_TYPES: { value: ProjectType; label: string; icon: string }[] = [
  { value: 'bounding_box', label: 'Bounding Box', icon: '⬜' },
  { value: 'polygon', label: 'Polygon', icon: '⬡' },
  { value: 'classification', label: 'Classification', icon: '🏷️' },
  { value: 'segmentation', label: 'Segmentation', icon: '🎨' },
  { value: 'text_classification', label: 'Text Classification', icon: '💬' },
];

const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const DEFAULT_LABEL: Omit<LabelDefinition, 'id'> = { name: '', color: '#3b82f6' };

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProjects } = useData();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: '',
    type: 'bounding_box',
    description: '',
    labels: [{ id: 'new-1', name: 'Object', color: '#ef4444' }],
    guidelines: '',
  });

  const canAdvanceStep1 = form.name.trim() !== '' && form.type;
  const canAdvanceStep2 = form.labels.length > 0 && form.labels.every(l => l.name.trim() !== '');

  const addLabel = () => {
    setForm(f => ({
      ...f,
      labels: [...f.labels, { id: `new-${Date.now()}`, ...DEFAULT_LABEL }],
    }));
  };

  const removeLabel = (id: string) => {
    setForm(f => ({ ...f, labels: f.labels.filter(l => l.id !== id) }));
  };

  const updateLabel = (id: string, changes: Partial<LabelDefinition>) => {
    setForm(f => ({
      ...f,
      labels: f.labels.map(l => l.id === id ? { ...l, ...changes } : l),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const project = await projectsApi.create({
        name: form.name,
        type: form.type,
        description: form.description,
        guidelines: form.guidelines,
      });
      // Tạo labels
      for (const label of form.labels) {
        await projectsApi.createLabel(project.id, { name: label.name, color: label.color });
      }
      await refreshProjects();
      toast.success('Dự án đã được tạo thành công!');
      navigate('/manager/projects');
    } catch {
      toast.error('Tạo dự án thất bại, thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-project-page animate-fade-in">
      {/* Page Header */}
      <div className="page-header-actions">
        <button className="btn btn-secondary btn-icon-text" onClick={() => navigate('/manager/projects')}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <h1 className="page-title">Tạo dự án mới</h1>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="step-circle">
                {i < step ? <Check size={16} /> : <span>{i + 1}</span>}
              </div>
              <span className="step-label">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`step-connector ${i < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="step-content">

        {/* ─── STEP 1: Basic Info ─── */}
        {step === 0 && (
          <div className="form-card">
            <h2>Thông tin cơ bản</h2>
            <div className="form-group">
              <label>Tên dự án <span className="required">*</span></label>
              <input
                type="text"
                placeholder="Ví dụ: Nhận diện biển số xe VN"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Loại task <span className="required">*</span></label>
              <div className="type-grid">
                {PROJECT_TYPES.map(pt => (
                  <div
                    key={pt.value}
                    className={`type-card ${form.type === pt.value ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, type: pt.value })}
                  >
                    <span className="type-icon">{pt.icon}</span>
                    <span className="type-label">{pt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Mô tả dự án</label>
              <textarea
                placeholder="Mô tả mục tiêu và phạm vi của dự án..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 2: Ontology (Labels) ─── */}
        {step === 1 && (
          <div className="form-card">
            <h2>Định nghĩa Ontology (Bộ nhãn)</h2>
            <p className="form-hint">Định nghĩa các nhãn (labels) mà người gán nhãn sẽ sử dụng. Mỗi nhãn cần có tên và màu sắc riêng biệt.</p>
            <div className="labels-editor">
              {form.labels.map((label, idx) => (
                <div key={label.id} className="label-row">
                  <span className="label-index">{idx + 1}</span>
                  <div className="color-picker-group">
                    <input
                      type="color"
                      value={label.color}
                      onChange={e => updateLabel(label.id, { color: e.target.value })}
                      className="color-input"
                    />
                    <div className="preset-colors">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          className={`preset-dot ${label.color === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => updateLabel(label.id, { color: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Tên nhãn (ví dụ: Car, Person...)"
                    value={label.name}
                    onChange={e => updateLabel(label.id, { name: e.target.value })}
                    className="label-name-input"
                  />
                  <button
                    className="btn-icon-danger"
                    onClick={() => removeLabel(label.id)}
                    disabled={form.labels.length <= 1}
                    title="Xóa nhãn"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-icon-text" onClick={addLabel}>
              <Plus size={16} />
              <span>Thêm nhãn mới</span>
            </button>
          </div>
        )}

        {/* ─── STEP 3: Guidelines ─── */}
        {step === 2 && (
          <div className="form-card">
            <h2>Hướng dẫn gán nhãn (Guidelines)</h2>
            <p className="form-hint">Viết hướng dẫn chi tiết cho Annotator. Đây là tài liệu quan trọng đảm bảo tính nhất quán của dữ liệu.</p>
            <div className="form-group">
              <textarea
                placeholder="Ví dụ:&#10;1. Vẽ hộp chữ nhật bao quanh toàn bộ đối tượng.&#10;2. Không bỏ sót đối tượng dù bị khuất một phần.&#10;3. Tham khảo ảnh mẫu bên dưới nếu chưa rõ."
                value={form.guidelines}
                onChange={e => setForm({ ...form, guidelines: e.target.value })}
                rows={14}
                className="guidelines-textarea"
              />
            </div>

            {/* Preview */}
            <div className="project-preview">
              <h3>Xem trước dự án</h3>
              <div className="preview-card">
                <div className="preview-row">
                  <span className="preview-label">Tên:</span>
                  <strong>{form.name}</strong>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Loại task:</span>
                  <span>{PROJECT_TYPES.find(t => t.value === form.type)?.label}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">Nhãn:</span>
                  <div className="preview-labels">
                    {form.labels.map(l => (
                      <span key={l.id} className="preview-label-chip" style={{ backgroundColor: l.color + '25', color: l.color, borderColor: l.color }}>
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="step-nav">
        {step > 0 && (
          <button className="btn btn-secondary btn-icon-text" onClick={() => setStep(s => s - 1)}>
            <ArrowLeft size={18} /> Quay lại
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button
            className="btn btn-primary btn-icon-text"
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !canAdvanceStep1 : !canAdvanceStep2}
          >
            Tiếp tục <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn btn-primary btn-icon-text" onClick={handleSubmit} disabled={submitting}>
            <Check size={18} /> {submitting ? 'Đang tạo...' : 'Tạo dự án'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateProject;
