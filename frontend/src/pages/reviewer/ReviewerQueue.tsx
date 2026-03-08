import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Eye } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import './ReviewerQueue.css';

// Mock Data structure for Reviewer Queue
interface ReviewTask {
  id: string;
  projectName: string;
  annotatorName: string;
  submittedAt: string;
  imagesCount: number;
  status: StatusType;
  qualityScore?: number;
}

const mockReviewTasks: ReviewTask[] = [
  { id: '1', projectName: 'Nhận diện biển số xe VN', annotatorName: 'Nguyễn Văn A', submittedAt: '10 phút trước', imagesCount: 150, status: 'in-review' },
  { id: '2', projectName: 'Phân loại lỗi linh kiện điện tử', annotatorName: 'Trần Thị B', submittedAt: '1 giờ trước', imagesCount: 500, status: 'in-review', qualityScore: 98 },
  { id: '3', projectName: 'Gắn nhãn cảm xúc bình luận', annotatorName: 'Lê Văn C', submittedAt: 'Hôm qua', imagesCount: 1000, status: 'approved', qualityScore: 100 },
  { id: '4', projectName: 'Nhận diện biển số xe VN', annotatorName: 'Phạm Thị D', submittedAt: '2 ngày trước', imagesCount: 80, status: 'rejected', qualityScore: 45 },
  { id: '5', projectName: 'Dự án Y tế - Đoán khối u MRI', annotatorName: 'Hoàng Văn E', submittedAt: 'Vừa xong', imagesCount: 50, status: 'in-review' },
];

const ReviewerQueue: React.FC = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTasks = filterStatus === 'all' 
    ? mockReviewTasks 
    : mockReviewTasks.filter(t => t.status === filterStatus);

  const handleRowClick = (task: ReviewTask) => {
    // In a real app, this would go to a specialized Review Workspace
    // For now, we can just route to the standard workspace to "view" it
    navigate(`/workspace/${task.id}`);
  };

  const columns = [
    { 
      key: 'projectName', 
      title: 'Dự án',
      render: (item: ReviewTask) => <strong className="project-name-cell">{item.projectName}</strong> 
    },
    { 
      key: 'annotatorName', 
      title: 'Người gán nhãn' 
    },
    { 
      key: 'imagesCount', 
      title: 'Số lượng Data',
      render: (item: ReviewTask) => <span>{item.imagesCount} ảnh/dòng</span>
    },
    { 
      key: 'submittedAt', 
      title: 'Thời gian nộp' 
    },
    { 
      key: 'qualityScore', 
      title: 'Điểm chất lượng',
      render: (item: ReviewTask) => (
        item.qualityScore !== undefined ? (
          <span className={`quality-score ${item.qualityScore >= 90 ? 'text-green' : (item.qualityScore >= 70 ? 'text-orange' : 'text-red')}`}>
            {item.qualityScore}%
          </span>
        ) : <span className="text-gray">-</span>
      )
    },
    { 
      key: 'status', 
      title: 'Trạng thái',
      render: (item: ReviewTask) => <StatusBadge status={item.status} />
    },
    {
      key: 'action',
      title: 'Thao tác',
      render: (item: ReviewTask) => (
        <div className="action-buttons">
          {item.status === 'in-review' ? (
            <>
              <button 
                className="btn btn-sm btn-outline-green" 
                title="Phê duyệt nhanh"
                onClick={(e) => { e.stopPropagation(); toast.success(`✅ Đã phê duyệt Task #${item.id}`); }}
              >
                <CheckCircle size={16} />
              </button>
              <button 
                className="btn btn-sm btn-outline-red" 
                title="Từ chối nhanh"
                onClick={(e) => { e.stopPropagation(); toast.error(`❌ Đã từ chối Task #${item.id}`); }}
              >
                <XCircle size={16} />
              </button>
              <button 
                className="btn btn-sm btn-primary" 
                title="Kiểm tra chi tiết"
                onClick={(e) => { e.stopPropagation(); handleRowClick(item); }}
              >
                <Eye size={16} />
              </button>
            </>
          ) : (
            <button 
              className="btn btn-sm btn-secondary" 
              title="Xem lại kỷ lục"
              onClick={(e) => { e.stopPropagation(); handleRowClick(item); }}
            >
              <Eye size={16} /> Xem
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="reviewer-queue-page animate-fade-in">
      <div className="page-header-actions">
        <div className="search-filter-group">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm dự án, người gán nhãn..." />
          </div>
          
          <select 
            className="select-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="in-review">Chờ duyệt (In-Review)</option>
            <option value="approved">Đã duyệt (Approved)</option>
            <option value="rejected">Đã từ chối (Rejected)</option>
          </select>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Cần duyệt ngay</span>
          <h3 className="stat-value text-purple">{mockReviewTasks.filter(t => t.status === 'in-review').length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã duyệt (Hôm nay)</span>
          <h3 className="stat-value text-green">1</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tỉ lệ đạt (Quality Rate)</span>
          <h3 className="stat-value">98%</h3>
        </div>
      </div>

      <div className="table-wrapper">
        <DataTable<ReviewTask> 
          data={filteredTasks} 
          columns={columns} 
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};

export default ReviewerQueue;
