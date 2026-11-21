import api from './axios';

export const batchAPI = {
  // GET /batches - Get all batches
  getAll: () => api.get('/batches'),
  
  // POST /batches - Create a new batch
  create: (data) => api.post('/batches', data),
  
  // PUT /batches/:id - Update a batch
  update: (id, data) => api.put(`/batches/${id}`, data),
  
  // DELETE /batches/:id - Delete a batch
  delete: (id) => api.delete(`/batches/${id}`),
};