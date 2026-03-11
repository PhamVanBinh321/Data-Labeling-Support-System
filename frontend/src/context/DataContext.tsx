import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { MOCK_TASKS, MOCK_PROJECTS, MOCK_USERS } from '../data/mockData';
import type { Task, Project, User, TaskStatus } from '../data/mockData';

interface DataContextType {
  tasks: Task[];
  projects: Project[];
  users: User[];
  updateTaskStatus: (taskId: string, status: TaskStatus, rejectReason?: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  getProjectById: (projectId: string) => Project | undefined;
  getUserById: (userId: string) => User | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('annotate_pro_tasks');
    if (saved) {
      try {
         return JSON.parse(saved);
      } catch (e) {
         console.error('Error parsing tasks from local storage', e);
      }
    }
    return MOCK_TASKS;
  });

  const [projects] = useState<Project[]>(MOCK_PROJECTS);
  const [users] = useState<User[]>(MOCK_USERS);

  useEffect(() => {
    localStorage.setItem('annotate_pro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const updateTaskStatus = (taskId: string, status: TaskStatus, rejectReason?: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status,
          ...(rejectReason ? { rejectReason } : {})
        };
      }
      return t;
    }));
  };

  const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);
  const getProjectById = (projectId: string) => projects.find(p => p.id === projectId);
  const getUserById = (userId: string) => users.find(u => u.id === userId);

  return (
    <DataContext.Provider value={{
      tasks,
      projects,
      users,
      updateTaskStatus,
      getTaskById,
      getProjectById,
      getUserById
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
