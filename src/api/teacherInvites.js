import api from './axios';

export const teacherInviteAPI = {
  list: (status = 'all') => api.get('/teacher-invites', { params: { status } }),
  create: (data) => api.post('/teacher-invites', data),
  resend: (id) => api.post(`/teacher-invites/${id}/resend`),
  cancel: (id) => api.post(`/teacher-invites/${id}/cancel`),
  // Public (no auth): teacher opens the email link.
  getPublic: (token) => api.get(`/teacher-invites/public/${token}`),
  acceptPublic: (token, data) => api.post(`/teacher-invites/public/${token}/accept`, data),
};

