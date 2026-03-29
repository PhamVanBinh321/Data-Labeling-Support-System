import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import type { Project } from '../../data/mockData';
import './ManagerProjects.css';
import { useData } from '../../context/DataContext';

// Map project status string → StatusBadge type
const statusMap: Record<string, StatusType> = {
  active: 'in-progress',
  completed: 'completed',
  paused: 'pending',
  draft: 'draft',
};

const ManagerProjects: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = useData();
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      title: 'Tên Dự Án',
      render: (item: Project) => <strong className="project-name-cell">{item.name}</strong>
    },
    { key: 'typeName', title: 'Loại Nhãn' },
    {
      key: 'progress',
      title: 'Tiến độ Gán nhãn',
      render: (item: Project) => {
        const pct = item.totalImages > 0 ? Math.round((item.annotatedImages / item.totalImages) * 100) : 0;
        return (
          <div className="progress-cell">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#3b82f6' }} />
            </div>
            <span className="progress-text">{pct}%</span>
          </div>
        );
      }
    },
    {
      key: 'totalImages',
      title: 'Tổng dữ liệu',
      render: (item: Project) => <span>{item.totalImages.toLocaleString()} ảnh</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item: Project) => <StatusBadge status={statusMap[item.status] || 'draft'} label={item.status === 'active' ? 'Đang hoạt động' : item.status === 'completed' ? 'Hoàn thành' : item.status === 'paused' ? 'Tạm dừng' : 'Bản nháp'} />
    },
    { key: 'updatedAt', title: 'Cập nhật' }
  ];

  return (
    <div className="manager-projects-page animate-fade-in">
      <div className="page-header-actions">
        <div className="search-filter-group">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm dự án..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-icon-text">
            <Filter size={18} />
            <span>Bộ lọc</span>
          </button>
        </div>
        <button className="btn btn-primary btn-icon-text" onClick={() => navigate('/manager/create-project')}>
          <Plus size={18} />
          <span>Tạo dự án mới</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Tổng số dự án</span>
          <h3 className="stat-value">{projects.length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đang hoạt động</span>
          <h3 className="stat-value text-blue">{projects.filter(p => p.status === 'active').length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Hoàn thành</span>
          <h3 className="stat-value text-green">{projects.filter(p => p.status === 'completed').length}</h3>
        </div>
      </div>

      <div className="table-wrapper">
        <DataTable<Project>
          data={filtered}
          columns={columns}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/manager/projects/${item.id}`)}
        />
      </div>
    </div>
  );
};

export default ManagerProjects;
