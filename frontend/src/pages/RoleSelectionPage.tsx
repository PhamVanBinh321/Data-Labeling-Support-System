import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import { Briefcase, PenTool, ClipboardCheck, AlertCircle } from 'lucide-react';
import './RoleSelectionPage.css';

const RoleSelectionPage: React.FC = () => {
  const { activeRole, setRole } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [showModal, setShowModal] = useState(false);

  // Guard: if user already has a role tied to account, redirect them to dashboard
  useEffect(() => {
    if (activeRole) {
      navigate(`/${activeRole}`);
    }
  }, [activeRole, navigate]);

  const handleRoleClick = (role: Role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  const confirmRoleSelection = async () => {
    if (selectedRole) {
      try {
        await setRole(selectedRole);
      } catch {
        // Role đã được set hoặc lỗi — vẫn navigate theo role đã chọn
      }
      navigate(`/${selectedRole}`);
    }
  };

  const roles = [
    {
      id: 'manager' as Role,
      title: 'Manager',
      description: 'Quản lý dự án, import dữ liệu và phân công người gán nhãn.',
      icon: <Briefcase size={40} className="role-icon-svg text-blue" />,
      colorClass: 'role-blue'
    },
    {
      id: 'annotator' as Role,
      title: 'Annotator',
      description: 'Nhận task, thực hiện gán nhãn dữ liệu theo hướng dẫn.',
      icon: <PenTool size={40} className="role-icon-svg text-orange" />,
      colorClass: 'role-orange'
    },
    {
      id: 'reviewer' as Role,
      title: 'Reviewer',
      description: 'Kiểm tra chất lượng nhãn, phê duyệt hoặc yêu cầu làm lại.',
      icon: <ClipboardCheck size={40} className="role-icon-svg text-green" />,
      colorClass: 'role-green'
    }
  ];

  return (
    <div className="role-selection-viewport">
      <div className="role-selection-container">
        <div className="role-header text-center">
          <div className="logo-center">
            <div className="logo-icon"></div>
            <span className="logo-text">AnnotatePro</span>
          </div>
          <h1>Chọn không gian làm việc</h1>
          <p>Tài khoản của bạn có quyền truy cập vào nhiều không gian làm việc khác nhau.</p>
        </div>

        <div className="role-cards">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className={`role-card ${role.colorClass}`}
              onClick={() => handleRoleClick(role.id)}
            >
              <div className="role-icon-wrapper">
                {role.icon}
              </div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <button className="btn role-btn">Chọn vai trò này</button>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-icon">
              <AlertCircle size={32} color="#f97316" />
            </div>
            <h2>Xác nhận vai trò</h2>
            <p>
              Bạn đang chọn gắn liền vai trò <strong>{roles.find(r => r.id === selectedRole)?.title}</strong> cho tài khoản này. 
              Sự lựa chọn này là <strong>cố định vĩnh viễn</strong>. Bạn sẽ không thể thay đổi vai trò sau khi xác nhận.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy bỏ</button>
              <button className="btn btn-primary" onClick={confirmRoleSelection}>Đồng ý và Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelectionPage;
