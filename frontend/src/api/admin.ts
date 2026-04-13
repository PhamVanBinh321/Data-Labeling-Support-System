import client from './client';

export const adminApi = {
  overview: async () => {
    const res = await client.get('/api/admin/overview/');
    return res.data.data;
  },
  projects: async () => {
    const res = await client.get('/api/admin/projects/');
    return res.data.data;
  },
};
