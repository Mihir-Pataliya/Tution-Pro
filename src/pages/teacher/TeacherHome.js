import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function TeacherHome() {
  const { user, logout } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f1836', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ width: 'min(560px, 100%)', background: '#fff', borderRadius: 18, padding: 28 }}>
        <span style={{ fontSize: 12, letterSpacing: 2, color: '#6b7390' }}>TEACHER</span>
        <h2 style={{ margin: '6px 0', color: '#1a2340' }}>Welcome{user?.name ? `, ${user.name}` : ''} 👋</h2>
        <p style={{ color: '#59637b' }}>You joined <strong>{user?.tuitionName || 'your academy'}</strong> as a teacher ({user?.email}). Your full teacher workspace is coming next — for now your login is active.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Link to="/login" onClick={(e) => { e.preventDefault(); logout(); }} style={{ padding: '10px 16px', borderRadius: 10, background: '#555fc4', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Sign out</Link>
        </div>
      </div>
    </div>
  );
}
