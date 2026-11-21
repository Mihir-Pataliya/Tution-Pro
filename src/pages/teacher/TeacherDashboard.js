import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { teacherAPI } from '../../api/teacherApi';
import api from '../../api/axios';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

const subjectIcon = (subject = '') => {
  const s = String(subject).toLowerCase();
  if (s.includes('math')) return '📐';
  if (s.includes('sci')) return '🔬';
  if (s.includes('eng')) return '📖';
  if (s.includes('hist')) return '🏛️';
  if (s.includes('comp') || s.includes('code')) return '💻';
  if (s.includes('art')) return '🎨';
  if (s.includes('phys')) return '⚛️';
  if (s.includes('chem')) return '🧪';
  if (s.includes('bio')) return '🧬';
  return '📚';
};

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

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [overview, setOverview] = useState(null);
  const [batches, setBatches] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [oRes, bRes, aRes, eRes] = await Promise.all([
        teacherAPI.getOverview(),
        teacherAPI.getBatches(),
        teacherAPI.getAssignments(),
        api.get('/teacher-events'),
      ]);
      setOverview(oRes.data?.data || null);
      setBatches(bRes.data?.data || []);
      setAssignments(aRes.data?.data || []);
      setEvents(eRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard');
      showToast(err.response?.data?.message || 'Could not load dashboard');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const stats = overview?.stats || {};
  const activity = overview?.recentActivity || [];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const pendingAssignments = assignments.filter((a) => a.status !== 'closed').length;

  const c1 = useCountUp(loading ? 0 : (stats.assignedBatches ?? batches.length ?? 0));
  const c2 = useCountUp(loading ? 0 : (stats.assignedStudents ?? 0));
  const c3 = useCountUp(loading ? 0 : (stats.presentToday ?? 0));
  const c4 = useCountUp(loading ? 0 : pendingAssignments);

  const attendanceTotal = stats.totalAttendanceToday ?? 0;

  return (
    <div className='premium-page teacher-dashboard'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>TEACHER WORKSPACE</span>
          <h2>Welcome back{user?.name ? `, ${user.name}` : ''} 👋</h2>
          <p>{user?.tuitionName || 'Your academy'} · {user?.subject || 'Teacher'} · {todayName}</p>
        </div>
        <div className='welcome-tools'>
          <button className='dashboard-refresh' onClick={load} disabled={loading} aria-label='Refresh'>↻</button>
        </div>
      </header>

      {error && <div className='dashboard-error'><span>{error}</span><button onClick={load}>Retry</button></div>}

      <section className='stats-grid'>
        <article className='stat-card'>
          <span className='stat-icon violet' aria-hidden='true'>▦</span>
          <div><span>My Classes</span><strong>{loading ? '—' : c1}</strong><small>Assigned batches</small></div>
        </article>
        <article className='stat-card'>
          <span className='stat-icon blue' aria-hidden='true'>♙</span>
          <div><span>Total Students</span><strong>{loading ? '—' : c2}</strong><small>Across your classes</small></div>
        </article>
        <article className='stat-card'>
          <span className='stat-icon green' aria-hidden='true'>✓</span>
          <div><span>Attendance</span><strong>{loading ? '—' : c3}</strong><small>{attendanceTotal ? `of ${attendanceTotal} marked today` : 'Marked today'}</small></div>
        </article>
        <article className='stat-card'>
          <span className='stat-icon orange' aria-hidden='true'>✕</span>
          <div><span>Pending Assignments</span><strong>{loading ? '—' : c4}</strong><small>Open tasks</small></div>
        </article>
      </section>

      <section className='dashboard-grid overview-grid'>
        <article className='panel'>
          <div className='panel-heading'><div><h3>My Classes</h3><p>Your assigned batches</p></div><span className='panel-chip'>{batches.length} batches</span></div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 3 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : batches.length === 0 ? (
            <div className='empty-state'><div className='empty-icon'>▦</div><h3>No classes assigned</h3><p>Ask your academy owner to assign batches.</p></div>
          ) : (
            <div className='class-cards-grid'>
              {batches.map((b) => {
                const count = b.studentCount ?? 0;
                const max = b.maxStudents || 30;
                const pct = Math.min(100, Math.round((count / max) * 100));
                const isToday = (b.days || []).some((d) => String(d).toLowerCase().startsWith(todayName.slice(0,3).toLowerCase()));
                return (
                  <div className={`class-card ${isToday ? 'is-today' : ''}`} key={b.id || b._id}>
                    <div className='class-card-head'>
                      <span className='class-subject-icon'>{subjectIcon(b.subject)}</span>
                      <div>
                        <strong>{b.name}</strong>
                        <span>{b.subject || 'Subject'} {isToday ? '· Today' : ''}</span>
                      </div>
                    </div>
                    <div className='class-meta'>
                      <span>👥 {count}/{max} students</span>
                      <span>⏰ {b.timing || 'Timing not set'}</span>
                      <span>📅 {(b.days || []).join(', ') || 'Days not set'}</span>
                    </div>
                    <div className='progress-wrap'>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: `${pct}%` }} /></div>
                      <small>{pct}% filled</small>
                    </div>
                    <div className='class-actions'>
                      <Link to='/teacher/attendance' className='btn-ripple btn-primary-sm'>Attendance</Link>
                      <Link to='/teacher/assignments' className='btn-ripple btn-secondary-sm'>Assignments</Link>
                      <Link to='/teacher/materials' className='btn-ripple btn-secondary-sm'>Materials</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className='panel quick-actions-panel'>
          <div className='panel-heading'><div><h3>Quick actions</h3><p>Common teacher tasks</p></div></div>
          <div className='quick-actions-grid'>
            <Link to='/teacher/attendance' className='quick-action action-blue'><span>✓</span><strong>Mark attendance</strong><small>Record today's class</small></Link>
            <Link to='/teacher/assignments' className='quick-action action-green'><span>＋</span><strong>Create assignment</strong><small>Assign homework</small></Link>
            <Link to='/teacher/materials' className='quick-action action-violet'><span>📎</span><strong>Upload material</strong><small>Share study resources</small></Link>
            <Link to='/teacher/messages' className='quick-action action-orange'><span>✉</span><strong>Message owner</strong><small>Send an update</small></Link>
          </div>
        </article>
      </section>

      <section className='panel' style={{marginTop:16}}>
        <div className='panel-heading'><div><h3>Upcoming Events</h3><p>Events for your batches and academy</p></div></div>
        {loading ? <div className='skeleton-list'>{Array.from({length:2}).map((_,i)=><div className='skeleton-row' key={i}/>)}</div> : events.length===0 ? <div className='empty-state'><div className='empty-icon'>📅</div><h3>No upcoming events</h3><p>Events will appear here when published.</p></div> : (
          <div className='recent-enquiries-list'>
            {events.slice(0,5).map(e=>(
              <div className='recent-enquiry-row' key={e._id}>
                <div><strong>{e.title}</strong><span>{new Date(e.startDate).toLocaleDateString()} {e.startTime} • {e.category} • {e.location}</span></div>
              </div>
            ))}
          </div>
         )}
      </section>
      <section className='dashboard-grid bottom-grid'>
        <article className='panel'>
          <div className='panel-heading'><div><h3>Recent activity</h3><p>Your latest actions</p></div></div>
          {activity.length ? (
            <div className='recent-enquiries-list'>
              {activity.map((a, i) => (
                <div className='recent-enquiry-row' key={i}>
                  <div><strong>{a.title}</strong><span>{a.at ? new Date(a.at).toLocaleString() : ''}</span></div>
                </div>
              ))}
            </div>
          ) : <div className='empty-state'><div className='empty-icon'>◎</div><h3>No recent activity</h3><p>Assignments, materials and messages will appear here.</p></div>}
        </article>
        <article className='panel'>
          <div className='panel-heading'><div><h3>Today's schedule</h3><p>{todayName}</p></div><Link to='/teacher/timetable' className='text-link'>View all →</Link></div>
          {batches.length ? (
            <div className='recent-enquiries-list'>
              {batches.filter((b) => (b.days || []).some((d) => String(d).toLowerCase().startsWith(todayName.slice(0,3).toLowerCase()))).map((b) => (
                <div className='recent-enquiry-row' key={b.id || b._id}>
                  <div><strong>{b.name}</strong><span>{b.subject || 'Subject'} · {b.timing || 'Timing not set'}</span></div>
                  <span className='panel-chip'>{b.studentCount ?? 0} students</span>
                </div>
              ))}
              {batches.filter((b) => (b.days || []).some((d) => String(d).toLowerCase().startsWith(todayName.slice(0,3).toLowerCase()))).length === 0 && (
                <div className='empty-state'><div className='empty-icon'>📅</div><h3>No classes today</h3><p>Enjoy your day off.</p></div>
              )}
            </div>
          ) : <div className='empty-state'><div className='empty-icon'>📅</div><h3>No classes</h3><p>You have no assigned batches yet.</p></div>}
        </article>
      </section>
    </div>
  );
}