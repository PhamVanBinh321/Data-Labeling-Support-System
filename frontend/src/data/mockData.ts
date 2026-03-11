// ==========================================================
// CENTRALIZED MOCK DATA FOR ANNOTATE PRO (Frontend Dev)
// 1 Manager, 2 Annotators, 1 Reviewer
// ==========================================================

export type UserRole = 'manager' | 'annotator' | 'reviewer';
export type TaskStatus = 'draft' | 'pending' | 'in-progress' | 'in-review' | 'approved' | 'rejected' | 'completed';
export type ProjectType = 'bounding_box' | 'polygon' | 'classification' | 'segmentation' | 'text_classification';

// ---- Users ----
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  tasksCompleted?: number;
  qualityScore?: number;
}

export const MOCK_USERS: User[] = [
  { id: 'usr-001', name: 'Nguyễn Minh Quân', email: 'quan.manager@annotate.pro', avatar: 'MQ', role: 'manager' },
  { id: 'usr-002', name: 'Trần Thị Lan Anh', email: 'lan.annotator@annotate.pro', avatar: 'LA', role: 'annotator', tasksCompleted: 142, qualityScore: 96 },
  { id: 'usr-003', name: 'Lê Hoàng Phúc', email: 'phuc.annotator@annotate.pro', avatar: 'HP', role: 'annotator', tasksCompleted: 89, qualityScore: 91 },
  { id: 'usr-004', name: 'Phạm Thị Thu Hà', email: 'ha.reviewer@annotate.pro', avatar: 'TH', role: 'reviewer', tasksCompleted: 215, qualityScore: 99 },
];

export const MANAGER = MOCK_USERS[0];
export const ANNOTATORS = MOCK_USERS.filter(u => u.role === 'annotator');
export const REVIEWER = MOCK_USERS.find(u => u.role === 'reviewer')!;

// ---- Labels / Ontology ----
export interface LabelDefinition {
  id: string;
  name: string;
  color: string;
  attributes?: { name: string; type: 'text' | 'select'; options?: string[] }[];
}

// ---- Projects ----
export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  typeName: string;
  description: string;
  labels: LabelDefinition[];
  guidelines: string;
  totalImages: number;
  annotatedImages: number;
  approvedImages: number;
  status: 'active' | 'completed' | 'paused' | 'draft';
  createdAt: string;
  updatedAt: string;
  managerId: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'Nhận diện biển số xe VN',
    type: 'bounding_box',
    typeName: 'Bounding Box',
    description: 'Gắn nhãn và nhận diện biển số xe ô tô, xe máy xuất hiện trong hình ảnh từ camera giao thông.',
    labels: [
      { id: 'lbl-01', name: 'Car', color: '#ef4444', attributes: [{ name: 'Color', type: 'select', options: ['Red', 'Blue', 'White', 'Black'] }] },
      { id: 'lbl-02', name: 'License Plate', color: '#3b82f6' },
      { id: 'lbl-03', name: 'Motorbike', color: '#10b981' },
      { id: 'lbl-04', name: 'Truck', color: '#f97316' },
    ],
    guidelines: '1. Vẽ hộp chữ nhật bao quanh toàn bộ xe.\n2. Vẽ riêng hộp nhỏ hơn bao quanh biển số.\n3. Không cắt xén hoặc để thừa viền quá 5px.\n4. Bỏ qua xe bị khuất trên 50% diện tích.',
    totalImages: 5000,
    annotatedImages: 4250,
    approvedImages: 3900,
    status: 'active',
    createdAt: '2023-10-01',
    updatedAt: '2024-03-07',
    managerId: 'usr-001',
  },
  {
    id: 'proj-002',
    name: 'Phân loại cảm xúc bình luận',
    type: 'text_classification',
    typeName: 'Text Classification',
    description: 'Gắn nhãn cảm xúc (tích cực, tiêu cực, trung tính) cho bình luận mạng xã hội tiếng Việt.',
    labels: [
      { id: 'lbl-05', name: 'Tích cực', color: '#10b981' },
      { id: 'lbl-06', name: 'Tiêu cực', color: '#ef4444' },
      { id: 'lbl-07', name: 'Trung tính', color: '#94a3b8' },
    ],
    guidelines: '1. Đọc toàn bộ bình luận trước khi gắn nhãn.\n2. Dựa theo cảm xúc chủ đạo, không phải từng từ.\n3. Khi không chắc, chọn Trung tính.',
    totalImages: 12000,
    annotatedImages: 12000,
    approvedImages: 11800,
    status: 'completed',
    createdAt: '2023-08-15',
    updatedAt: '2024-01-20',
    managerId: 'usr-001',
  },
  {
    id: 'proj-003',
    name: 'Dự án Y tế - Phát hiện khối u',
    type: 'segmentation',
    typeName: 'Segmentation',
    description: 'Phân đoạn và đánh dấu vùng khối u trong ảnh MRI não bộ của bệnh nhân.',
    labels: [
      { id: 'lbl-08', name: 'Tumor', color: '#dc2626' },
      { id: 'lbl-09', name: 'Brain Tissue', color: '#c084fc' },
    ],
    guidelines: '1. Khoanh vùng chính xác đến từng pixel nếu có thể.\n2. Đây là dữ liệu y tế nhạy cảm - không chia sẻ ra ngoài.\n3. Liên hệ bác sĩ phụ trách khi có hình ảnh không rõ ràng.',
    totalImages: 800,
    annotatedImages: 96,
    approvedImages: 0,
    status: 'active',
    createdAt: '2024-02-01',
    updatedAt: '2024-03-07',
    managerId: 'usr-001',
  },
  {
    id: 'proj-004',
    name: 'Theo dõi quỹ đạo người đi bộ',
    type: 'bounding_box',
    typeName: 'Bounding Box',
    description: 'Xác định và vẽ bounding box xung quanh người đi bộ trong video giao thông đô thị.',
    labels: [
      { id: 'lbl-10', name: 'Pedestrian', color: '#f59e0b' },
      { id: 'lbl-11', name: 'Cyclist', color: '#6366f1' },
    ],
    guidelines: '1. Chỉ gắn nhãn người đi bộ và người đi xe đạp.\n2. Box phải bao kín toàn thân kể cả bóng nhẹ.',
    totalImages: 3000,
    annotatedImages: 360,
    approvedImages: 0,
    status: 'draft',
    createdAt: '2024-03-05',
    updatedAt: '2024-03-07',
    managerId: 'usr-001',
  },
];

// ---- Tasks ----
export interface Task {
  id: string;
  projectId: string;
  name: string;
  annotatorId: string;
  reviewerId: string;
  status: TaskStatus;
  totalImages: number;
  completedImages: number;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  submittedAt?: string;
  qualityScore?: number;
  rejectReason?: string;
}

export const MOCK_TASKS: Task[] = [
  { id: 'task-001', projectId: 'proj-001', name: 'Batch 1 - Ảnh đường phố HN', annotatorId: 'usr-002', reviewerId: 'usr-004', status: 'in-progress', totalImages: 500, completedImages: 340, deadline: '2024-03-15', priority: 'High' },
  { id: 'task-002', projectId: 'proj-001', name: 'Batch 2 - Ảnh đường phố HCM', annotatorId: 'usr-003', reviewerId: 'usr-004', status: 'in-review', totalImages: 500, completedImages: 500, deadline: '2024-03-12', priority: 'High', submittedAt: '2024-03-10', qualityScore: 94 },
  { id: 'task-003', projectId: 'proj-001', name: 'Batch 3 - Camera ngã tư', annotatorId: 'usr-002', reviewerId: 'usr-004', status: 'approved', totalImages: 250, completedImages: 250, deadline: '2024-03-08', priority: 'Medium', qualityScore: 98 },
  { id: 'task-004', projectId: 'proj-002', name: 'Dataset FB 2023 Q4', annotatorId: 'usr-003', reviewerId: 'usr-004', status: 'completed', totalImages: 4000, completedImages: 4000, deadline: '2024-01-15', priority: 'Low', qualityScore: 99 },
  { id: 'task-005', projectId: 'proj-003', name: 'MRI Batch - Bệnh viện Bạch Mai', annotatorId: 'usr-002', reviewerId: 'usr-004', status: 'in-progress', totalImages: 50, completedImages: 5, deadline: '2024-03-20', priority: 'High' },
  { id: 'task-006', projectId: 'proj-001', name: 'Batch 4 - Ban đêm', annotatorId: 'usr-003', reviewerId: 'usr-004', status: 'rejected', totalImages: 300, completedImages: 300, deadline: '2024-03-11', priority: 'Medium', qualityScore: 42, submittedAt: '2024-03-09' },
];

// ---- Project Members (Team) ----
export type MemberStatus = 'active' | 'pending' | 'declined';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'annotator' | 'reviewer';
  status: MemberStatus;
  invitedAt: string;
  joinedAt?: string;
}

export const MOCK_PROJECT_MEMBERS: ProjectMember[] = [
  // proj-001 members
  { id: 'pm-001', projectId: 'proj-001', userId: 'usr-002', role: 'annotator', status: 'active', invitedAt: '2023-09-30', joinedAt: '2023-10-01' },
  { id: 'pm-002', projectId: 'proj-001', userId: 'usr-003', role: 'annotator', status: 'active', invitedAt: '2023-10-01', joinedAt: '2023-10-02' },
  { id: 'pm-003', projectId: 'proj-001', userId: 'usr-004', role: 'reviewer',  status: 'active', invitedAt: '2023-09-30', joinedAt: '2023-10-01' },
  // proj-002 members
  { id: 'pm-004', projectId: 'proj-002', userId: 'usr-003', role: 'annotator', status: 'active', invitedAt: '2023-08-10', joinedAt: '2023-08-11' },
  { id: 'pm-005', projectId: 'proj-002', userId: 'usr-004', role: 'reviewer',  status: 'active', invitedAt: '2023-08-10', joinedAt: '2023-08-12' },
  // proj-003 members (new project, one pending invite)
  { id: 'pm-006', projectId: 'proj-003', userId: 'usr-002', role: 'annotator', status: 'pending', invitedAt: '2024-02-01' },
  { id: 'pm-007', projectId: 'proj-003', userId: 'usr-004', role: 'reviewer',  status: 'active', invitedAt: '2024-02-01', joinedAt: '2024-02-02' },
];

// ---- Datasets ----
export type DatasetType = 'image' | 'video' | 'text';
export type DatasetStatus = 'imported' | 'processing' | 'ready' | 'error';

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  type: DatasetType;
  status: DatasetStatus;
  totalFiles: number;
  totalSizeMB: number;
  uploadedAt: string;
  uploadedBy: string; // userId
  source: 'local' | 's3' | 'azure' | 'gcs';
}

export const MOCK_DATASETS: Dataset[] = [
  { id: 'ds-001', projectId: 'proj-001', name: 'traffic_hanoi_batch1.zip',  type: 'image', status: 'ready',      totalFiles: 1200, totalSizeMB: 3450, uploadedAt: '2023-10-05', uploadedBy: 'usr-001', source: 'local' },
  { id: 'ds-002', projectId: 'proj-001', name: 'traffic_hcm_batch2.zip',   type: 'image', status: 'ready',      totalFiles: 1100, totalSizeMB: 2980, uploadedAt: '2023-10-10', uploadedBy: 'usr-001', source: 's3'    },
  { id: 'ds-003', projectId: 'proj-001', name: 'traffic_night_batch3.mp4', type: 'video', status: 'ready',      totalFiles:  300, totalSizeMB: 8120, uploadedAt: '2023-11-01', uploadedBy: 'usr-001', source: 'local' },
  { id: 'ds-004', projectId: 'proj-002', name: 'fb_comments_q4_2023.csv',  type: 'text',  status: 'ready',      totalFiles: 12000,totalSizeMB:   45, uploadedAt: '2023-08-20', uploadedBy: 'usr-001', source: 'local' },
  { id: 'ds-005', projectId: 'proj-003', name: 'mri_bach_mai_batch1.zip',  type: 'image', status: 'ready',      totalFiles:  200, totalSizeMB: 1560, uploadedAt: '2024-02-05', uploadedBy: 'usr-001', source: 'azure'  },
  { id: 'ds-006', projectId: 'proj-003', name: 'mri_viet_duc_batch2.zip',  type: 'image', status: 'processing', totalFiles:  600, totalSizeMB: 4700, uploadedAt: '2024-03-06', uploadedBy: 'usr-001', source: 'azure'  },
  { id: 'ds-007', projectId: 'proj-004', name: 'pedestrian_tracking_v1.zip',type:'image', status: 'ready',      totalFiles: 3000, totalSizeMB: 9200, uploadedAt: '2024-03-06', uploadedBy: 'usr-001', source: 'gcs'   },
];
