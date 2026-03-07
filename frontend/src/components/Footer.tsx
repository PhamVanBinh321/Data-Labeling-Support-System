import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-left">
          <div className="logo footer-logo">
            <div className="logo-icon"></div>
            <span className="logo-text">AnnotatePro</span>
          </div>
        </div>
        
        <div className="footer-links">
          <a href="#">Điều khoản</a>
          <a href="#">Bảo mật</a>
          <a href="#">Liên hệ</a>
        </div>

        <div className="footer-right">
          <p className="copyright">© 2024 AnnotatePro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
