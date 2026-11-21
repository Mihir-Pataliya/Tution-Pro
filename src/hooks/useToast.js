import React, { useCallback, useState } from 'react';
import Toast from '../components/Toast';

const useToast = () => {
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 4000);
  }, []);

  const ToastComponent = useCallback(() => (
    toast.message ? <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} /> : null
  ), [toast]);

  return { showToast, ToastComponent };
};

export default useToast;
