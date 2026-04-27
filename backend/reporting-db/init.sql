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

-- ============================================================
-- FOREIGN DATA WRAPPER — kết nối tới các DB nguồn
-- NiFi query reporting_db, FDW tự fetch từ DB nguồn
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- ─── auth_db ─────────────────────────────────────────────
CREATE SERVER IF NOT EXISTS auth_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'auth-db', port '5432', dbname 'auth_db');

CREATE USER MAPPING IF NOT EXISTS FOR reporting_user
    SERVER auth_server
    OPTIONS (user 'auth_user', password 'auth_pass');

CREATE FOREIGN TABLE IF NOT EXISTS fdw_users (
    id             BIGINT,
    username       VARCHAR(150),
    email          VARCHAR(254),
    role           VARCHAR(20),
    quality_score  FLOAT,
    tasks_completed INT,
    is_active      BOOLEAN,
    created_at     TIMESTAMPTZ
) SERVER auth_server OPTIONS (schema_name 'public', table_name 'users');

-- ─── project_db ──────────────────────────────────────────
CREATE SERVER IF NOT EXISTS project_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'project-db', port '5432', dbname 'project_db');

CREATE USER MAPPING IF NOT EXISTS FOR reporting_user
    SERVER project_server
    OPTIONS (user 'project_user', password 'project_pass');

CREATE FOREIGN TABLE IF NOT EXISTS fdw_projects (
    id               BIGINT,
    name             VARCHAR(255),
    status           VARCHAR(20),
    total_images     INT,
    annotated_images INT,
    approved_images  INT,
    manager_id       BIGINT,
    created_at       TIMESTAMPTZ
) SERVER project_server OPTIONS (schema_name 'public', table_name 'projects');

-- ─── task_db ─────────────────────────────────────────────
CREATE SERVER IF NOT EXISTS task_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'task-db', port '5432', dbname 'task_db');

CREATE USER MAPPING IF NOT EXISTS FOR reporting_user
    SERVER task_server
    OPTIONS (user 'task_user', password 'task_pass');

CREATE FOREIGN TABLE IF NOT EXISTS fdw_tasks (
    id               BIGINT,
    project_id       BIGINT,
    annotator_id     BIGINT,
    reviewer_id      BIGINT,
    status           VARCHAR(20),
    total_images     INT,
    completed_images INT,
    quality_score    FLOAT,
    created_at       TIMESTAMPTZ
) SERVER task_server OPTIONS (schema_name 'public', table_name 'tasks');

-- ─── annotation_db ───────────────────────────────────────
CREATE SERVER IF NOT EXISTS annotation_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'annotation-db', port '5432', dbname 'annotation_db');

CREATE USER MAPPING IF NOT EXISTS FOR reporting_user
    SERVER annotation_server
    OPTIONS (user 'annotation_user', password 'annotation_pass');

CREATE FOREIGN TABLE IF NOT EXISTS fdw_annotations (
    id           BIGINT,
    image_id     BIGINT,
    label_name   VARCHAR(100),
    label_color  VARCHAR(7),
    created_by   BIGINT
) SERVER annotation_server OPTIONS (schema_name 'public', table_name 'annotations');

CREATE FOREIGN TABLE IF NOT EXISTS fdw_image_files (
    id         BIGINT,
    task_id    BIGINT,
    project_id BIGINT
) SERVER annotation_server OPTIONS (schema_name 'public', table_name 'image_files');

