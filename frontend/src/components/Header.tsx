import React from 'react';
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
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="header-actions">
          <button className="btn btn-text">Login</button>
          <button className="btn btn-primary">Dùng thử miễn phí</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
