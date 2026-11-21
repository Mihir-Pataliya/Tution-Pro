import api from './axios';

export const feesAPI = {
  getAll: (params) => api.get('/fees', { params }),
  getOne: (id) => api.get(`/fees/${id}`),
  create: (data) => api.post('/fees', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  delete: (id) => api.delete(`/fees/${id}`),
  recordPayment: (data) => api.post('/fees/payments', data),
  getInstallmentPlan: (studentId) => api.get(`/fees/installment-plan/${studentId}`),
  createInstallmentPlan: (data) => api.post('/fees/installment-plan', data),
  updateInstallmentPlan: (studentId, data) => api.put(`/fees/installment-plan/${studentId}`, data),
  recordInstallmentPayment: (data) => api.post('/fees/installment-payment', data),
};