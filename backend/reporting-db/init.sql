-- ============================================================
-- reporting_db — NiFi ghi vào định kỳ, admin-service đọc ra
-- ============================================================

-- Tổng quan toàn hệ thống
CREATE TABLE IF NOT EXISTS rpt_system_overview (
    id              SERIAL PRIMARY KEY,
    total_projects  INT DEFAULT 0,
    total_tasks     INT DEFAULT 0,
    total_images    INT DEFAULT 0,
    total_annotations INT DEFAULT 0,
    synced_at       TIMESTAMP DEFAULT NOW()
);

-- Thống kê theo project
CREATE TABLE IF NOT EXISTS rpt_project_stats (
    project_id          INT PRIMARY KEY,
    project_name        VARCHAR(255),
    status              VARCHAR(50),
    total_tasks         INT DEFAULT 0,
    pending_tasks       INT DEFAULT 0,
    in_progress_tasks   INT DEFAULT 0,
    in_review_tasks     INT DEFAULT 0,
    approved_tasks      INT DEFAULT 0,
    completed_tasks     INT DEFAULT 0,
    rejected_tasks      INT DEFAULT 0,
    total_images        INT DEFAULT 0,
    annotated_images    INT DEFAULT 0,
    approved_images     INT DEFAULT 0,
    synced_at           TIMESTAMP DEFAULT NOW()
);

-- Hoạt động theo annotator/reviewer
CREATE TABLE IF NOT EXISTS rpt_user_activity (
    user_id             INT PRIMARY KEY,
    role                VARCHAR(50),
    total_tasks         INT DEFAULT 0,
    completed_tasks     INT DEFAULT 0,
    approved_tasks      INT DEFAULT 0,
    rejected_tasks      INT DEFAULT 0,
    synced_at           TIMESTAMP DEFAULT NOW()
);

-- Phân bố annotation theo label trong từng project
CREATE TABLE IF NOT EXISTS rpt_annotation_stats (
    project_id      INT,
    label_name      VARCHAR(255),
    label_color     VARCHAR(20),
    annotation_count INT DEFAULT 0,
    synced_at       TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (project_id, label_name)
);

-- Insert dòng overview mặc định để NiFi có thể UPDATE
INSERT INTO rpt_system_overview (total_projects, total_tasks, total_images, total_annotations)
VALUES (0, 0, 0, 0);
