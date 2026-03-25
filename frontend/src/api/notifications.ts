import client from './client';

export const notificationsApi = {
  list: async (params?: { is_read?: boolean; type?: string; page?: number }) => {
    const res = await client.get('/api/notify/', { params });
    return res.data.data;
  },

  unreadCount: async (): Promise<number> => {
    const res = await client.get('/api/notify/unread-count/');
    return res.data.data.unread_count;
  },

  markRead: async (id: number) => {
    const res = await client.post(`/api/notify/${id}/read/`);
    return res.data.data;
  },

  markAllRead: async () => {
    const res = await client.post('/api/notify/read-all/');
    return res.data.data;
  },

  delete: async (id: number) => {
    await client.delete(`/api/notify/${id}/`);
  },
};
