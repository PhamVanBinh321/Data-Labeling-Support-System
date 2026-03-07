import React from 'react';
import { Play } from 'lucide-react';
import './Hero.css';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="badge">
            <span className="badge-dot"></span> NEXT-GEN AI LABELING
          </div>
          <h1>
            Hệ thống Quản lý <span className="text-orange">Gán nhãn Dữ liệu</span> thông minh
          </h1>
          <p>
            Tăng tốc huấn luyện AI bằng dữ liệu chính xác và quy trình chuyên nghiệp. Tối ưu hóa hiệu suất và độ chính xác cho mô hình Machine Learning của bạn.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary">Tạo tài khoản</button>
            <button className="btn btn-secondary">
              <Play size={18} fill="currentColor" /> Xem Demo
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="mockup-container">
            {/* Placeholder for the app mockup image from the design */}
            <div className="mockup-placeholder">
              <div className="mockup-sidebar">
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
              </div>
              <div className="mockup-main">
                <div className="mockup-image">
                  <div className="bounding-box"></div>
                  <div className="crosshair"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
