import React from 'react';
import './Toast.css';

const Toast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const getTypeClass = () => {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      default: return 'toast-info';
    }
  };

  return (
    <div className={`toast ${getTypeClass()}`}>
      <span>{message}</span>
      <button onClick={onClose} className="toast-close">&times;</button>
    </div>
  );
};

export default Toast;