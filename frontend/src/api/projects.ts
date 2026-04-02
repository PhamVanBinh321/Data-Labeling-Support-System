import client from './client';

export const projectsApi = {
  list: async (params?: { status?: string }) => {
    const res = await client.get('/api/projects/', { params });
    return res.data.data;
  },

  get: async (id: number) => {
    const res = await client.get(`/api/projects/${id}/`);
    return res.data.data;
  },

  create: async (data: {
    name: string;
    type: string;
    description?: string;
    guidelines?: string;
  }) => {
    const res = await client.post('/api/projects/', data);
    return res.data.data;
  },

  update: async (id: number, data: Partial<{ name: string; description: string; guidelines: string }>) => {
    const res = await client.patch(`/api/projects/${id}/`, data);
    return res.data.data;
  },

  delete: async (id: number) => {
    await client.delete(`/api/projects/${id}/`);
  },

  updateStatus: async (id: number, status: string) => {
    const res = await client.patch(`/api/projects/${id}/status/`, { status });
    return res.data.data;
  },

  // Labels
  listLabels: async (projectId: number) => {
    const res = await client.get(`/api/projects/${projectId}/labels/`);
    return res.data.data;
  },

  createLabel: async (projectId: number, data: { name: string; color: string; attributes?: unknown[] }) => {
    const res = await client.post(`/api/projects/${projectId}/labels/`, data);
    return res.data.data;
  },

  updateLabel: async (projectId: number, labelId: number, data: { name?: string; color?: string }) => {
    const res = await client.patch(`/api/projects/${projectId}/labels/${labelId}/`, data);
    return res.data.data;
  },

  deleteLabel: async (projectId: number, labelId: number) => {
    await client.delete(`/api/projects/${projectId}/labels/${labelId}/`);
  },

  // Invitations (for annotator/reviewer)
  myInvitations: async () => {
    const res = await client.get('/api/projects/my-invitations/');
    return res.data.data as Array<{
      id: number;
      project_id: number;
      project_name: string;
      project_type: string;
      role: string;
      status: string;
      invited_at: string;
    }>;
  },

  // Members
  listMembers: async (projectId: number) => {
    const res = await client.get(`/api/projects/${projectId}/members/`);
    return res.data.data;
  },

  inviteMember: async (projectId: number, data: { user_id: number; role: string }) => {
    const res = await client.post(`/api/projects/${projectId}/members/`, data);
    return res.data.data;
  },

  updateMemberStatus: async (projectId: number, memberId: number, status: 'active' | 'declined') => {
    const res = await client.patch(`/api/projects/${projectId}/members/${memberId}/status/`, { status });
    return res.data.data;
  },

  removeMember: async (projectId: number, memberId: number) => {
    await client.delete(`/api/projects/${projectId}/members/${memberId}/`);
  },

  // Datasets
  listDatasets: async (projectId: number) => {
    const res = await client.get('/api/datasets/', { params: { project_id: projectId } });
    return res.data.data;
  },

  createDataset: async (data: { project_id: number; name: string; type?: string; source?: string }) => {
    const res = await client.post('/api/datasets/', data);
    return res.data.data;
  },
};
