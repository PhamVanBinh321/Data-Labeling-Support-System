import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Search, Image,
  CheckCircle, Clock, AlertTriangle, XCircle,
  ExternalLink
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import DataTable from '../../components/common/DataTable';
import './ManagerDatasets.css';

interface DatasetRow {
  id: string;
  name: string;
  projectId: string;
  totalImages: number;
  annotatedImages: number;
  approvedImages: number;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:    { label: 'Đang hoạt động', color: '#10b981', icon: <CheckCircle size={13} /> },
  completed: { label: 'Hoàn thành',     color: '#6366f1', icon: <CheckCircle size={13} /> },
  paused:    { label: 'Tạm dừng',       color: '#f59e0b', icon: <Clock size={13} /> },
  archived:  { label: 'Lưu trữ',        color: '#6b7280', icon: <XCircle size={13} /> },
  draft:     { label: 'Nháp',           color: '#94a3b8', icon: <AlertTriangle size={13} /> },
};

const ManagerDatasets: React.FC = () => {
  const { projects, loading } = useData();
  const [search, setSearch] = useState('');

  const rows: DatasetRow[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    projectId: p.id,
    totalImages: p.totalImages,
    annotatedImages: p.annotatedImages,
    approvedImages: p.approvedImages,
    status: p.status,
    createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—',
  }));

  const filtered = rows.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalImages   = rows.reduce((s, d) => s + d.totalImages, 0);
  const totalLabeled  = rows.reduce((s, d) => s + d.annotatedImages, 0);
  const totalApproved = rows.reduce((s, d) => s + d.approvedImages, 0);

  const columns = [
    {
      key: 'name',
      title: 'Tên dataset',
      render: (d: DatasetRow) => (
        <div className="ds-name-cell">
          <Image size={16} className="dt-icon image" />
          <span className="ds-filename">{d.name}</span>
        </div>
      ),
    },
    {
      key: 'project',
      title: 'Dự án',
      render: (d: DatasetRow) => (
        <Link to={`/manager/projects/${d.projectId}`} className="ds-proj-link">
          Xem project <ExternalLink size={12} />
        </Link>
      ),
    },
    {
      key: 'totalImages',
      title: 'Tổng ảnh',
      render: (d: DatasetRow) => <span>{d.totalImages.toLocaleString()}</span>,
    },
    {
      key: 'annotatedImages',
      title: 'Đã dán nhãn',
      render: (d: DatasetRow) => (
        <span style={{ color: '#3b82f6' }}>{d.annotatedImages.toLocaleString()}</span>
      ),
    },
    {
      key: 'approvedImages',
      title: 'Đã duyệt',
      render: (d: DatasetRow) => (
        <span style={{ color: '#10b981' }}>{d.approvedImages.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (d: DatasetRow) => {
        const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG['draft'];
        return (
          <span className="ds-status-badge" style={{ color: cfg.color, borderColor: cfg.color + '44', backgroundColor: cfg.color + '14' }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    { key: 'createdAt', title: 'Ngày tạo' },
  ];

  return (
    <div className="manager-datasets-page animate-fade-in">
      <div className="page-title-row">
        <div>
          <h1><Database size={24} /> Datasets</h1>
          <p className="page-subtitle">Dữ liệu ảnh theo từng project. Chỉ xem.</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Tổng datasets</span>
          <h3 className="stat-value">{rows.length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tổng ảnh</span>
          <h3 className="stat-value">{totalImages.toLocaleString()}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã dán nhãn</span>
          <h3 className="stat-value" style={{ color: '#3b82f6' }}>{totalLabeled.toLocaleString()}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã duyệt</span>
          <h3 className="stat-value text-green">{totalApproved.toLocaleString()}</h3>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tên dataset..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading
        ? <div className="empty-state">Đang tải...</div>
        : <DataTable<DatasetRow>
            data={filtered}
            columns={columns}
            keyExtractor={d => d.id}
            pageSize={8}
          />
      }
    </div>
  );
};

export default ManagerDatasets;
