import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, FileText, Image, Calendar,
  AlertTriangle, Flag, MessageSquare, Shield, CheckCircle, Clock
} from 'lucide-react';
import type { Task } from '../../data/mockData';
import { useData } from '../../context/DataContext';
import StatusBadge from '../common/StatusBadge';
import type { StatusType } from '../common/StatusBadge';
import './TaskDetailPanel.css';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
}

const PRIORITY_CFG = {
  High:   { color: '#ef4444', bg: '#fff1f2', icon: <AlertTriangle size={14} />, label: 'Cao' },
  Medium: { color: '#f97316', bg: '#fff7ed', icon: <Clock size={14} />,         label: 'Trung bình' },
  Low:    { color: '#10b981', bg: '#f0fdf4', icon: <CheckCircle size={14} />,   label: 'Thấp' },
};

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onClose }) => {
  const navigate = useNavigate();
  const { getProjectById } = useData();
  const project = getProjectById(task.projectId);
  const pct = task.totalImages > 0 ? Math.round((task.completedImages / task.totalImages) * 100) : 0;
  const priCfg = PRIORITY_CFG[task.priority];
  const rejectInfo = task.rejectReason ? { reviewer: 'Reviewer', comment: task.rejectReason, issueImages: [] as number[] } : undefined;
  const isActionable = ['pending', 'in-progress', 'rejected'].includes(task.status);
  const actionLabel =
    task.status === 'rejected'    ? 'Làm lại tại Workspace' :
    task.status === 'in-progress' ? 'Tiếp tục Workspace' :
                                    'Vào Workspace';

  return (
    <>
      {/* Backdrop */}
      <div className="tdp-backdrop" onClick={onClose} />

      {/* Panel */}
      <aside className="tdp-panel">
        {/* Header */}
        <div className="tdp-header">
          <div className="tdp-header-left">
            <StatusBadge status={task.status as StatusType} />
            <span className="tdp-task-id">#{task.id}</span>
          </div>
          <button className="tdp-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="tdp-body">
          <h2 className="tdp-title">{task.name}</h2>
          {project && <p className="tdp-project">{project.name} — {project.typeName}</p>}

          {/* Info strip */}
          <div className="tdp-info-strip">
            <div className="tdp-info-item">
              <Image size={14} />
              <span>{task.totalImages.toLocaleString()} ảnh</span>
            </div>
            <div className="tdp-info-item">
              <Calendar size={14} />
              <span>Hạn: <strong>{task.deadline}</strong></span>
            </div>
            <div
              className="tdp-info-item priority-chip"
              style={{ color: priCfg.color, background: priCfg.bg }}
            >
              <Flag size={13} />
              <span>{priCfg.label}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="tdp-section">
            <p className="tdp-section-label">Tiến độ</p>
            <div className="tdp-progress-row">
              <span>{task.completedImages}/{task.totalImages} ảnh</span>
              <span className="tdp-pct">{pct}%</span>
            </div>
            <div className="tdp-progress-bg">
              <div className="tdp-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#f97316' }} />
            </div>
          </div>

          {/* Reviewer Reject Feedback */}
          {task.status === 'rejected' && rejectInfo && (
            <div className="tdp-reject-box">
              <div className="tdp-reject-header">
                <MessageSquare size={15} />
                <strong>Phản hồi từ Reviewer</strong>
                <span className="tdp-reviewer-name">
                  <Shield size={12} /> {rejectInfo.reviewer}
                </span>
              </div>
              <p className="tdp-reject-comment">{rejectInfo.comment}</p>
              {rejectInfo.issueImages.length > 0 && (
                <div className="tdp-issue-images">
                  <span>Ảnh cần sửa:</span>
                  {rejectInfo.issueImages.map(n => (
                    <span key={n} className="img-badge">#{n}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Guidelines */}
          {project?.guidelines && (
            <div className="tdp-section">
              <p className="tdp-section-label">
                <FileText size={13} /> Hướng dẫn gán nhãn
              </p>
              <pre className="tdp-guidelines">{project.guidelines}</pre>
            </div>
          )}

          {/* Labels */}
          {project?.labels && (
            <div className="tdp-section">
              <p className="tdp-section-label">Bộ nhãn ({project.labels.length})</p>
              <div className="tdp-labels">
                {project.labels.map(l => (
                  <span key={l.id} className="tdp-label-chip">
                    <span className="tdp-label-dot" style={{ background: l.color }} />
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="tdp-footer">
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
          {isActionable && (
            <button
              className="btn btn-primary btn-icon-text"
              onClick={() => navigate(`/workspace/${task.id}`)}
            >
              {actionLabel} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default TaskDetailPanel;
