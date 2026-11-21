import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { teacherAPI } from '../api/teacherApi';
import '../layouts/TeacherLayout.css';

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  classes: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  attendance: <><path d="M8 2v4m8-4v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="m9 16 2 2 4-4" /></>,
  students: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  assignments: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
  materials: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  messages: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
  timetable: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  profile: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  brand: <><path d="m2 10 10-6 10 6-10 6-10-6Z" /><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
};

function ShellIcon({ name, size = 20, className = '' }) {
  return <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}

const TeacherLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    teacherAPI.getMessages().then((res) => {
      if (!active) return;
      const msgs = res.data?.data || [];
      const count = msgs.filter((m) => !m.read && (m.recipient?.role === 'teacher')).length;
      setUnread(count);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const links = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/teacher/classes', label: 'My Classes', icon: 'classes' },
    { to: '/teacher/attendance', label: 'Attendance', icon: 'attendance' },
    { to: '/teacher/students', label: 'My Students', icon: 'students' },
    { to: '/teacher/assignments', label: 'Assignments', icon: 'assignments' },
    { to: '/teacher/materials', label: 'Study Material', icon: 'materials' },
    { to: '/teacher/messages', label: 'Messages', icon: 'messages' },
    { to: '/teacher/timetable', label: 'Timetable', icon: 'timetable' },
    { to: '/teacher/profile', label: 'Profile', icon: 'profile' },
  ];

  const initials = (user?.name || 'T').split(' ').map((p) => p[0]).join('').slice(0,2).toUpperCase();

  return <div className='teacher-layout'>
    <header className='teacher-header'>
      <div className='header-left'>
        <button className='menu-toggle' onClick={() => setSidebarOpen((open) => !open)} aria-label='Toggle navigation'><ShellIcon name='menu' size={20} /></button>
        <div className='brand'>
          <span className='brand-mark'><ShellIcon name='brand' size={20} /></span>
          <div className='brand-text'><strong>TuitionPro</strong><small>Teacher workspace</small></div>
        </div>
      </div>
      <div className='header-actions'>
        <NotificationBell />
        <div className='profile-wrap'>
          <button className='profile-trigger' onClick={() => setProfileOpen((v) => !v)} aria-haspopup='menu' aria-expanded={profileOpen}>
            <span className='avatar'>{initials}</span>
            <div className='profile-meta'><strong>{user?.name || 'Teacher'}</strong><small>{user?.role || 'teacher'}</small></div>
          </button>
          {profileOpen && (
            <div className='profile-dropdown' role='menu'>
              <Link to='/teacher/profile' onClick={() => setProfileOpen(false)}>Profile</Link>
              <Link to='/teacher/dashboard' onClick={() => setProfileOpen(false)}>Dashboard</Link>
              <div className='divider' />
              <button className='danger' onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
    <div className='teacher-workspace'>
      <aside className={`teacher-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className='sidebar-brand'>
          <span className='brand-icon'><ShellIcon name='brand' size={20} /></span>
          <div><strong>TuitionPro</strong><small>{user?.tuitionName || 'Academy'}</small></div>
        </div>
        <nav aria-label='Teacher navigation'>{links.map(({ to, label, icon }) => <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className='nav-icon'><ShellIcon name={icon} /></span><span className='nav-label'>{label}</span></NavLink>)}</nav>
        <div className='sidebar-footer'>
          <span className='plan-icon'><ShellIcon name='brand' size={16} /></span>
          <strong>Teacher workspace</strong>
          <small>{user?.subject || 'Educator'}</small>
        </div>
      </aside>
      {sidebarOpen && <button className='sidebar-overlay' aria-label='Close navigation' onClick={() => setSidebarOpen(false)} />}
      <main className='main-content'><Outlet /></main>
    </div>
  </div>;
};

export default TeacherLayout;