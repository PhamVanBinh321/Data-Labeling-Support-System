import React from 'react';
import './StatusBadge.css';

export type StatusType = 'draft' | 'pending' | 'in-progress' | 'in-review' | 'approved' | 'rejected' | 'completed';

interface StatusBadgeProps {
  status: StatusType;
  label?: string; // Optional custom text, otherwise derives from status
}

const statusConfig: Record<StatusType, { label: string, colorClass: string }> = {
  'draft': { label: 'Bản nháp', colorClass: 'badge-gray' },
  'pending': { label: 'Chờ xử lý', colorClass: 'badge-yellow' },
  'in-progress': { label: 'Đang làm', colorClass: 'badge-blue' },
  'in-review': { label: 'Chờ duyệt', colorClass: 'badge-purple' },
  'approved': { label: 'Đã duyệt', colorClass: 'badge-green' },
  'rejected': { label: 'Trả về', colorClass: 'badge-red' },
  'completed': { label: 'Hoàn thành', colorClass: 'badge-teal' }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusConfig[status] || statusConfig['draft'];
  const displayText = label || config.label;

  return (
    <span className={`status-badge ${config.colorClass}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
