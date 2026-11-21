import api from './axios';

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  askCopilot: (question) => api.post('/dashboard/copilot', { question }),
};

export const attendanceAPI = {
  getForBatch: (batchId, date) => api.get('/attendance', { params: { batchId, ...(date ? { date } : {}) } }),
  saveForBatch: (batchId, records, date) => api.put('/attendance', { batchId, records, ...(date ? { date } : {}) }),
  getHistory: (batchId, days = 7) => api.get('/attendance/history', { params: { batchId, days } }),
};
