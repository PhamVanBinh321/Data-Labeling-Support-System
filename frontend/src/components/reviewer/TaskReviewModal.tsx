import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { Task } from '../../data/mockData';
import toast from 'react-hot-toast';

import './TaskReviewModal.css';

interface TaskReviewModalProps {
  task: Task;
  onClose: () => void;
}

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({ task, onClose }) => {
  const { updateTaskStatus } = useData();
  const navigate = useNavigate();

  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'reject' && !reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }

    if (decision === 'approve') {
      updateTaskStatus(task.id, 'approved');
      toast.success(`✅ Đã phê duyệt Task ${task.id}`);
    } else {
      updateTaskStatus(task.id, 'rejected', reason);
      toast.error(`❌ Đã từ chối Task ${task.id}`);
    }

    onClose();
    setTimeout(() => {
      navigate('/reviewer/queue');
    }, 600);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content review-modal-content">
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <h2>Đánh giá kết quả: {task.name}</h2>
        <p className="text-gray mb-1rem">Bạn đang đánh giá phiên làm việc của ID: {task.annotatorId}</p>
        
        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group mb-1rem">
            <label>Phân loại (Decision)</label>
            <div className="decision-buttons">
              <button 
                type="button" 
                className={`btn-decision ${decision === 'approve' ? 'active-approve' : ''}`}
                onClick={() => { setDecision('approve'); setReason(''); }}
              >
                <CheckCircle size={18} /> Phê duyệt (Pass)
              </button>
              <button 
                type="button" 
                className={`btn-decision ${decision === 'reject' ? 'active-reject' : ''}`}
                onClick={() => { setDecision('reject'); }}
              >
                <AlertTriangle size={18} /> Từ chối (Fail)
              </button>
            </div>
          </div>

          {decision === 'reject' && (
            <div className="form-group mb-1rem animate-fade-in">
              <label>Lý do cần sửa (Feedback)</label>
              <textarea 
                className="input-field" 
                rows={4} 
                placeholder="VD: Box xe quá hẹp, chưa phủ hết kích thước thật..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              />
            </div>
          )}

          <div className="modal-actions mt-2rem">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className={`btn ${decision === 'approve' ? 'btn-primary' : 'btn-danger'}`}>
              Xác nhận {decision === 'approve' ? 'Phê duyệt' : 'Từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskReviewModal;
