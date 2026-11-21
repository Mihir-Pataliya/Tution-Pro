import api from './axios';
export const eventsAPI = {
  list: (upcoming) => api.get('/events', { params: upcoming ? { upcoming: 'true' } : {} }),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  remove: (id) => api.delete(`/events/${id}`),
};
