import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Eye, Mail } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { projectsApi } from '../../api/projects';
import './ReviewerQueue.css';

type Invitation = {
  id: number;
  project_id: number;
  project_name: string;
  project_type: string;
  role: string;
  invited_at: string;
};

interface ReviewTask {
  id: string;
  projectName: string;
  annotatorName: string;
  submittedAt: string;
  imagesCount: number;
  status: StatusType;
}

const ReviewerQueue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, getProjectById, getUserById, updateTaskStatus } = useData();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  useEffect(() => {
    projectsApi.myInvitations()
      .then(data => setInvitations(data ?? []))
      .catch(() => {});
  }, []);

  const handleRespond = async (inv: Invitation, action: 'active' | 'declined') => {
    setRespondingId(inv.id);
    try {
      await projectsApi.updateMemberStatus(inv.project_id, inv.id, action);
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      toast.success(action === 'active' ? `Đã tham gia dự án "${inv.project_name}"!` : 'Đã từ chối lời mời.');
    } catch {
      toast.error('Thao tác thất bại, thử lại.');
    } finally {
      setRespondingId(null);
    }
  };

  const allReviewTasks: ReviewTask[] = tasks
    .filter(t => ['in-review', 'approved', 'rejected', 'completed'].includes(t.status))
    .map(t => ({
      id: t.id,
      projectName: getProjectById(t.projectId)?.name || 'Unknown',
      annotatorName: getUserById(t.annotatorId)?.name || 'Unknown',
      submittedAt: t.submittedAt || 'N/A',
      imagesCount: t.totalImages,
      status: t.status as StatusType
    }));

  let filteredTasks = filterStatus === 'all' 
    ? allReviewTasks 
    : allReviewTasks.filter(t => t.status === filterStatus);
    
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => 
      t.projectName.toLowerCase().includes(q) || 
      t.annotatorName.toLowerCase().includes(q)
    );
  }

  const handleRowClick = (task: ReviewTask) => {
    navigate(`/workspace/${task.id}?mode=reviewer`);
  };

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus(id, 'approved');
    toast.success(`✅ Đã phê duyệt Task #${id}`);
  };

  const handleReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus(id, 'rejected', 'Bị từ chối nhanh từ Queue');
    toast.error(`❌ Đã từ chối Task #${id}`);
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
      render: (item: ReviewTask) => <span>{item.imagesCount} ảnh</span>
    },
    { 
      key: 'submittedAt', 
      title: 'Thời gian nộp' 
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
                onClick={(e) => handleApprove(item.id, e)}
              >
                <CheckCircle size={16} />
              </button>
              <button 
                className="btn btn-sm btn-outline-red" 
                title="Từ chối nhanh"
                onClick={(e) => handleReject(item.id, e)}
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
              title="Xem lại"
              onClick={(e) => { e.stopPropagation(); handleRowClick(item); }}
            >
              <Eye size={16} /> Xem
            </button>
          )}
        </div>
      )
    }
  ];

  const inReviewCount = allReviewTasks.filter(t => t.status === 'in-review').length;
  const approvedCount = allReviewTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
  const rejectedCount = allReviewTasks.filter(t => t.status === 'rejected').length;

  return (
    <div className="reviewer-queue-page animate-fade-in">
      <div className="page-header-actions">
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '6px 12px',
            fontSize: '0.85rem', color: '#475569',
          }}>
            <span style={{ fontWeight: 500 }}>Reviewer ID:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>{user.id}</span>
          </div>
        )}
        <div className="search-filter-group">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm kiếm dự án, người gán nhãn..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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

      {invitations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {invitations.map(inv => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
            }}>
              <Mail size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9rem' }}>Lời mời tham gia dự án</strong>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                  <strong>{inv.project_name}</strong> · Role: <strong style={{ textTransform: 'capitalize' }}>{inv.role}</strong>
                </div>
              </div>
              <button className="btn btn-sm btn-primary" disabled={respondingId === inv.id}
                onClick={() => handleRespond(inv, 'active')}>Chấp nhận</button>
              <button className="btn btn-sm btn-secondary" disabled={respondingId === inv.id}
                onClick={() => handleRespond(inv, 'declined')}>Từ chối</button>
            </div>
          ))}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Cần duyệt ngay</span>
          <h3 className="stat-value text-purple">{inReviewCount}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã duyệt (Tổng)</span>
          <h3 className="stat-value text-green">{approvedCount}</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã từ chối (Tổng)</span>
          <h3 className="stat-value text-red">{rejectedCount}</h3>
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
