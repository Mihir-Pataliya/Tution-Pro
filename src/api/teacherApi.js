import api from './axios';

export const teacherAPI = {
  getProfile: () => api.get('/teacher/profile'),
  updateProfile: (data) => api.put('/teacher/profile', data),
  changePassword: (currentPassword, newPassword) => api.put('/teacher/password', { currentPassword, newPassword }),

  getOverview: () => api.get('/teacher/overview'),
  getBatches: () => api.get('/teacher/batches'),
  getStudents: (params) => api.get('/teacher/students', { params }),

  getAttendance: (batchId) => api.get('/teacher/attendance', { params: { batchId } }),
  saveAttendance: (batchId, records) => api.put('/teacher/attendance', { batchId, records }),

  getAssignments: (params) => api.get('/teacher/assignments', { params }),
  createAssignment: (data) => api.post('/teacher/assignments', data),
  updateAssignment: (id, data) => api.put(`/teacher/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/teacher/assignments/${id}`),

  getMaterials: (params) => api.get('/teacher/materials', { params }),
  createMaterial: (data) => api.post('/teacher/materials', data),
  deleteMaterial: (id) => api.delete(`/teacher/materials/${id}`),

  getMessages: () => api.get('/teacher/messages'),
  getRecipients: (type) => api.get('/teacher/recipients', { params: { type } }),
  sendMessage: (data) => api.post('/teacher/messages', data),
  markMessageRead: (id) => api.put(`/teacher/messages/${id}/read`),
  getTeachers: () => api.get('/teachers'),
};

