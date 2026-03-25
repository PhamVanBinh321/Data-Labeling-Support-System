import client from './client';

export const tasksApi = {
  list: async (params?: { project_id?: number; status?: string }) => {
    const res = await client.get('/api/tasks/', { params });
    return res.data.data;
  },

  get: async (id: number) => {
    const res = await client.get(`/api/tasks/${id}/`);
    return res.data.data;
  },

  create: async (data: {
    project_id: number;
    name: string;
    annotator_id: number;
    reviewer_id: number;
    deadline: string;
    priority?: string;
  }) => {
    const res = await client.post('/api/tasks/', data);
    return res.data.data;
  },

  update: async (id: number, data: Partial<{
    name: string;
    priority: string;
    deadline: string;
    annotator_id: number;
    reviewer_id: number;
  }>) => {
    const res = await client.patch(`/api/tasks/${id}/`, data);
    return res.data.data;
  },

  delete: async (id: number) => {
    await client.delete(`/api/tasks/${id}/`);
  },

  updateStatus: async (id: number, status: string, reject_reason?: string) => {
    const res = await client.patch(`/api/tasks/${id}/status/`, { status, reject_reason });
    return res.data.data;
  },

  getHistory: async (id: number) => {
    const res = await client.get(`/api/tasks/${id}/history/`);
    return res.data.data;
  },

  // Dashboards
  managerDashboard: async (project_id?: number) => {
    const res = await client.get('/api/tasks/dashboard/manager/', { params: { project_id } });
    return res.data.data;
  },

  annotatorDashboard: async () => {
    const res = await client.get('/api/tasks/dashboard/annotator/');
    return res.data.data;
  },

  reviewerDashboard: async () => {
    const res = await client.get('/api/tasks/dashboard/reviewer/');
    return res.data.data;
  },
};
