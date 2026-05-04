import React, { useState } from 'react';
import {
  Settings, Save, RotateCcw, Bell, Shield, Database,
  Clock, Globe, ChevronRight, CheckCircle, AlertTriangle
} from 'lucide-react';
import './AdminConfig.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeneralConfig {
  systemName: string;
  maxUsersPerProject: number;
  defaultTaskDeadlineDays: number;
  allowSelfRegister: boolean;
  maintenanceMode: boolean;
}

interface NotificationConfig {
  emailOnTaskAssign: boolean;
  emailOnTaskComplete: boolean;
  emailOnTaskReject: boolean;
  emailOnProjectCreate: boolean;
  systemAlertEmail: string;
}

interface SecurityConfig {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireEmailVerify: boolean;
  twoFactorEnabled: boolean;
  passwordMinLength: number;
}

interface StorageConfig {
  maxFileSizeMB: number;
  allowedFileTypes: string;
  storageProvider: 'local' | 's3' | 'gcs';
  autoBackupEnabled: boolean;
  backupIntervalHours: number;
}

// ─── Mock initial data ────────────────────────────────────────────────────────
const INIT_GENERAL: GeneralConfig = {
  systemName: 'AnnotatePro',
  maxUsersPerProject: 20,
  defaultTaskDeadlineDays: 7,
  allowSelfRegister: true,
  maintenanceMode: false,
};

const INIT_NOTIFICATION: NotificationConfig = {
  emailOnTaskAssign: true,
  emailOnTaskComplete: true,
  emailOnTaskReject: true,
  emailOnProjectCreate: false,
  systemAlertEmail: 'admin@annotatepro.io',
};

const INIT_SECURITY: SecurityConfig = {
  sessionTimeoutMinutes: 120,
  maxLoginAttempts: 5,
  requireEmailVerify: true,
  twoFactorEnabled: false,
  passwordMinLength: 8,
};

const INIT_STORAGE: StorageConfig = {
  maxFileSizeMB: 50,
  allowedFileTypes: 'jpg,jpeg,png,bmp,tiff',
  storageProvider: 's3',
  autoBackupEnabled: true,
  backupIntervalHours: 24,
};

// ─── Reusable Field Components ────────────────────────────────────────────────
function ToggleField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="config-field toggle-field">
      <div className="field-label-group">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <button
        className={`toggle-btn ${value ? 'toggle-on' : ''}`}
        onClick={() => onChange(!value)}
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

function TextField({ label, hint, value, onChange, type = 'text' }: {
  label: string; hint?: string; value: string | number;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="config-field">
      <label className="field-label">{label}</label>
      {hint && <span className="field-hint">{hint}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="config-input"
      />
    </div>
  );
}

function SelectField({ label, hint, value, onChange, options }: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="config-field">
      <label className="field-label">{label}</label>
      {hint && <span className="field-hint">{hint}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} className="config-input">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function ConfigSection({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="config-section">
      <button className="config-section-header" onClick={() => setExpanded(e => !e)}>
        <div className="section-header-left">
          <div className="section-icon">{icon}</div>
          <div>
            <h2 className="section-title">{title}</h2>
            <p className="section-desc">{description}</p>
          </div>
        </div>
        <ChevronRight size={18} className={`section-chevron ${expanded ? 'expanded' : ''}`} />
      </button>
      {expanded && <div className="config-section-body">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminConfig: React.FC = () => {
  const [general, setGeneral]           = useState<GeneralConfig>(INIT_GENERAL);
  const [notification, setNotification] = useState<NotificationConfig>(INIT_NOTIFICATION);
  const [security, setSecurity]         = useState<SecurityConfig>(INIT_SECURITY);
  const [storage, setStorage]           = useState<StorageConfig>(INIT_STORAGE);

  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setGeneral(INIT_GENERAL);
    setNotification(INIT_NOTIFICATION);
    setSecurity(INIT_SECURITY);
    setStorage(INIT_STORAGE);
  };

  const setG = <K extends keyof GeneralConfig>(k: K, v: GeneralConfig[K]) =>
    setGeneral(p => ({ ...p, [k]: v }));
  const setN = <K extends keyof NotificationConfig>(k: K, v: NotificationConfig[K]) =>
    setNotification(p => ({ ...p, [k]: v }));
  const setS = <K extends keyof SecurityConfig>(k: K, v: SecurityConfig[K]) =>
    setSecurity(p => ({ ...p, [k]: v }));
  const setSt = <K extends keyof StorageConfig>(k: K, v: StorageConfig[K]) =>
    setStorage(p => ({ ...p, [k]: v }));

  return (
    <div className="admin-config-page animate-fade-in">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-left">
          <Settings size={24} />
          <div>
            <h1>Cấu hình Hệ thống</h1>
            <p>Quản lý các thông số và cài đặt toàn hệ thống</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleReset}>
            <RotateCcw size={15} /> Đặt lại
          </button>
          <button
            className={`btn btn-save ${saving ? 'btn-saving' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner" /> Đang lưu...</>
            ) : (
              <><Save size={15} /> Lưu thay đổi</>
            )}
          </button>
        </div>
      </div>

      {/* Save toast */}
      {saved && (
        <div className="save-toast">
          <CheckCircle size={16} />
          Cấu hình đã được lưu thành công!
        </div>
      )}

      {/* Maintenance warning */}
      {general.maintenanceMode && (
        <div className="maintenance-warning">
          <AlertTriangle size={16} />
          <strong>Chế độ bảo trì đang BẬT</strong> — Người dùng thông thường sẽ không truy cập được hệ thống.
        </div>
      )}

      {/* ── General ── */}
      <ConfigSection
        icon={<Globe size={18} />}
        title="Cài đặt Chung"
        description="Thông tin cơ bản và hành vi của hệ thống"
      >
        <div className="fields-grid">
          <TextField
            label="Tên hệ thống"
            hint="Hiển thị trên giao diện và email"
            value={general.systemName}
            onChange={v => setG('systemName', v)}
          />
          <TextField
            label="Số thành viên tối đa / project"
            hint="Giới hạn số annotator và reviewer mỗi project"
            value={general.maxUsersPerProject}
            type="number"
            onChange={v => setG('maxUsersPerProject', +v)}
          />
          <TextField
            label="Deadline mặc định (ngày)"
            hint="Số ngày mặc định khi tạo task mới"
            value={general.defaultTaskDeadlineDays}
            type="number"
            onChange={v => setG('defaultTaskDeadlineDays', +v)}
          />
        </div>
        <div className="fields-toggles">
          <ToggleField
            label="Cho phép tự đăng ký"
            hint="Người dùng có thể tự tạo tài khoản không cần admin duyệt"
            value={general.allowSelfRegister}
            onChange={v => setG('allowSelfRegister', v)}
          />
          <ToggleField
            label="Chế độ bảo trì"
            hint="Tắt truy cập với tất cả người dùng (trừ admin)"
            value={general.maintenanceMode}
            onChange={v => setG('maintenanceMode', v)}
          />
        </div>
      </ConfigSection>

      {/* ── Notification ── */}
      <ConfigSection
        icon={<Bell size={18} />}
        title="Thông báo Email"
        description="Cài đặt khi nào hệ thống gửi email tự động"
      >
        <div className="fields-grid">
          <TextField
            label="Email nhận cảnh báo hệ thống"
            hint="Nhận thông báo về lỗi và sự kiện quan trọng"
            value={notification.systemAlertEmail}
            type="email"
            onChange={v => setN('systemAlertEmail', v)}
          />
        </div>
        <div className="fields-toggles">
          <ToggleField
            label="Giao task mới"
            hint="Gửi email khi annotator được giao task"
            value={notification.emailOnTaskAssign}
            onChange={v => setN('emailOnTaskAssign', v)}
          />
          <ToggleField
            label="Task hoàn thành"
            hint="Gửi email khi task được annotate xong"
            value={notification.emailOnTaskComplete}
            onChange={v => setN('emailOnTaskComplete', v)}
          />
          <ToggleField
            label="Task bị từ chối"
            hint="Gửi email khi reviewer reject task"
            value={notification.emailOnTaskReject}
            onChange={v => setN('emailOnTaskReject', v)}
          />
          <ToggleField
            label="Tạo project mới"
            hint="Gửi email thông báo khi có project được tạo"
            value={notification.emailOnProjectCreate}
            onChange={v => setN('emailOnProjectCreate', v)}
          />
        </div>
      </ConfigSection>

      {/* ── Security ── */}
      <ConfigSection
        icon={<Shield size={18} />}
        title="Bảo mật"
        description="Cài đặt xác thực, phiên đăng nhập và mật khẩu"
      >
        <div className="fields-grid">
          <TextField
            label="Thời gian hết phiên (phút)"
            hint="Tự động đăng xuất sau thời gian không hoạt động"
            value={security.sessionTimeoutMinutes}
            type="number"
            onChange={v => setSecurity(p => ({ ...p, sessionTimeoutMinutes: +v }))}
          />
          <TextField
            label="Số lần đăng nhập sai tối đa"
            hint="Khoá tài khoản sau khi vượt quá số lần này"
            value={security.maxLoginAttempts}
            type="number"
            onChange={v => setS('maxLoginAttempts', +v)}
          />
          <TextField
            label="Độ dài mật khẩu tối thiểu"
            hint="Yêu cầu tối thiểu khi tạo/đổi mật khẩu"
            value={security.passwordMinLength}
            type="number"
            onChange={v => setS('passwordMinLength', +v)}
          />
        </div>
        <div className="fields-toggles">
          <ToggleField
            label="Yêu cầu xác minh email"
            hint="Người dùng phải xác nhận email trước khi đăng nhập"
            value={security.requireEmailVerify}
            onChange={v => setS('requireEmailVerify', v)}
          />
          <ToggleField
            label="Xác thực 2 yếu tố (2FA)"
            hint="Bật 2FA cho tất cả tài khoản trong hệ thống"
            value={security.twoFactorEnabled}
            onChange={v => setS('twoFactorEnabled', v)}
          />
        </div>
      </ConfigSection>

      {/* ── Storage ── */}
      <ConfigSection
        icon={<Database size={18} />}
        title="Lưu trữ & Backup"
        description="Cài đặt upload file, nhà cung cấp lưu trữ và sao lưu tự động"
      >
        <div className="fields-grid">
          <TextField
            label="Kích thước file tối đa (MB)"
            hint="Giới hạn dung lượng mỗi file ảnh upload"
            value={storage.maxFileSizeMB}
            type="number"
            onChange={v => setSt('maxFileSizeMB', +v)}
          />
          <TextField
            label="Định dạng cho phép"
            hint="Phân cách bằng dấu phẩy, không có khoảng trắng"
            value={storage.allowedFileTypes}
            onChange={v => setSt('allowedFileTypes', v)}
          />
          <SelectField
            label="Nhà cung cấp lưu trữ"
            hint="Nơi lưu trữ file ảnh của hệ thống"
            value={storage.storageProvider}
            onChange={v => setSt('storageProvider', v as StorageConfig['storageProvider'])}
            options={[
              { value: 'local', label: 'Local Disk' },
              { value: 's3',    label: 'Amazon S3' },
              { value: 'gcs',   label: 'Google Cloud Storage' },
            ]}
          />
          <TextField
            label="Chu kỳ backup (giờ)"
            hint="Khoảng thời gian giữa mỗi lần backup tự động"
            value={storage.backupIntervalHours}
            type="number"
            onChange={v => setSt('backupIntervalHours', +v)}
          />
        </div>
        <div className="fields-toggles">
          <ToggleField
            label="Backup tự động"
            hint="Tự động sao lưu dữ liệu theo chu kỳ đã cài đặt"
            value={storage.autoBackupEnabled}
            onChange={v => setSt('autoBackupEnabled', v)}
          />
        </div>
      </ConfigSection>

      {/* Bottom Save Bar */}
      <div className="config-bottom-bar">
        <span className="bottom-bar-hint">
          <Clock size={13} /> Lưu lần cuối: hôm nay lúc 01:30
        </span>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleReset}>
            <RotateCcw size={15} /> Đặt lại
          </button>
          <button
            className={`btn btn-save ${saving ? 'btn-saving' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><span className="spinner" /> Đang lưu...</> : <><Save size={15} /> Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfig;
