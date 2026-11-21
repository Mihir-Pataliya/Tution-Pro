import api from './axios';

export const studentInviteAPI = {
  list: (params) => api.get('/student-invites', { params }),
  create: (data) => api.post('/student-invites', data),
  resend: (id) => api.post(`/student-invites/${id}/resend`),
  cancel: (id) => api.post(`/student-invites/${id}/cancel`),
  getPublic: (token) => api.get(`/student-invites/public/${token}`),
  acceptPublic: (token, data) => api.post(`/student-invites/public/${token}/accept`, data),
};