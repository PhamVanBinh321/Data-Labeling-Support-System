import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      // Simulate API call to backend
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitted(true);
      toast.success('Đã gửi liên kết xác nhận vào email của bạn!');
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-header">
        <h1>Quên mật khẩu?</h1>
        <p>Nhập email của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.</p>
      </div>

      {!submitted ? (
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

          <button type="submit" className="btn btn-primary auth-btn" disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi liên kết xác nhận'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Mail size={32} color="#16a34a" />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Kiểm tra email của bạn</h3>
          <p style={{ color: '#64748b' }}>Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến <strong>{email}</strong></p>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} />
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
