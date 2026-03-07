import React from 'react';
import { AlertTriangle, X, ShieldCheck, Check } from 'lucide-react';
import './ChallengesSolutions.css';

const ChallengesSolutions: React.FC = () => {
  return (
    <section className="section bg-gray" id="solutions">
      <div className="container">
        <div className="section-header text-center">
          <h2>Vượt qua rào cản gán nhãn truyền thống</h2>
          <p className="subtitle">Từ gán nhãn thủ công tốn kém sang quy trình tự động hóa thông minh.</p>
        </div>

        <div className="comparison-cards">
          {/* Challenge Card */}
          <div className="card challenge-card">
            <div className="icon-wrapper challenge-icon">
              <AlertTriangle size={24} color="var(--danger-red)" />
            </div>
            <h3>Thách thức thủ công</h3>
            <ul className="comparison-list">
              <li>
                <X size={18} color="var(--danger-red)" />
                <span>Tốn hàng ngàn giờ làm việc thủ công</span>
              </li>
              <li>
                <X size={18} color="var(--danger-red)" />
                <span>Tỷ lệ sai sót cao ảnh hưởng đến Model</span>
              </li>
              <li>
                <X size={18} color="var(--danger-red)" />
                <span>Khó theo dõi tiến độ và hiệu suất</span>
              </li>
            </ul>
          </div>

          {/* Solution Card */}
          <div className="card solution-card">
            <div className="icon-wrapper solution-icon">
              <ShieldCheck size={24} color="var(--success-orange)" />
            </div>
            <h3 className="text-orange">Giải pháp AnnotatePro</h3>
            <ul className="comparison-list">
              <li>
                <Check size={18} color="var(--success-orange)" strokeWidth={3} />
                <span>Tự động hóa 70% quy trình gán nhãn</span>
              </li>
              <li>
                <Check size={18} color="var(--success-orange)" strokeWidth={3} />
                <span>Kiểm soát chất lượng QA/QC đa lớp</span>
              </li>
              <li>
                <Check size={18} color="var(--success-orange)" strokeWidth={3} />
                <span>Dashboard quản lý thời gian thực (Real-time)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChallengesSolutions;
