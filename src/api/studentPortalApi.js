import api from './axios';

export const studentPortalAPI = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  changePassword: (currentPassword, newPassword) => api.put('/student/password', { currentPassword, newPassword }),
  getSettings: () => api.get('/student/settings'),
  updateSettings: (data) => api.put('/student/settings', data),

  getOverview: () => api.get('/student/overview'),
  getBatches: () => api.get('/student/batches'),
  getAttendance: (batchId) => api.get('/student/attendance', { params: batchId ? { batchId } : {} }),
  getAssignments: (params) => api.get('/student/assignments', { params }),
  getMaterials: (params) => api.get('/student/materials', { params }),
  getTimetable: () => api.get('/student/timetable'),
  getFees: () => api.get('/student/fees'),

  getMessages: () => api.get('/student/messages'),
  getRecipients: (type) => api.get('/student/recipients', { params: { type } }),
  sendMessage: (data) => api.post('/student/messages', data),
  markMessageRead: (id) => api.put(`/student/messages/${id}/read`),
};