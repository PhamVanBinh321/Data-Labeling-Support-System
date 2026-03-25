import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { MOCK_TASKS, MOCK_PROJECTS, MOCK_USERS } from '../data/mockData';
import type { Task, Project, User, TaskStatus } from '../data/mockData';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import { useAuth } from './AuthContext';

interface DataContextType {
  tasks: Task[];
  projects: Project[];
  users: User[];
  loading: boolean;
  updateTaskStatus: (taskId: string, status: TaskStatus, rejectReason?: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  getTaskById: (taskId: string) => Task | undefined;
  getProjectById: (projectId: string) => Project | undefined;
  getUserById: (userId: string) => User | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ── Helpers: map API response → interface frontend đang dùng ─────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTask = (t: any): Task => ({
  id: String(t.id),
  projectId: String(t.project_id),
  name: t.name,
  annotatorId: String(t.annotator_id),
  reviewerId: String(t.reviewer_id),
  status: t.status as TaskStatus,
  totalImages: t.total_images,
  completedImages: t.completed_images,
  deadline: t.deadline,
  priority: t.priority,
  submittedAt: t.submitted_at ?? undefined,
  qualityScore: t.quality_score ?? undefined,
  rejectReason: t.reject_reason || undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProject = (p: any): Project => ({
  id: String(p.id),
  name: p.name,
  type: p.type,
  typeName: p.type,
  description: p.description || '',
  guidelines: p.guidelines || '',
  labels: (p.labels ?? []).map((l: any) => ({
    id: String(l.id),
    name: l.name,
    color: l.color,
    attributes: l.attributes ?? [],
  })),
  totalImages: p.total_images ?? 0,
  annotatedImages: p.annotated_images ?? 0,
  approvedImages: p.approved_images ?? 0,
  status: p.status,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  managerId: String(p.manager_id),
});

// ─────────────────────────────────────────────────────────────────────────────

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => {
    // Giữ mock làm fallback ban đầu — sẽ bị replace khi fetch thành công
    const saved = localStorage.getItem('annotate_pro_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return MOCK_TASKS;
  });

  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [users] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(false);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await tasksApi.list();
      const mapped = Array.isArray(data) ? data.map(mapTask) : [];
      if (mapped.length > 0) {
        setTasks(mapped);
        localStorage.setItem('annotate_pro_tasks', JSON.stringify(mapped));
      }
    } catch {
      // API lỗi → giữ nguyên mock/cached data
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list();
      const mapped = Array.isArray(data) ? data.map(mapProject) : [];
      if (mapped.length > 0) setProjects(mapped);
    } catch {
      // API lỗi → giữ nguyên mock data
    }
  }, []);

  // Fetch khi user đăng nhập
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([refreshTasks(), refreshProjects()])
      .finally(() => setLoading(false));
  }, [isAuthenticated, refreshTasks, refreshProjects]);

  const updateTaskStatus = async (taskId: string, status: TaskStatus, rejectReason?: string) => {
    // Optimistic update trước
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status, ...(rejectReason ? { rejectReason } : {}) }
        : t
    ));
    try {
      await tasksApi.updateStatus(Number(taskId), status, rejectReason);
    } catch {
      // Rollback nếu API lỗi: re-fetch
      await refreshTasks();
    }
  };

  const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);
  const getProjectById = (projectId: string) => projects.find(p => p.id === projectId);
  const getUserById = (userId: string) => users.find(u => u.id === userId);

  return (
    <DataContext.Provider value={{
      tasks, projects, users, loading,
      updateTaskStatus, refreshTasks, refreshProjects,
      getTaskById, getProjectById, getUserById,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
