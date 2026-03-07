import React from 'react';
import './CTA.css';

const CTA: React.FC = () => {
  return (
    <section className="section cta-section">
      <div className="container">
        <div className="cta-box">
          <h2>Bắt đầu dự án gán nhãn của bạn<br/>ngay hôm nay</h2>
          <p>
            Tham gia cùng hơn 500+ doanh nghiệp đang sử dụng AnnotatePro để tạo ra các mô hình AI chất lượng cao nhanh gấp 3 lần.
          </p>
          <div className="cta-actions">
            <button className="btn cta-btn-primary">Đăng ký ngay</button>
            <button className="btn cta-btn-outline">Liên hệ tư vấn</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
