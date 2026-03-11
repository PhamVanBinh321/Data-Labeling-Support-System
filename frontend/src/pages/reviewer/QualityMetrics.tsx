import React, { useMemo } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Users, BarChart2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DataTable from '../../components/common/DataTable';
import './QualityMetrics.css';

interface AnnotatorStats {
  id: string;
  name: string;
  totalSubmitted: number;
  approved: number;
  rejected: number;
  approvalRate: number;
}

const QualityMetrics: React.FC = () => {
  const { tasks, users } = useData();

  // Calculate metrics
  const stats = useMemo(() => {
    const reviewedTasks = tasks.filter(t => ['approved', 'rejected', 'completed'].includes(t.status));
    const totalReviewed = reviewedTasks.length;
    const totalApproved = reviewedTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
    const totalRejected = reviewedTasks.filter(t => t.status === 'rejected').length;
    const overallApprovalRate = totalReviewed > 0 ? Math.round((totalApproved / totalReviewed) * 100) : 0;

    const annotatorStatsMap: Record<string, AnnotatorStats> = {};

    users.filter(u => u.role === 'annotator').forEach(u => {
      annotatorStatsMap[u.id] = {
        id: u.id,
        name: u.name,
        totalSubmitted: 0,
        approved: 0,
        rejected: 0,
        approvalRate: 0
      };
    });

    reviewedTasks.forEach(t => {
      const st = annotatorStatsMap[t.annotatorId];
      if (st) {
        st.totalSubmitted += 1;
        if (t.status === 'approved' || t.status === 'completed') st.approved += 1;
        if (t.status === 'rejected') st.rejected += 1;
      }
    });

    const annotatorStatsArray = Object.values(annotatorStatsMap).map(st => {
      st.approvalRate = st.totalSubmitted > 0 ? Math.round((st.approved / st.totalSubmitted) * 100) : 0;
      return st;
    }).sort((a, b) => b.totalSubmitted - a.totalSubmitted);

    return { totalReviewed, totalApproved, totalRejected, overallApprovalRate, annotatorStatsArray };
  }, [tasks, users]);

  const columns = [
    {
      key: 'name',
      title: 'Annotator',
      render: (item: AnnotatorStats) => <strong>{item.name}</strong>
    },
    {
      key: 'totalSubmitted',
      title: 'Đã nộp (Đã duyệt)'
    },
    {
      key: 'approved',
      title: 'Đạt (Pass)',
      render: (item: AnnotatorStats) => <span className="text-green">{item.approved}</span>
    },
    {
      key: 'rejected',
      title: 'Chưa đạt (Fail)',
      render: (item: AnnotatorStats) => <span className="text-red">{item.rejected}</span>
    },
    {
      key: 'approvalRate',
      title: 'Tỉ lệ Đạt',
      render: (item: AnnotatorStats) => (
        <div className="metrics-progress-cell">
          <span className={`rate-text ${item.approvalRate >= 90 ? 'text-green' : (item.approvalRate >= 70 ? 'text-orange' : 'text-red')}`}>
            {item.approvalRate}%
          </span>
          <div className="metrics-bar-bg">
            <div 
              className={`metrics-bar-fill ${item.approvalRate >= 90 ? 'bg-green' : (item.approvalRate >= 70 ? 'bg-orange' : 'bg-red')}`} 
              style={{ width: `${item.approvalRate}%` }} 
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="quality-metrics-page animate-fade-in">
      <div className="qm-header">
        <h1><ShieldCheck size={24} className="qm-icon" /> Quality Metrics</h1>
        <p>Thống kê chất lượng gán nhãn và hiệu suất của Annotators.</p>
      </div>

      <div className="stats-row mb-2rem">
        <div className="stat-card">
          <span className="stat-label"><CheckCircle size={16} /> Tỉ lệ Đạt Tổng Hệ Thống</span>
          <h3 className={`stat-value ${stats.overallApprovalRate >= 90 ? 'text-green' : 'text-orange'}`}>
            {stats.overallApprovalRate}%
          </h3>
        </div>
        <div className="stat-card">
          <span className="stat-label"><BarChart2 size={16} /> Tổng Task Đã Review</span>
          <h3 className="stat-value">{stats.totalReviewed}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label"><XCircle size={16} /> Tổng Số Lần Từ Chối</span>
          <h3 className="stat-value text-red">{stats.totalRejected}</h3>
        </div>
      </div>

      <div className="qm-section">
        <div className="section-header">
          <h2><Users size={18} /> Hiệu suất theo Annotator</h2>
        </div>
        
        {stats.annotatorStatsArray.length > 0 ? (
          <div className="table-wrapper">
            <DataTable<AnnotatorStats> 
              data={stats.annotatorStatsArray} 
              columns={columns} 
              keyExtractor={(item) => item.id}
            />
          </div>
        ) : (
          <div className="empty-state">
            <p>Chưa có dữ liệu đánh giá nào.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default QualityMetrics;
