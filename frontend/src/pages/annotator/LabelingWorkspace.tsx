import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactPictureAnnotation } from 'react-picture-annotation';
import { ArrowLeft, Save, MousePointer2, Square, Tag } from 'lucide-react';
import './LabelingWorkspace.css';
import toast from 'react-hot-toast';

// Mock data
const mockTasks: Record<string, any> = {
  '1': { id: '1', projectName: 'Nhận diện biển số xe VN', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200&h=800' }
};

interface Label {
  id: string;
  name: string;
  color: string;
}

const predefinedLabels: Label[] = [
  { id: 'car', name: 'Car', color: '#ef4444' },
  { id: 'plate', name: 'License Plate', color: '#3b82f6' },
  { id: 'person', name: 'Person', color: '#10b981' },
];

const LabelingWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const task = taskId ? mockTasks[taskId] || mockTasks['1'] : mockTasks['1'];

  // Dimensions for canvas
  const [pageSize, setPageSize] = useState({
    width: 800,
    height: 600
  });

  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeLabel, setActiveLabel] = useState<Label>(predefinedLabels[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Measure center container to dynamically resize canvas
  useEffect(() => {
    const container = document.getElementById('canvas-container');
    if (container) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setPageSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const onSelect = (selectedId: string | null) => {
    setSelectedId(selectedId);
  };

  const onChange = (data: any[]) => {
    // When a new annotation is created, we can forcibly map its comment to the active label
    // react-picture-annotation stores data like [{ id, mark: { x, y, width, height }, comment: "..." }]
    setAnnotations(data);
  };

  const handleSubmit = () => {
    console.log('Submitted annotations:', annotations);
    toast.success('✅ Đã nộp thành công! Task chuyển sang trạng thái In-Review.');
    setTimeout(() => navigate('/annotator/tasks'), 1500);
  };

  // Helper function to extract bounding boxes for the right sidebar
  const renderInstances = () => {
    if (annotations.length === 0) {
      return <div className="empty-instances">Chưa có bounding box nào được vẽ.</div>;
    }

    return (
      <ul className="instance-list">
        {annotations.map((ann, idx) => (
          <li key={ann.id || idx} className={`instance-item ${selectedId === ann.id ? 'active' : ''}`}>
             <div className="instance-color" style={{ backgroundColor: activeLabel.color }}></div> {/* In reality, match color by mapping comment string to label color */}
             <span className="instance-name">{ann.comment || `Box ${idx + 1}`}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="workspace-layout">
      {/* Topbar */}
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="task-meta">
            <h2>{task.projectName}</h2>
            <span>Task ID: {task.id} • Image 1/150</span>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Save size={18} />
            <span>Nộp (Submit)</span>
          </button>
        </div>
      </header>

      <div className="workspace-main">
        {/* Left Toolbar */}
        <aside className="workspace-toolbar">
          <div className="tool-group">
            <button className="tool-btn active" title="Bounding Box">
              <Square size={22} />
            </button>
            <button className="tool-btn" title="Lựa chọn (Chưa hỗ trợ)">
              <MousePointer2 size={22} />
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <div className="workspace-canvas" id="canvas-container">
          <ReactPictureAnnotation
            image={task.image}
            onSelect={onSelect}
            onChange={onChange}
            width={pageSize.width}
            height={pageSize.height}
            annotationData={annotations}
            defaultAnnotationSize={[]}
          />
        </div>

        {/* Right Sidebar */}
        <aside className="workspace-sidebar">
          {/* Labels Section */}
          <div className="sidebar-section">
            <div className="section-header">
              <Tag size={16} />
              <h3>Nhãn (Labels)</h3>
            </div>
            <div className="labels-list">
              {predefinedLabels.map(label => (
                <div 
                  key={label.id} 
                  className={`label-item ${activeLabel.id === label.id ? 'active' : ''}`}
                  onClick={() => setActiveLabel(label)}
                >
                  <span className="label-color" style={{ backgroundColor: label.color }}></span>
                  <span className="label-name">{label.name}</span>
                </div>
              ))}
            </div>
            <p className="helper-text text-orange" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Hãy gõ tên nhãn (ví dụ: {activeLabel.name}) vào ô text khi vẽ xong Box.
            </p>
          </div>

          {/* Instances Section */}
          <div className="sidebar-section instances-section">
            <div className="section-header">
              <h3>Đối tượng đã gắn (Instances)</h3>
              <span className="badge">{annotations.length}</span>
            </div>
            <div className="instances-content">
              {renderInstances()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LabelingWorkspace;
