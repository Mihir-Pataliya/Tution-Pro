import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const to = Number(target) || 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await studentPortalAPI.getOverview();
      setOverview(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard');
      showToast(err.response?.data?.message || 'Could not load dashboard');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const stats = overview?.stats || {};
  const todayClasses = overview?.todayClasses || [];
  const nextClass = overview?.nextClass;
  const pending = overview?.pendingAssignmentsList || [];
  const dueFees = overview?.dueFees || [];
  const activity = overview?.recentActivity || [];

  const c1 = useCountUp(loading ? 0 : (stats.attendancePct ?? 0));
  const c2 = useCountUp(loading ? 0 : (stats.pendingAssignments ?? 0));
  const c3 = useCountUp(loading ? 0 : (stats.dueFeesCount ?? 0));

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className='premium-page teacher-dashboard'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>STUDENT PORTAL</span>
          <h2>Welcome back{user?.name ? `, ${user.name}` : ''} 👋</h2>
          <p>{user?.tuitionName || 'Your academy'} · {todayName}</p>
        </div>
        <div className='welcome-tools'>
          <button className='dashboard-refresh' onClick={load} aria-label='Refresh'>↻</button>
        </div>
      </header>

      {error && <div className='empty-state'><div className='empty-icon'>⚠️</div><h3>Could not load</h3><p>{error}</p></div>}

      <section className='stats-grid'>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#eef2ff', color: '#4f46e5' }}>📅</div><div><span>Attendance</span><strong>{loading ? '—' : `${c1}%`}</strong><small>{stats.totalAttendance ?? 0} records</small></div></article>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#ecfdf5', color: '#059669' }}>📝</div><div><span>Pending assignments</span><strong>{loading ? '—' : c2}</strong><small>Open tasks</small></div></article>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#fff7ed', color: '#ea580c' }}>💳</div><div><span>Fees due</span><strong>{loading ? '—' : c3}</strong><small>₹{stats.feesDueAmount ?? 0}</small></div></article>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#f5f3ff', color: '#7c3aed' }}>📚</div><div><span>My classes</span><strong>{loading ? '—' : (stats.batches ?? 0)}</strong><small>Assigned batches</small></div></article>
      </section>
      <section className='dashboard-grid top-grid' style={{ marginTop: 14 }}>
        <article className='panel'>
          <div className='panel-heading'><div><h3>Today's classes</h3><p>{todayName}</p></div><Link to='/student/timetable' className='text-link'>View all →</Link></div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 3 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : todayClasses.length === 0 ? (
            <div className='empty-state'><div className='empty-icon'>📅</div><h3>No classes today</h3><p>Enjoy your day off.</p></div>
          ) : (
            <div className='recent-enquiries-list'>
              {todayClasses.map((b) => (
                <div className='recent-enquiry-row' key={b.id}><div><strong>{b.name}</strong><span>{b.subject || 'Subject'} · {b.timing || 'Timing not set'}</span></div></div>
              ))}
            </div>
          )}
        </article>

        <article className='panel'>
          <div className='panel-heading'><div><h3>Next class</h3><p>Upcoming</p></div></div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 2 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : !nextClass ? (
            <div className='empty-state'><div className='empty-icon'>⏭️</div><h3>No upcoming class</h3><p>No batches assigned.</p></div>
          ) : (
            <div className='recent-enquiries-list'>
              <div className='recent-enquiry-row'><div><strong>{nextClass.name}</strong><span>{nextClass.subject || 'Subject'} · {(nextClass.days || []).join(', ') || 'Days not set'} · {nextClass.timing || 'Timing not set'}</span></div><span className='panel-chip'>Next</span></div>
            </div>
          )}
        </article>
      </section>

      <section className='dashboard-grid bottom-grid' style={{ marginTop: 14 }}>
        <article className='panel'>
          <div className='panel-heading'><div><h3>Pending assignments</h3><p>Upcoming deadlines</p></div><Link to='/student/assignments' className='text-link'>View all →</Link></div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 3 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : pending.length === 0 ? (
            <div className='empty-state'><div className='empty-icon'>✅</div><h3>No pending assignments</h3><p>You're all caught up.</p></div>
          ) : (
            <div className='recent-enquiries-list'>
              {pending.map((a) => (
                <div className='recent-enquiry-row' key={a.id}><div><strong>{a.title}</strong><span>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</span></div></div>
              ))}
            </div>
          )}
        </article>

        <article className='panel'>
          <div className='panel-heading'><div><h3>Fees due</h3><p>Payment status</p></div><Link to='/student/fees' className='text-link'>View all →</Link></div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 3 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : dueFees.length === 0 ? (
            <div className='empty-state'><div className='empty-icon'>✅</div><h3>No fees due</h3><p>All payments are up to date.</p></div>
          ) : (
            <div className='recent-enquiries-list'>
              {dueFees.map((f) => (
                <div className='recent-enquiry-row' key={f.id}><div><strong>₹{f.amount}</strong><span>{f.description || 'Fee'} · Due {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}</span></div><span className='panel-chip'>{f.status}</span></div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className='dashboard-grid bottom-grid' style={{ marginTop: 14 }}>
        <article className='panel'>
          <div className='panel-heading'><div><h3>Recent notifications</h3><p>Latest updates</p></div><Link to='/student/notifications' className='text-link'>View all →</Link></div>
          {activity.length ? (
            <div className='recent-enquiries-list'>
              {activity.map((a, i) => (
                <div className='recent-enquiry-row' key={i}><div><strong>{a.title}</strong><span>{a.at ? new Date(a.at).toLocaleString() : ''}</span></div></div>
              ))}
            </div>
          ) : <div className='empty-state'><div className='empty-icon'>🔔</div><h3>No notifications</h3><p>Updates will appear here.</p></div>}
        </article>

        <article className='panel quick-actions-panel'>
          <div className='panel-heading'><div><h3>Quick actions</h3><p>Common tasks</p></div></div>
          <div className='quick-actions-grid'>
            <Link to='/student/attendance' className='quick-action action-blue'><span>✓</span><strong>My attendance</strong><small>View records</small></Link>
            <Link to='/student/assignments' className='quick-action action-green'><span>＋</span><strong>Assignments</strong><small>View tasks</small></Link>
            <Link to='/student/materials' className='quick-action action-violet'><span>📎</span><strong>Study materials</strong><small>Access resources</small></Link>
            <Link to='/student/messages' className='quick-action action-orange'><span>✉</span><strong>Messages</strong><small>Contact academy</small></Link>
          </div>
        </article>
      </section>
    </div>
  );
}