# Database Schema — Data Labeling Support System

Mỗi microservice có database **riêng biệt** (Database-per-Service pattern).
Các quan hệ cross-service được thực hiện bằng ID references (không có FK thật).

---

## auth-service · DB: `auth_db`

### Table: `users`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | Auto increment |
| username | VARCHAR(150) | UNIQUE, NOT NULL | Dùng email làm username |
| email | VARCHAR(254) | UNIQUE, NOT NULL | Email đăng nhập |
| password | VARCHAR(128) | NOT NULL | Hashed (PBKDF2) |
| first_name | VARCHAR(150) | | |
| last_name | VARCHAR(150) | | |
| role | VARCHAR(20) | NULL | `manager` / `annotator` / `reviewer` |
| role_confirmed | BOOLEAN | DEFAULT FALSE | Chỉ set role 1 lần |
| avatar | VARCHAR(255) | DEFAULT '' | URL ảnh đại diện |
| quality_score | FLOAT | DEFAULT 0 | Điểm chất lượng (0–100) |
| tasks_completed | INT | DEFAULT 0 | Tổng số task hoàn thành |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete |
| is_staff | BOOLEAN | DEFAULT FALSE | Django admin |
| created_at | TIMESTAMPTZ | AUTO | |
| updated_at | TIMESTAMPTZ | AUTO | |

**Indexes:** `email`, `role`

---

## project-service · DB: `project_db`

### Table: `projects`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| name | VARCHAR(255) | NOT NULL | Tên project |
| type | VARCHAR(30) | NOT NULL | `bounding_box` / `polygon` / `classification` / `segmentation` / `text_classification` |
| description | TEXT | DEFAULT '' | |
| guidelines | TEXT | DEFAULT '' | Hướng dẫn cho annotator |
| status | VARCHAR(20) | DEFAULT 'draft' | `draft` / `active` / `paused` / `completed` |
| total_images | INT | DEFAULT 0 | Tổng số ảnh |
| annotated_images | INT | DEFAULT 0 | Số ảnh đã annotate |
| approved_images | INT | DEFAULT 0 | Số ảnh đã approved |
| manager_id | BIGINT | NOT NULL, INDEX | → `auth_db.users.id` |
| created_at | TIMESTAMPTZ | AUTO | |
| updated_at | TIMESTAMPTZ | AUTO | |

### Table: `label_definitions`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| project_id | BIGINT | FK → projects, CASCADE | |
| name | VARCHAR(100) | NOT NULL | Tên nhãn (vd: "Car", "Person") |
| color | VARCHAR(7) | NOT NULL | Hex color: `#FF5733` |
| attributes | JSONB | DEFAULT '[]' | `[{"name":"color","type":"select","options":["red"]}]` |

**Unique:** `(project_id, name)`

### Table: `project_members`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| project_id | BIGINT | FK → projects, CASCADE | |
| user_id | BIGINT | NOT NULL, INDEX | → `auth_db.users.id` |
| role | VARCHAR(20) | NOT NULL | `annotator` / `reviewer` |
| status | VARCHAR(20) | DEFAULT 'pending' | `pending` / `active` / `declined` |
| invited_at | TIMESTAMPTZ | AUTO | |
| joined_at | TIMESTAMPTZ | NULL | Set khi accept |

**Unique:** `(project_id, user_id)`

### Table: `datasets`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| project_id | BIGINT | FK → projects, CASCADE | |
| name | VARCHAR(255) | NOT NULL | |
| type | VARCHAR(20) | DEFAULT 'image' | `image` / `video` / `text` |
| status | VARCHAR(20) | DEFAULT 'imported' | `imported` / `processing` / `ready` / `error` |
| total_files | INT | DEFAULT 0 | |
| total_size_mb | FLOAT | DEFAULT 0 | |
| source | VARCHAR(20) | DEFAULT 'local' | `local` / `s3` / `azure` / `gcs` |
| uploaded_by | BIGINT | NOT NULL | → `auth_db.users.id` |
| uploaded_at | TIMESTAMPTZ | AUTO | |

---

## task-service · DB: `task_db`

### Table: `tasks`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| project_id | BIGINT | NOT NULL, INDEX | → `project_db.projects.id` |
| annotator_id | BIGINT | NOT NULL, INDEX | → `auth_db.users.id` |
| reviewer_id | BIGINT | NOT NULL, INDEX | → `auth_db.users.id` |
| name | VARCHAR(255) | NOT NULL | Tên batch (vd: "Batch 1 - Street") |
| status | VARCHAR(20) | DEFAULT 'pending' | Xem state machine bên dưới |
| priority | VARCHAR(10) | DEFAULT 'Medium' | `High` / `Medium` / `Low` |
| deadline | DATE | NOT NULL | |
| total_images | INT | DEFAULT 0 | |
| completed_images | INT | DEFAULT 0 | Số ảnh annotator đã confirm |
| submitted_at | TIMESTAMPTZ | NULL | Khi annotator submit |
| quality_score | FLOAT | NULL | Reviewer chấm |
| reject_reason | TEXT | DEFAULT '' | Lý do từ chối |
| created_at | TIMESTAMPTZ | AUTO | |
| updated_at | TIMESTAMPTZ | AUTO | |

**Task Status State Machine:**
```
draft ──→ pending ──→ in-progress ──→ in-review ──→ approved ──→ completed
                                           │
                                           └──→ rejected ──→ in-progress
```

### Table: `task_status_history`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| task_id | BIGINT | FK → tasks, CASCADE | |
| from_status | VARCHAR(20) | DEFAULT '' | Trạng thái cũ |
| to_status | VARCHAR(20) | NOT NULL | Trạng thái mới |
| changed_by | BIGINT | NOT NULL | → `auth_db.users.id` |
| reject_reason | TEXT | DEFAULT '' | |
| changed_at | TIMESTAMPTZ | AUTO | |

---

## annotation-service · DB: `annotation_db`

### Table: `image_files`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| task_id | BIGINT | NOT NULL, INDEX | → `task_db.tasks.id` |
| project_id | BIGINT | NOT NULL, INDEX | → `project_db.projects.id` |
| dataset_id | BIGINT | NULL, INDEX | → `project_db.datasets.id` |
| index | INT | NOT NULL | Thứ tự trong task (0-based) |
| file_path | VARCHAR(500) | NOT NULL | Relative path dưới `/media/` |
| original_filename | VARCHAR(255) | DEFAULT '' | |
| width | INT | DEFAULT 0 | Pixel |
| height | INT | DEFAULT 0 | Pixel |
| is_confirmed | BOOLEAN | DEFAULT FALSE | Annotator đã confirm |
| uploaded_at | TIMESTAMPTZ | AUTO | |

**Unique:** `(task_id, index)`

### Table: `annotations`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| image_id | BIGINT | FK → image_files, CASCADE | |
| label_id | VARCHAR(100) | NOT NULL | ID label từ project-service |
| label_name | VARCHAR(100) | NOT NULL | Denormalized — tên nhãn |
| label_color | VARCHAR(7) | NOT NULL | Denormalized — hex color |
| x | FLOAT | DEFAULT 0 | Top-left X (pixels) |
| y | FLOAT | DEFAULT 0 | Top-left Y (pixels) |
| width | FLOAT | DEFAULT 0 | Box width (pixels) |
| height | FLOAT | DEFAULT 0 | Box height (pixels) |
| points | JSONB | NULL | Polygon points: `[[x1,y1],[x2,y2],...]` |
| annotation_type | VARCHAR(30) | DEFAULT 'bounding_box' | |
| comment | VARCHAR(500) | DEFAULT '' | Ghi chú của annotator |
| created_by | BIGINT | NOT NULL | → `auth_db.users.id` |
| created_at | TIMESTAMPTZ | AUTO | |
| updated_at | TIMESTAMPTZ | AUTO | |

---

## notification-service · DB: `notify_db`

### Table: `notifications`

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | |
| recipient_id | BIGINT | NOT NULL, INDEX | → `auth_db.users.id` |
| type | VARCHAR(30) | NOT NULL | `task_assigned` / `task_submitted` / `task_approved` / `task_rejected` / `member_invited` / `system` |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NOT NULL | |
| task_id | BIGINT | NULL | Context: task liên quan |
| project_id | BIGINT | NULL | Context: project liên quan |
| is_read | BOOLEAN | DEFAULT FALSE, INDEX | |
| created_at | TIMESTAMPTZ | AUTO | |

**Composite Index:** `(recipient_id, is_read)` — cho query unread notifications

---

## Cross-Service Data Flow

```
auth_db.users.id
    ↓ referenced by (no FK)
    ├── project_db.projects.manager_id
    ├── project_db.project_members.user_id
    ├── project_db.datasets.uploaded_by
    ├── task_db.tasks.annotator_id
    ├── task_db.tasks.reviewer_id
    ├── task_db.task_status_history.changed_by
    ├── annotation_db.annotations.created_by
    └── notify_db.notifications.recipient_id

project_db.projects.id
    ↓ referenced by
    ├── task_db.tasks.project_id
    ├── annotation_db.image_files.project_id
    └── notify_db.notifications.project_id

task_db.tasks.id
    ↓ referenced by
    ├── annotation_db.image_files.task_id
    └── notify_db.notifications.task_id
```

---

## Ghi chú thiết kế

1. **Không dùng FK cross-database** — integrity được đảm bảo ở application layer
2. **Denormalize có chọn lọc** — `label_name`, `label_color` trong `annotations` để tránh gọi cross-service khi export
3. **Soft counters** — `annotated_images`, `approved_images` trong `projects` được cập nhật async (Sprint 2)
4. **audit log** — `task_status_history` lưu toàn bộ lịch sử thay đổi trạng thái
5. **JSONB** — dùng cho `label_definitions.attributes` và `annotations.points` để linh hoạt schema
