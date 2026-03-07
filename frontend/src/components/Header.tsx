import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo">
          <div className="logo-icon"></div>
          <span className="logo-text">AnnotatePro</span>
        </div>
        
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#solutions">Solutions</a>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn btn-text">Đăng nhập</Link>
          <Link to="/register" className="btn btn-primary">Đăng ký</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
