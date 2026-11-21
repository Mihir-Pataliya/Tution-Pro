import api from './axios';

export const studentAPI = {
  // GET /students?batchId=
  getAll: (params) => api.get('/students', { params }),
  // POST /students
  create: (data) => api.post('/students', data),
  // PUT /students/:id
  update: (id, data) => api.put(`/students/${id}`, data),
  // DELETE /students/:id
  delete: (id) => api.delete(`/students/${id}`),
};