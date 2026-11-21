import api from './axios';

export const settingsAPI = {
  get: () => api.get('/settings'),
  updateProfile: (profile) => api.put('/settings/profile', profile),
  updateNotifications: (notifications) => api.put('/settings/notifications', { notifications }),
  updatePermissions: (permissions) => api.put('/settings/permissions', { permissions }),
  updateSubscription: (subscription) => api.put('/settings/subscription', subscription),
  changePassword: (currentPassword, newPassword) => api.put('/settings/password', { currentPassword, newPassword }),
};
