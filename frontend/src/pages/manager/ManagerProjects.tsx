import React from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import './ManagerProjects.css';

// Mock Data structure
interface Project {
  id: string;
  name: string;
  type: string;
  progress: number;
  annotators: number;
  status: StatusType;
  updatedAt: string;
}

const mockProjects: Project[] = [
  { id: '1', name: 'Nhận diện biển số xe VN', type: 'Bounding Box', progress: 85, annotators: 3, status: 'in-progress', updatedAt: '2 giờ trước' },
  { id: '2', name: 'Phân loại lỗi linh kiện điện tử', type: 'Classification', progress: 100, annotators: 1, status: 'completed', updatedAt: '1 ngày trước' },
  { id: '3', name: 'Theo dõi quỹ đạo người đi bộ', type: 'Polygon', progress: 12, annotators: 5, status: 'in-progress', updatedAt: '5 phút trước' },
  { id: '4', name: 'Dự án Y tế - Đoán khối u MRI', type: 'Segmentation', progress: 0, annotators: 0, status: 'draft', updatedAt: '1 tuần trước' },
  { id: '5', name: 'Gắn nhãn cảm xúc bình luận', type: 'Text Classification', progress: 45, annotators: 2, status: 'in-review', updatedAt: 'Vừa xong' },
];

const ManagerProjects: React.FC = () => {
  const columns = [
    { 
      key: 'name', 
      title: 'Tên Dự Án',
      render: (item: Project) => <strong className="project-name-cell">{item.name}</strong> 
    },
    { key: 'type', title: 'Loại Nhãn' },
    { 
      key: 'progress', 
      title: 'Tiến độ',
      render: (item: Project) => (
        <div className="progress-cell">
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${item.progress}%`, backgroundColor: item.progress === 100 ? '#10b981' : '#3b82f6' }}></div>
          </div>
          <span className="progress-text">{item.progress}%</span>
        </div>
      )
    },
    { 
      key: 'annotators', 
      title: 'Nhân sự',
      render: (item: Project) => <span>{item.annotators} người</span>
    },
    { 
      key: 'status', 
      title: 'Trạng thái',
      render: (item: Project) => <StatusBadge status={item.status} />
    },
    { key: 'updatedAt', title: 'Cập nhật' }
  ];

  return (
    <div className="manager-projects-page animate-fade-in">
      <div className="page-header-actions">
        <div className="search-filter-group">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm dự án..." />
          </div>
          <button className="btn btn-secondary btn-icon-text">
            <Filter size={18} />
            <span>Bộ lọc</span>
          </button>
        </div>
        <button className="btn btn-primary btn-icon-text">
          <Plus size={18} />
          <span>Tạo dự án mới</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Tổng số dự án</span>
          <h3 className="stat-value">{mockProjects.length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đang thực hiện</span>
          <h3 className="stat-value text-blue">2</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Hoàn thành</span>
          <h3 className="stat-value text-green">1</h3>
        </div>
      </div>

      <div className="table-wrapper">
        <DataTable<Project> 
          data={mockProjects} 
          columns={columns} 
          keyExtractor={(item) => item.id}
          onRowClick={(item) => console.log('View project', item.id)}
        />
      </div>
    </div>
  );
};

export default ManagerProjects;
