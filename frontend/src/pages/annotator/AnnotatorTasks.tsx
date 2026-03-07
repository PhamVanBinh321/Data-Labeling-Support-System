import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, AlertTriangle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import type { StatusType } from '../../components/common/StatusBadge';
import './AnnotatorTasks.css';

// Mock Data structure for Annotator Tasks
interface AnnotatorTask {
  id: string;
  projectName: string;
  taskId: string;
  type: string;
  imagesCount: number;
  completedImages: number;
  status: StatusType;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
}

const mockTasks: AnnotatorTask[] = [
  { id: '1', projectName: 'Nhận diện biển số xe VN', taskId: 'TASK-1001', type: 'Bounding Box', imagesCount: 150, completedImages: 45, status: 'in-progress', deadline: '2023-11-20', priority: 'High' },
  { id: '2', projectName: 'Dự án Y tế - Đoán khối u MRI', taskId: 'TASK-2045', type: 'Segmentation', imagesCount: 50, completedImages: 0, status: 'pending', deadline: '2023-11-22', priority: 'Medium' },
  { id: '3', projectName: 'Phân loại lỗi linh kiện điện tử', taskId: 'TASK-0982', type: 'Classification', imagesCount: 500, completedImages: 500, status: 'completed', deadline: '2023-11-15', priority: 'Low' },
  { id: '4', projectName: 'Gắn nhãn cảm xúc bình luận', taskId: 'TASK-3312', type: 'Text Classification', imagesCount: 1000, completedImages: 1000, status: 'in-review', deadline: '2023-11-18', priority: 'Medium' },
  { id: '5', projectName: 'Nhận diện biển số xe VN', taskId: 'TASK-1005', type: 'Bounding Box', imagesCount: 80, completedImages: 80, status: 'rejected', deadline: '2023-11-19', priority: 'High' },
];

const AnnotatorTasks: React.FC = () => {
  const navigate = useNavigate();

  const handleRowClick = (task: AnnotatorTask) => {
    // Only navigate if the task is actionable (not completed/in-review)
    if (task.status === 'pending' || task.status === 'in-progress' || task.status === 'rejected') {
       navigate(`/workspace/${task.id}`);
    } else {
      console.log('Task is not actionable right now:', task.status);
    }
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'High': return <AlertTriangle size={16} className="text-red" />;
      case 'Medium': return <Clock size={16} className="text-orange" />;
      default: return null;
    }
  };

  const columns = [
    { 
      key: 'taskId', 
      title: 'Mã Task',
      render: (item: AnnotatorTask) => <strong className="task-id-cell">{item.taskId}</strong> 
    },
    { 
      key: 'projectName', 
      title: 'Dự án',
      render: (item: AnnotatorTask) => (
        <div className="project-info-cell">
          <span className="project-name">{item.projectName}</span>
          <span className="task-type">{item.type}</span>
        </div>
      )
    },
    { 
      key: 'progress', 
      title: 'Tiến độ',
      render: (item: AnnotatorTask) => {
        const percent = calculateProgress(item.completedImages, item.imagesCount);
        return (
          <div className="task-progress-cell">
             <div className="progress-numbers">
                <span>{item.completedImages} / {item.imagesCount}</span>
                <span className="progress-percent">{percent}%</span>
             </div>
             <div className="progress-bar-bg-sm">
               <div className="progress-bar-fill-sm" style={{ width: `${percent}%`, backgroundColor: percent === 100 ? '#10b981' : '#f97316' }}></div>
             </div>
          </div>
        );
      }
    },
    { 
      key: 'deadline', 
      title: 'Hạn chót',
      render: (item: AnnotatorTask) => (
        <div className="deadline-cell">
          {getPriorityIcon(item.priority)}
          <span className={item.priority === 'High' ? 'text-red font-medium' : ''}>{item.deadline}</span>
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Trạng thái',
      render: (item: AnnotatorTask) => <StatusBadge status={item.status} />
    },
    {
      key: 'action',
      title: 'Thao tác',
      render: (item: AnnotatorTask) => {
         const isActionable = item.status === 'pending' || item.status === 'in-progress' || item.status === 'rejected';
         return (
           <button 
             className={`btn btn-sm ${isActionable ? 'btn-primary' : 'btn-secondary'}`}
             onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                if (isActionable) handleRowClick(item);
             }}
             disabled={!isActionable}
           >
             {item.status === 'rejected' ? 'Làm lại' : (isActionable ? 'Bắt đầu' : 'Xem')}
           </button>
         );
      }
    }
  ];

  return (
    <div className="annotator-tasks-page animate-fade-in">
      <div className="page-header-actions">
        <div className="search-filter-group">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Tìm kiếm theo mã task, dự án..." />
          </div>
          <button className="btn btn-secondary btn-icon-text">
            <Filter size={18} />
            <span>Bộ lọc</span>
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Task cần làm</span>
          <h3 className="stat-value text-orange">3</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Task bị trả về</span>
          <h3 className="stat-value text-red">1</h3>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đã hoàn thành</span>
          <h3 className="stat-value text-green">1</h3>
        </div>
      </div>

      <div className="table-wrapper">
        <DataTable<AnnotatorTask> 
          data={mockTasks} 
          columns={columns} 
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};

export default AnnotatorTasks;
