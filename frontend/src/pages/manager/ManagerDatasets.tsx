import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Search, Image, Video, FileText,
  CheckCircle, Clock, AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { MOCK_DATASETS } from '../../data/mockData';
import type { Dataset, DatasetType, DatasetStatus } from '../../data/mockData';
import { useData } from '../../context/DataContext';
import DataTable from '../../components/common/DataTable';
import './ManagerDatasets.css';

const TYPE_ICON: Record<DatasetType, React.ReactNode> = {
  image: <Image size={16} className="dt-icon image" />,
  video: <Video size={16} className="dt-icon video" />,
  text:  <FileText size={16} className="dt-icon text" />,
};

const TYPE_LABEL: Record<DatasetType, string> = { image: 'Ảnh', video: 'Video', text: 'Văn bản' };

const STATUS_CONFIG: Record<DatasetStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ready:      { label: 'Sẵn sàng',    color: '#10b981', icon: <CheckCircle size={13} /> },
  processing: { label: 'Đang xử lý',  color: '#f59e0b', icon: <Clock size={13} /> },
  imported:   { label: 'Đã nhập',     color: '#6366f1', icon: <CheckCircle size={13} /> },
  error:      { label: 'Lỗi',         color: '#ef4444', icon: <AlertTriangle size={13} /> },
};

const SOURCE_LABEL: Record<string, string> = {
  local: '💾 Local', s3: '☁️ AWS S3', azure: '🔵 Azure', gcs: '🟡 GCS',
};

const ManagerDatasets: React.FC = () => {
  const { getProjectById } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DatasetType | 'all'>('all');

  const filtered = MOCK_DATASETS.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchType;
  });

  // Summary stats
  const totalFiles = MOCK_DATASETS.reduce((s, d) => s + d.totalFiles, 0);
  const totalSizeGB = (MOCK_DATASETS.reduce((s, d) => s + d.totalSizeMB, 0) / 1024).toFixed(1);
  const readyCount = MOCK_DATASETS.filter(d => d.status === 'ready').length;

  const columns = [
    {
      key: 'name',
      title: 'Tên file',
      render: (d: Dataset) => (
        <div className="ds-name-cell">
          {TYPE_ICON[d.type]}
          <span className="ds-filename">{d.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Loại',
      render: (d: Dataset) => <span className={`ds-type-badge ${d.type}`}>{TYPE_LABEL[d.type]}</span>,
    },
    {
      key: 'project',
      title: 'Dự án',
      render: (d: Dataset) => {
        const proj = getProjectById(d.projectId);
        return proj
          ? <Link to={`/manager/projects/${proj.id}`} className="ds-proj-link">{proj.name} <ExternalLink size={12} /></Link>
          : '—';
      },
    },
    {
      key: 'totalFiles',
      title: 'Số file',
      render: (d: Dataset) => <span>{d.totalFiles.toLocaleString()}</span>,
    },
    {
      key: 'size',
      title: 'Dung lượng',
      render: (d: Dataset) => (
        <span>{d.totalSizeMB >= 1024 ? `${(d.totalSizeMB / 1024).toFixed(1)} GB` : `${d.totalSizeMB} MB`}</span>
      ),
    },
    {
      key: 'source',
      title: 'Nguồn',
      render: (d: Dataset) => <span className="ds-source">{SOURCE_LABEL[d.source]}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (d: Dataset) => {
        const cfg = STATUS_CONFIG[d.status];
        return (
          <span className="ds-status-badge" style={{ color: cfg.color, borderColor: cfg.color + '44', backgroundColor: cfg.color + '14' }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    { key: 'uploadedAt', title: 'Upload lúc' },
  ];

  return (
    <div className="manager-datasets-page animate-fade-in">
      <div className="page-title-row">
        <div>
          <h1><Database size={24} /> Datasets</h1>
          <p className="page-subtitle">Tất cả dữ liệu đã được nhập vào hệ thống. Chỉ xem.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Tổng datasets</span>
          <h3 className="stat-value">{MOCK_DATASETS.length}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tổng file</span>
          <h3 className="stat-value">{totalFiles.toLocaleString()}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tổng dung lượng</span>
          <h3 className="stat-value">{totalSizeGB} <small>GB</small></h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sẵn sàng</span>
          <h3 className="stat-value text-green">{readyCount}/{MOCK_DATASETS.length}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo tên file..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="type-filters">
          {(['all', 'image', 'video', 'text'] as const).map(t => (
            <button
              key={t}
              className={`type-filter-btn ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'Tất cả' : TYPE_LABEL[t as DatasetType]}
            </button>
          ))}
        </div>
      </div>

      <DataTable<Dataset>
        data={filtered}
        columns={columns}
        keyExtractor={d => d.id}
        pageSize={8}
      />
    </div>
  );
};

export default ManagerDatasets;
