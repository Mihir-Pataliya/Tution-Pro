import api from './axios';

export const enquiriesAPI = {
  list: (params) => api.get('/enquiries', { params }),
  create: (data) => api.post('/enquiries', data),
  update: (id, data) => api.put(`/enquiries/${id}`, data),
  convert: (id, batchId) => api.post(`/enquiries/${id}/convert`, { batchId }),
  remove: (id) => api.delete(`/enquiries/${id}`),
};
