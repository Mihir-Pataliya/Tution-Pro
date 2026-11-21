import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = ['owner', 'admin'] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
    return <div role='alert' style={{ padding: 32, fontFamily: 'sans-serif', color: '#252b45' }}>You don’t have permission to access the owner workspace.</div>;
  }

  return children;
};

export default ProtectedRoute;