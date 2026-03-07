import React from 'react';
import './Workflow.css';

const Workflow: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: 'Import Dữ liệu',
      desc: 'Tải lên hình ảnh, video, audio hoặc văn bản qua Cloud hoặc API.'
    },
    {
      number: 2,
      title: 'Phân công & Gán nhãn',
      desc: 'Phân chia task cho Annotator dựa trên kỹ năng và khối lượng công việc.'
    },
    {
      number: 3,
      title: 'Kiểm duyệt Quality',
      desc: 'Reviewer kiểm tra và phê duyệt nhãn. Đảm bảo độ chính xác >99%.'
    },
    {
      number: 4,
      title: 'Export Model-Ready',
      desc: 'Tải về dữ liệu sạch đã gán nhãn, sẵn sàng đưa vào huấn luyện AI.'
    }
  ];

  return (
    <section className="section bg-gray workflow-section">
      <div className="container">
        <div className="section-header text-center">
          <h2>Quy trình làm việc (Workflow)</h2>
          <p className="subtitle">Tối ưu hóa từ bước nhập liệu đến khi sẵn sàng cho Model Training.</p>
        </div>

        <div className="workflow-steps">
          {steps.map((step, index) => (
            <div className="workflow-step" key={index}>
              <div className="step-number-container">
                <div className="step-number">{step.number}</div>
                {index < steps.length - 1 && <div className="step-connector"></div>}
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Workflow;
