import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/role-selection');
    } catch {
      toast.error('Đăng ký thất bại. Email có thể đã được sử dụng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-header">
        <h1>Tạo tài khoản</h1>
        <p>Bắt đầu dự án gán nhãn dữ liệu của bạn ngay hôm nay.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Họ và tên</label>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <User size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
            <input 
              type="text" 
              id="name" 
              className="form-control" 
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email công việc</label>
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
          <label htmlFor="password">Mật khẩu</label>
          <div className="input-with-icon" style={{ position: 'relative' }}>
            <Lock size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
            <input 
              type="password" 
              id="password" 
              className="form-control" 
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required 
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary auth-btn" disabled={submitting}>
          {submitting ? 'Đang đăng ký...' : 'Tạo tài khoản miễn phí'}
        </button>
      </form>



      <p className="auth-footer">
        Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
