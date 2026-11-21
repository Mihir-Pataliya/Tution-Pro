import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import '../components/OwnerLayout.css';

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  students: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  batches: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  attendance: <><path d="M8 2v4m8-4v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="m9 16 2 2 4-4" /></>,
  fees: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18m-14 5h4" /></>,
  payroll: <><circle cx="12" cy="8" r="7" /><path d="M5.21 17.04l7-3.61 7 3.61" /></>,
  enquiries: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  teachers: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6L6.3 16l1.4-1.1a8 8 0 0 1 0-1.8L6.3 12l1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8H14l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9Z" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  brand: <><path d="m2 10 10-6 10 6-10 6-10-6Z" /><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" /></>,
};

function ShellIcon({ name, size = 20, className = '' }) {
  return <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const links = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/owner/students', label: 'Students', icon: 'students' },
    { to: '/owner/batches', label: 'Batches', icon: 'batches' },
    { to: '/owner/teachers', label: 'Teachers', icon: 'teachers' },
    { to: '/owner/attendance', label: 'Attendance', icon: 'attendance' },
    { to: '/owner/fees', label: 'Fees & Payments', icon: 'fees' },
    { to: '/owner/payroll', label: 'Teacher Payroll', icon: 'payroll' },
    { to: '/owner/enquiries', label: 'Enquiries', icon: 'enquiries' },
    { to: '/owner/events', label: 'Events & Calendar', icon: 'calendar' },
    { to: '/owner/settings', label: 'Settings & Subscription', icon: 'settings' },
  ];

  return <div className='owner-layout'>
    <header className='header'>
      <button className='menu-toggle' onClick={() => setSidebarOpen((open) => !open)} aria-label='Toggle navigation'><ShellIcon name='menu' size={21} /></button>
      <h1><span className='header-brand-mark'><ShellIcon name='brand' size={22} /></span> TuitionPro</h1>
      <div className='header-right'><NotificationBell /><span className='header-user'><strong>{user?.name || 'Account'}</strong><small>{user?.role || 'Owner'}</small></span><button onClick={handleLogout} className='btn-logout'>Logout</button></div>
    </header>
    <div className='owner-workspace'>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className='sidebar-brand'><span><ShellIcon name='brand' size={21} /></span><div><strong>TuitionPro</strong><small>Owner dashboard</small></div></div>
        <nav aria-label='Owner navigation'>{links.map(({ to, label, icon }) => <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className='nav-icon'><ShellIcon name={icon} /></span><span className='nav-label'>{label}</span></NavLink>)}</nav>
        <div className='sidebar-footer'><span className='plan-icon'><ShellIcon name='brand' size={18} /></span><strong>Owner workspace</strong><small>Private tuition data</small></div>
      </aside>
      {sidebarOpen && <button className='sidebar-overlay' aria-label='Close navigation' onClick={() => setSidebarOpen(false)} />}
      <main className='main-content'><Outlet /></main>
    </div>
  </div>;
};

export default OwnerLayout;
