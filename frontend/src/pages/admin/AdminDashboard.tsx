import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FolderOpen, ListTodo, Image, RefreshCw } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import DataTable from '../../components/common/DataTable';
import { adminApi } from '../../api/admin';
import './AdminDashboard.css';

interface Overview {
  total_projects: number;
  total_tasks: number;
  total_images: number;
  synced_at: string | null;
}

interface ProjectStat {
  project_id: number;
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  in_review_tasks: number;
  approved_tasks: number;
  completed_tasks: number;
  rejected_tasks: number;
  total_images: number;
  annotated_images: number;
  synced_at: string;
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444'];

const AdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [projects, setProjects] = useState<ProjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pj] = await Promise.all([adminApi.overview(), adminApi.projects()]);
      setOverview(ov);
      setProjects(Array.isArray(pj) ? pj : []);
    } catch {
      setError('Không thể tải dữ liệu từ admin-service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Pie chart — tổng hợp task status toàn hệ thống
  const pieData = projects.length > 0 ? [
    { name: 'Pending',     value: projects.reduce((s, p) => s + p.pending_tasks, 0) },
    { name: 'Đang làm',   value: projects.reduce((s, p) => s + p.in_progress_tasks, 0) },
    { name: 'Đang review', value: projects.reduce((s, p) => s + p.in_review_tasks, 0) },
    { name: 'Approved',   value: projects.reduce((s, p) => s + p.approved_tasks, 0) },
    { name: 'Hoàn thành', value: projects.reduce((s, p) => s + p.completed_tasks, 0) },
    { name: 'Từ chối',    value: projects.reduce((s, p) => s + p.rejected_tasks, 0) },
  ].filter(d => d.value > 0) : [];

  // Bar chart — tasks theo project
  const barData = projects.map(p => ({
    name: `P${p.project_id}`,
    'Pending':     p.pending_tasks,
    'Đang làm':   p.in_progress_tasks,
    'Hoàn thành': p.completed_tasks,
    'Từ chối':    p.rejected_tasks,
  }));

  // Line chart — tỉ lệ hoàn thành theo project
  const lineData = projects.map(p => ({
    name: `P${p.project_id}`,
    'Hoàn thành (%)': p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0,
    'Ảnh đã gán (%)': p.total_images > 0 ? Math.round((p.annotated_images / p.total_images) * 100) : 0,
  }));

  const columns = [
    { key: 'project_id',       title: 'Project', render: (p: ProjectStat) => <span className="admin-project-id">#{p.project_id}</span> },
    { key: 'total_tasks',      title: 'Tổng',    render: (p: ProjectStat) => <strong>{p.total_tasks}</strong> },
    { key: 'pending_tasks',    title: 'Pending',  render: (p: ProjectStat) => <span className="badge badge-pending">{p.pending_tasks}</span> },
    { key: 'in_progress_tasks',title: 'Làm',     render: (p: ProjectStat) => <span className="badge badge-progress">{p.in_progress_tasks}</span> },
    { key: 'completed_tasks',  title: 'Done',    render: (p: ProjectStat) => <span className="badge badge-done">{p.completed_tasks}</span> },
    { key: 'rejected_tasks',   title: 'Reject',  render: (p: ProjectStat) => <span className="badge badge-reject">{p.rejected_tasks}</span> },
    { key: 'total_images',     title: 'Ảnh',     render: (p: ProjectStat) => `${p.annotated_images}/${p.total_images}` },
    { key: 'synced_at',        title: 'Sync lúc', render: (p: ProjectStat) => <span className="admin-synced-at">{new Date(p.synced_at).toLocaleString('vi-VN')}</span> },
  ];

  return (
    <div className="admin-dashboard-page animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-left">
          <LayoutDashboard size={24} />
          <div>
            <h1>Admin Dashboard</h1>
            <p>Tổng quan hệ thống — đồng bộ từ NiFi mỗi 5 phút</p>
          </div>
        </div>
        <button className="btn btn-secondary btn-icon-text" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Làm mới
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* Stat Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <FolderOpen size={20} className="stat-icon" />
          <span className="stat-label">Tổng Projects</span>
          <h3 className="stat-value">{loading ? '—' : (overview?.total_projects ?? 0)}</h3>
        </div>
        <div className="stat-card">
          <ListTodo size={20} className="stat-icon" />
          <span className="stat-label">Tổng Tasks</span>
          <h3 className="stat-value">{loading ? '—' : (overview?.total_tasks ?? 0)}</h3>
        </div>
        <div className="stat-card">
          <Image size={20} className="stat-icon" />
          <span className="stat-label">Tổng Ảnh</span>
          <h3 className="stat-value">{loading ? '—' : (overview?.total_images ?? 0)}</h3>
        </div>
      </div>

      {!loading && projects.length > 0 && (
        <>
          {/* Charts Row */}
          <div className="charts-row">
            {/* Pie Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Phân bố trạng thái Tasks</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Tasks theo Project</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Pending"     fill="#f59e0b" radius={[3,3,0,0]} />
                  <Bar dataKey="Đang làm"   fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="Hoàn thành" fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="Từ chối"    fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="chart-card chart-card-full">
            <h2 className="chart-title">Tiến độ hoàn thành theo Project (%)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="Hoàn thành (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Ảnh đã gán (%)"  stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Table */}
      <div className="admin-table-section">
        <div className="admin-table-header">
          <h2>Chi tiết theo Project</h2>
          {overview?.synced_at && (
            <span className="admin-last-sync">Cập nhật: {new Date(overview.synced_at).toLocaleString('vi-VN')}</span>
          )}
        </div>
        {loading ? (
          <div className="admin-loading">Đang tải dữ liệu...</div>
        ) : projects.length === 0 ? (
          <div className="admin-empty">Chưa có dữ liệu. NiFi sẽ đồng bộ sau mỗi 5 phút.</div>
        ) : (
          <DataTable data={projects} columns={columns} keyExtractor={(p) => p.project_id} pageSize={10} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
