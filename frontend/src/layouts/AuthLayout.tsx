import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-logo">
          <Link to="/" className="logo">
            <div className="logo-icon"></div>
            <span className="logo-text">AnnotatePro</span>
          </Link>
        </div>
        <div className="auth-content">
          <Outlet />
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-right-content">
          <h2>Tăng tốc quy trình<br />gán nhãn dữ liệu của bạn</h2>
          <p>Tham gia cùng hàng ngàn chuyên gia AI để tối ưu hóa việc tạo dữ liệu huấn luyện.</p>
          
          <div className="auth-demo-image">
            <div className="demo-box"></div>
            <div className="demo-circles">
              <span className="demo-circle"></span>
              <span className="demo-circle"></span>
              <span className="demo-circle"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
