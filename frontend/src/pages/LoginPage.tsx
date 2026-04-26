import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      const savedRole = localStorage.getItem('annotate_pro_role');
      if (savedRole) {
        navigate(`/${savedRole}`);
      } else {
        navigate('/role-selection');
      }
    } catch {
      toast.error('Email hoặc mật khẩu không đúng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-header">
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để tiếp tục quản lý dự án gán nhãn của bạn.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <Mail size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
            <input 
              type="email" 
              id="email" 
              className="form-control" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="password">Mật khẩu</label>
            <a href="#" className="auth-link" style={{ fontSize: '0.875rem' }}>Quên mật khẩu?</a>
          </div>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <Lock size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
            <input 
              type="password" 
              id="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required 
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary auth-btn" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>



      <p className="auth-footer">
        Chưa có tài khoản? <Link to="/register" className="auth-link">Đăng ký ngay</Link>
      </p>
    </div>
  );
};

export default LoginPage;
