import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../api/dashboard';
import { eventsAPI } from '../../api/events';
import './Dashboard.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Skeleton({ height = 120 }) {
  return <div className="dashboard-skeleton" style={{ height }} aria-hidden="true" />;
}

function EmptyState({ title, text }) {
  return <div className="dashboard-empty"><strong>{title}</strong><p>{text}</p></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await dashboardAPI.getOverview();
      setOverview(response.data?.data || null);
      try { const ev = await eventsAPI.list(true); setEvents(ev.data?.data || []); } catch {}
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard data could not be loaded.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);
  const stats = overview?.kpis || {};
  const notifications = overview?.notifications || [];
  const needsAttention = notifications.length > 0;
  const initials = (user?.name || 'Owner').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const pipeline = overview?.enquiries?.pipeline || {};
  const pulse = overview?.attendance || {};
  const batches = overview?.batches || [];
  const schedule = overview?.schedule || [];

  const quickActions = [
    { label: 'Add Student', to: '/owner/students', icon: '➕' },
    { label: 'Invite Student', to: '/owner/students', icon: '✉️' },
    { label: 'Create Batch', to: '/owner/batches', icon: '📦' },
    { label: 'Add Teacher', to: '/owner/teachers', icon: '👨‍🏫' },
    { label: 'Record Payment', to: '/owner/fees', icon: '💰' },
    { label: 'Installment Plan', to: '/owner/fees', icon: '💳' },
    { label: 'Add Enquiry', to: '/owner/enquiries', icon: '📞' },
  ];

  const pipelineStages = ['new', 'contacted', 'demo_scheduled', 'interested', 'admitted'];

  return (
    <div className="dashboard-page">
      <header className="dashboard-welcome">
        <div>
          <span className="eyebrow">OWNER OVERVIEW</span>
          <h2>{greeting}, {user?.name?.split(' ')[0] || 'there'} 👋</h2>
          <p>{user?.academyName || 'Your academy'} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="welcome-tools">
          <details className="dashboard-notifications">
            <summary aria-label={needsAttention ? 'Notifications, items need attention' : 'Notifications, all clear'}>🔔{needsAttention && <i />}</summary>
            <div className="notification-popover">
              <strong>{needsAttention ? 'Needs your attention' : 'All caught up'}</strong>
              {notifications.map((item) => <p key={item.id}>{item.message}</p>)}
              {overview && !needsAttention && <p>There are no dashboard alerts right now.</p>}
            </div>
          </details>
          <button className="dashboard-refresh" type="button" onClick={loadOverview} disabled={loading} aria-label="Refresh dashboard">↻</button>
        </div>
      </header>
      {error && <div className="dashboard-error" role="alert">{error}<button type="button" onClick={loadOverview}>Try again</button></div>}

      <section className="kpi-grid" aria-label="Business summary">
        <article className="kpi-card"><span className="kpi-icon violet">👥</span><div><span className="kpi-label">Total students</span><strong>{loading ? '—' : stats.students ?? 0}</strong><small>{stats.activeStudents ?? 0} active</small></div></article>
        <article className="kpi-card"><span className="kpi-icon purple">📦</span><div><span className="kpi-label">Active batches</span><strong>{loading ? '—' : stats.activeBatches ?? 0}</strong><small>Currently running</small></div></article>
        <article className="kpi-card"><span className="kpi-icon green">₹</span><div><span className="kpi-label">Monthly fee collection</span><strong>{loading ? '—' : money(stats.monthlyRevenue)}</strong><small>Recorded payments</small></div></article>
        <article className="kpi-card"><span className="kpi-icon orange">📞</span><div><span className="kpi-label">New enquiries</span><strong>{loading ? '—' : overview?.enquiries?.active ?? 0}</strong><small>Prospective students</small></div></article>
        <article className="kpi-card"><span className="kpi-icon blue">👨‍🏫</span><div><span className="kpi-label">Teachers</span><strong>{loading ? '—' : (overview?.teachers ?? 0)}</strong><small>Active staff</small></div></article>
      </section>

      <section className="dashboard-grid overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Today's Academy Pulse</h3><p>Live snapshot of today</p></div></div>
          {loading ? <Skeleton /> : (
            <div className="pulse-grid">
              <div><strong>{schedule.length}</strong><span>Classes today</span></div>
              <div><strong>{pulse.present ?? 0}</strong><span>Attendance marked</span></div>
              <div><strong>{pulse.absent ?? 0}</strong><span>Absent students</span></div>
              <div><strong>{money(stats.outstandingFees)}</strong><span>Fees due</span></div>
              <div><strong>{notifications.length}</strong><span>Pending follow-ups</span></div>
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h3>Smart Insights</h3><p>Auto-detected issues</p></div></div>
          {loading ? <Skeleton /> : (
            <ul className="insights-list">
              {(overview?.insights || []).map((i, idx) => <li key={idx}>{i}</li>)}
              {stats.outstandingFees > 0 && <li>{money(stats.outstandingFees)} in pending/overdue fees needs recovery.</li>}
              {(pulse.totalMarked ?? 0) === 0 && <li>No attendance recorded today yet.</li>}
            </ul>
          )}
        </article>
      </section>

      <section className="dashboard-grid overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Admission Pipeline</h3><p>Enquiry to admission</p></div></div>
          {loading ? <Skeleton /> : (
            <div className="pipeline">
              {pipelineStages.map((s) => (
                <div className="pipeline-stage" key={s}>
                  <strong>{pipeline[s] ?? 0}</strong>
                  <span>{s.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h3>Fee Recovery Center</h3><p>Pending & overdue</p></div><Link to="/owner/fees" className="text-link">View all →</Link></div>
          {loading ? <Skeleton /> : (
            <div className="fee-recovery">
              <div><span>Pending</span><strong>{money(overview?.fees?.pending)}</strong></div>
              <div><span>Overdue</span><strong>{money(overview?.fees?.overdue)}</strong></div>
              <div><span>Collected</span><strong>{money(overview?.fees?.collected)}</strong></div>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Batch Health Monitor</h3><p>Capacity & status</p></div><Link to="/owner/batches" className="text-link">View all →</Link></div>
          {loading ? <Skeleton height={180} /> : batches.length === 0 ? <EmptyState title="No batches" text="Create a batch to see health metrics." /> : (
            <div className="batch-health-list">
              {batches.map((b) => (
                <div className="batch-health-row" key={b.id}>
                  <div><strong>{b.name}</strong><span>{b.subject}</span></div>
                  <div>{b.students}/{b.capacity || '∞'} students</div>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h3>Teacher Activity</h3><p>Performance snapshot</p></div><Link to="/owner/teachers" className="text-link">View all →</Link></div>
          {loading ? <Skeleton /> : <EmptyState title="Teacher activity" text="Detailed teacher metrics will appear once teachers are assigned." />}
        </article>
      </section>

      <section className="dashboard-grid overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Today's Timetable</h3><p>Upcoming classes</p></div><Link to="/owner/batches" className="text-link">View all →</Link></div>
          {loading ? <Skeleton height={180} /> : schedule.length === 0 ? <EmptyState title="No classes today" text="No batches scheduled for today." /> : (
            <div className="timetable-list">
              {schedule.map((c, i) => (
                <div className="timetable-row" key={i}>
                  <strong>{c.timing}</strong>
                  <div><span>{c.name}</span><small>{c.subject}</small></div>
                  <span>{c.studentCount} students</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h3>Recent Activity</h3><p>Latest actions</p></div></div>
          {loading ? <Skeleton /> : (
            <div className="recent-enquiries-list">
              {(overview?.recentEnquiries || []).slice(0, 5).map((e) => (
                <div className="recent-enquiry-row" key={e._id}>
                  <div><strong>{e.studentName}</strong><span>{e.interestedCourse || 'Course not selected'}</span></div>
                  <span className={`enquiry-status status-${e.status}`}>{e.status?.replace('_', ' ')}</span>
                </div>
              ))}
              {(!overview?.recentEnquiries || overview.recentEnquiries.length === 0) && <EmptyState title="No recent activity" text="Activity will appear here as you use the app." />}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid overview-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Upcoming Events</h3><p>Exams & important dates</p></div><button className="text-link" type="button" onClick={() => alert('Event creation form coming soon')}>+ Add Event</button></div>
          {loading ? <Skeleton /> : events.length === 0 ? <EmptyState title="No upcoming events" text="Add events to track exams and holidays." /> : (
            <div className="recent-enquiries-list">
              {events.slice(0,5).map((e) => (
                <div className="recent-enquiry-row" key={e._id}>
                  <div><strong>{e.title}</strong><span>{new Date(e.startDate).toLocaleDateString('en-IN')} • {e.category}</span></div>
                  <span>{e.location}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel quick-actions-panel">
          <div className="panel-heading"><div><h3>Quick actions</h3><p>Common owner tasks</p></div></div>
          <div className="quick-actions-grid">
            {quickActions.map((a) => (
              <Link to={a.to} className="quick-action" key={a.label}>
                <span>{a.icon}</span><strong>{a.label}</strong>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid bottom-grid">
        <article className="panel">
          <div className="panel-heading"><div><h3>Admissions & growth</h3><p>Enrollment and fee activity by month</p></div><span className="panel-chip">Last 6 months</span></div>
          {loading ? <Skeleton height={250} /> : (overview?.revenue?.length ? <div className="owner-chart-scroll"><p className="empty-note">Chart data available ({overview.revenue.length} months).</p></div> : <EmptyState title="No data yet" text="Charts will appear when you record enrollments and fee payments." />)}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h3>Fee collection</h3><p>Payment status</p></div><Link to="/owner/students" className="text-link">View students →</Link></div>
          {loading ? <Skeleton /> : (
            <div className="fee-recovery">
              <div><span>Collected</span><strong>{money(overview?.fees?.collected)}</strong></div>
              <div><span>Pending</span><strong>{money(overview?.fees?.pending)}</strong></div>
              <div><span>Overdue</span><strong>{money(overview?.fees?.overdue)}</strong></div>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-footer-grid">
        <div className="dashboard-account"><span className="account-avatar">{initials}</span><div><strong>{user?.name || 'Owner account'}</strong><span>{user?.email || 'Owner'}</span></div><span className="account-role">Owner</span></div>
      </section>
    </div>
  );
}
