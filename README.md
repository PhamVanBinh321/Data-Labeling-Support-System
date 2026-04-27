<div align="center">
  <h1>🏷️ Data Labeling Support System 🏷️</h1>
  <p><i>Hệ thống quản lý và hỗ trợ gán nhãn dữ liệu (Data Labeling) dựa trên kiến trúc Microservices</i></p>
</div>

---

## 🌟 Mô tả dự án

**Data Labeling Support System** là một nền tảng chuyên dụng được thiết kế nhằm hỗ trợ quy trình gán nhãn dữ liệu (đặc biệt là dữ liệu hình ảnh) cho việc huấn luyện các mô hình Trí Tuệ Nhân Tạo (AI) và Machine Learning. Hệ thống cho phép các quản trị viên quản lý dự án gán nhãn, chia tác vụ, theo dõi tiến độ một cách trực quan, đồng thời cung cấp công cụ tương tác trực tiếp giúp các _Labelers_ thực hiện công việc dán nhãn (bounding box) một cách dễ dàng và hiệu quả.

Dự án được xây dựng trên nền tảng **Microservices** để đảm bảo khả năng mở rộng, hiệu năng cao và dễ dàng bảo trì.

## 🚀 Tính năng chính (Features)

Hệ thống được chia thành nhiều service chuyên biệt giải quyết các chức năng sau:

- 🔐 **Quản lý Định danh & Phân quyền (Auth Service):** Đăng ký, đăng nhập an toàn với JWT, hỗ trợ phân quyền người dùng (Admin, Project Manager, Labeler).
- 📁 **Quản lý Dự án (Project Service):** Tạo và cấu hình dự án mới, định nghĩa tập nhãn (label sets), quản lý và mời thành viên tham gia vào dự án.
- 📋 **Quản lý Tác vụ (Task Service):** Phân chia hình ảnh hoặc dữ liệu thô thành các task nhỏ, giao nhiệm vụ cho người gán nhãn và theo dõi trạng thái (_To Do, In Progress, Reviewing, Completed_).
- 🖼️ **Công cụ Gán nhãn (Annotation Service):** Tích hợp công cụ vẽ bounding box trực quan ngay trên trình duyệt, lưu trữ và xuất dữ liệu gán nhãn dưới các định dạng chuẩn hóa.
- 🔔 **Thông báo Thời gian thực (Notification Service):** Gửi thông báo (Firebase) cho người dùng khi có task mới được giao hoặc trạng thái dự án thay đổi.
- 📊 **Dashboard & Báo cáo:** Cung cấp các biểu đồ thống kê về tiến độ dự án, số lượng task hoàn thành nhờ tích hợp `recharts`.

## 💻 Tech Stack

Dự án sử dụng các công nghệ hiện đại và phổ biến nhất:

### Frontend

- **Framework:** React 19, Vite, TypeScript
- **Routing:** React Router v7
- **Styling & UI:** Lucide React (Icons)
- **Data Visualization:** Recharts
- **Annotation Tool:** React Picture Annotation
- **Other utilities:** Axios (Data Fetching), Firebase (Push Notifications), React Hot Toast

### Backend (Microservices)

- **Core Framework:** Python 3, Django 5, Django REST Framework (DRF)
- **Database:** PostgreSQL (Lưu trữ dữ liệu quan hệ với từng DB riêng cho mỗi service)
- **Caching & Caching-based Auth:** Redis
- **Security:** DRF SimpleJWT (Token-Based Auth)
- **API Documentation:** DRF Spectacular (Swagger UI)

### DevOps & Infrastructure

- **Containerization:** Docker & Docker Compose
- **API Gateway / Reverse Proxy:** Nginx
- **Data Flow / Pipeline:** Apache NiFi

## 📂 Cấu trúc thư mục (Folder Structure)

```text
Data-Labeling-Support-System
├── backend/                       # Backend (Microservices)
│   ├── admin-service/             # Dịch vụ quản trị (Admin)
│   ├── annotation-service/        # Dịch vụ xử lý gán nhãn
│   ├── auth-service/              # Dịch vụ xác thực người dùng
│   ├── notification-service/      # Dịch vụ thông báo
│   ├── project-service/           # Dịch vụ quản lý dự án
│   ├── task-service/              # Dịch vụ quản lý tác vụ
│   ├── nginx/                     # Cấu hình API Gateway
│   ├── nifi/                      # Cấu hình data pipeline
│   ├── docker-compose.yml         # Dev/Prod services orchestration
│   └── .env.example               # Biến môi trường mẫu
├── frontend/                      # User Interface
│   ├── public/                    # Tài nguyên tĩnh
│   ├── src/                       # Mã nguồn Frontend (React components, hooks, vv)
│   ├── package.json               # Quản lý dependencies
│   ├── vite.config.ts             # Cấu hình build Vite
├── DATABASE_SCHEMA.md             # Tài liệu thiết kế CSDL
└── README.md                      # Tài liệu dự án
```

## 🛠️ Hướng dẫn cài đặt (Getting Started)

### Yêu cầu tiên quyết (Prerequisites)

Để chạy được hệ thống trên môi trường local, máy tính của bạn cần cài đặt:

- **Node.js**: Phiên bản v18.0.0 hoặc cao hơn.
- **Docker & Docker Compose**: Để thiết lập nhanh chóng cụm Backend Microservices và Database.

### 1. Clone repository

Mở terminal và chạy lệnh sau để tải source code về máy:

```bash
git clone https://github.com/your-username/Data-Labeling-Support-System.git
cd Data-Labeling-Support-System
```

### 2. Thiết lập Backend & Databases (Sử dụng Docker)

Đi vào thư mục backend và tạo file biến môi trường từ file mẫu:

```bash
cd backend
cp .env.example .env
```

_(Lưu ý: Mở file `.env` để kiểm tra và tùy chỉnh các thông số cấu hình cơ sở dữ liệu hoặc JWT Secret Key nếu cần thiết. Một số biến cần thiết như `DATABASE_URL`, `SECRET_KEY`, `AUTH_SERVICE_URL` đã được định nghĩa sẵn trong file `.env.example`)._

Khởi động toàn bộ cụm Microservices, PostgresDB, Redis và Nginx:

```bash
docker-compose up -d --build
```

Dịch vụ Backend (API Gateway) sẽ tự động chạy thông qua Nginx.

### 3. Thiết lập Frontend

Mở một cửa sổ terminal mới (hoặc tab mới), di chuyển vào thư mục frontend:

```bash
cd ../frontend
```

Cài đặt các gói thư viện (dependencies):

```bash
npm install
```

Khởi chạy Frontend server ở chế độ phát triển:

```bash
npm run dev
```

Truy cập ứng dụng ở địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trên terminal).

## 🔌 API Reference

Hệ thống cung cấp một loạt các RESTful API phân bổ trên các microservices. Dưới đây là từ 5-7 endpoints quan trọng nhất giúp giao tiếp giữa Frontend và Backend.

| Method   | Endpoint                                   | Phân quyền | Mô tả chức năng                                           |
| :------- | :----------------------------------------- | :--------- | :-------------------------------------------------------- |
| **POST** | `/api/auth/login/`                         | Public     | Xác thực người dùng, trả về Access/Refresh Token (JWT).   |
| **POST** | `/api/auth/register/`                      | Public     | Đăng ký tài khoản hệ thống mới.                           |
| **GET**  | `/api/auth/me/`                            | Auth       | Lấy thông tin chi tiết (profile) của người dùng hiện tại. |
| **GET**  | `/api/projects/`                           | Auth       | Lấy danh sách các dự án cấu hình mà người dùng tham gia.  |
| **POST** | `/api/projects/`                           | Admin/PM   | Tạo dự án gán nhãn dữ liệu mới.                           |
| **POST** | `/api/projects/{id}/labels/`               | Admin/PM   | Thêm mới một nhãn (Label) cụ thể cho dự án tương ứng.     |
| **GET**  | `/api/projects/{id}/members/{mid}/status/` | Auth       | Lấy nội dung trạng thái của thành viên trong dự án.       |

_(Để xem danh sách đầy đủ tất cả các APIs cho từng Service, vui lòng truy cập đường dẫn swagger cục bộ của hệ thống sau khi chạy Docker - Ví dụ: `http://localhost:8001/api/docs/` đối với Auth Service)._
