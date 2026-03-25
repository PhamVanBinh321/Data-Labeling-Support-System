import client from './client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  role_confirmed: boolean;
  avatar: string;
  quality_score: number;
  tasks_completed: number;
}

export interface AuthTokens {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<AuthTokens> => {
    const res = await client.post('/api/auth/register/', { name, email, password });
    return res.data.data;
  },

  login: async (email: string, password: string): Promise<AuthTokens> => {
    const res = await client.post('/api/auth/login/', { email, password });
    return res.data.data;
  },

  logout: async (refresh_token: string): Promise<void> => {
    await client.post('/api/auth/logout/', { refresh_token });
  },

  me: async (): Promise<AuthUser> => {
    const res = await client.get('/api/auth/me/');
    return res.data.data;
  },

  setRole: async (role: string): Promise<AuthUser> => {
    const res = await client.patch('/api/auth/me/role/', { role });
    return res.data.data;
  },

  updateProfile: async (data: { name?: string; avatar?: string }): Promise<AuthUser> => {
    const res = await client.patch('/api/auth/me/', data);
    return res.data.data;
  },
};
