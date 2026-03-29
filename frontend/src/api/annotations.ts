import client from './client';

export const annotationsApi = {
  // Images
  listImages: async (task_id: number) => {
    const res = await client.get('/api/annotations/images/', { params: { task_id } });
    return res.data.data;
  },

  uploadImage: async (formData: FormData) => {
    const res = await client.post('/api/annotations/images/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  getImage: async (id: number) => {
    const res = await client.get(`/api/annotations/images/${id}/`);
    return res.data.data;
  },

  confirmImage: async (id: number) => {
    const res = await client.post(`/api/annotations/images/${id}/confirm/`);
    return res.data.data;
  },

  deleteImage: async (id: number) => {
    await client.delete(`/api/annotations/images/${id}/`);
  },

  // Annotations
  list: async (image_id: number) => {
    const res = await client.get('/api/annotations/', { params: { image_id } });
    return res.data.data;
  },

  create: async (data: {
    image_id: number;
    label_id: string;
    label_name: string;
    label_color: string;
    annotation_type?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    points?: number[][];
    comment?: string;
  }) => {
    const res = await client.post('/api/annotations/', data);
    return res.data.data;
  },

  update: async (id: number, data: Partial<{
    label_id: string;
    label_name: string;
    label_color: string;
    x: number; y: number; width: number; height: number;
    points: number[][];
    comment: string;
  }>) => {
    const res = await client.patch(`/api/annotations/${id}/`, data);
    return res.data.data;
  },

  delete: async (id: number) => {
    await client.delete(`/api/annotations/${id}/`);
  },

  // Bulk save — thay toàn bộ annotations của 1 ảnh (atomic)
  bulkSave: async (imageId: number, annotations: Array<{
    label_id: string;
    label_name: string;
    label_color: string;
    annotation_type?: string;
    x: number; y: number; width: number; height: number;
    points?: number[][];
    comment?: string;
  }>) => {
    const res = await client.post(
      `/api/annotations/images/${imageId}/annotations/bulk-save/`,
      { annotations }
    );
    return res.data.data;
  },

  // Task images + annotations (cho reviewer)
  taskImages: async (task_id: number) => {
    const res = await client.get(`/api/annotations/tasks/${task_id}/images/`);
    return res.data.data;
  },

  // Project image pool
  listProjectImages: async (project_id: number, unassigned = false) => {
    const res = await client.get(`/api/annotations/projects/${project_id}/images/`, {
      params: unassigned ? { unassigned: 'true' } : {},
    });
    return res.data.data;
  },

  assignImagesToTask: async (project_id: number, task_id: number, count: number) => {
    const res = await client.post(`/api/annotations/projects/${project_id}/assign/`, {
      task_id,
      count,
    });
    return res.data.data;
  },

  // Export
  exportTask: async (task_id: number, format: 'coco' | 'yolo' | 'csv') => {
    const res = await client.get(`/api/annotations/tasks/${task_id}/export/`, {
      params: { format },
      responseType: 'blob',
    });
    return res;
  },
};
