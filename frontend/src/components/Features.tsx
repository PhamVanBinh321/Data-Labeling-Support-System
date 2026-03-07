import React from 'react';
import { Users, PenTool, ClipboardCheck, ArrowDownToLine, ArrowRight } from 'lucide-react';
import './Features.css';

const Features: React.FC = () => {
  const features = [
    {
      icon: <Users size={24} color="#f97316" />,
      iconBg: '#fff7ed',
      title: 'Project Manager',
      desc: 'Quản lý dự án đa dụng, phân quyền nhân sự và thiết lập trường gán chi tiết.'
    },
    {
      icon: <PenTool size={24} color="#a855f7" />,
      iconBg: '#faf5ff',
      title: 'Smart Annotator',
      desc: 'Bộ công cụ trực quan: Bounding box, Polygon, Keypoint và Semantic segmentation.'
    },
    {
      icon: <ClipboardCheck size={24} color="#22c55e" />,
      iconBg: '#f0fdf4',
      title: 'QC Reviewer',
      desc: 'Quy trình phê duyệt nghiêm ngặt, phản hồi lỗi trực tiếp trên từng label.'
    },
    {
      icon: <ArrowDownToLine size={24} color="#f97316" />,
      iconBg: '#fff7ed',
      title: 'Multi-Format Export',
      desc: 'Xuất dữ liệu linh hoạt sang JSON, XML, COCO, YOLO phù hợp với mọi framework AI.'
    }
  ];

  return (
    <section className="section features-section" id="features">
      <div className="container">
        <div className="features-header">
          <div>
            <h2>Tính năng đột phá</h2>
            <p className="subtitle">Mọi thứ bạn cần để xây dựng bộ dữ liệu hoàn hảo cho AI.</p>
          </div>
          <a href="#all-features" className="explore-link">
            Khám phá tất cả <ArrowRight size={18} />
          </a>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div 
                className="feature-icon" 
                style={{ backgroundColor: feature.iconBg }}
              >
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
