import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../api/dashboard';
import { eventsAPI } from '../../api/events';
import { notesAPI } from '../../api/notes';
import useToast from '../../hooks/useToast';
import './Dashboard.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Skeleton({ height = 120 }) {
  return <div className="dashboard-skeleton" style={{ height }} aria-hidden="true" />;
}

function EmptyState({ title, text }) {
  return <div className="dashboard-empty"><strong>{title}</strong><p>{text}</p></div>;
}

const noteColors = [
  { id: 'amber', label: 'Amber', bg: '#fef3c7', border: '#fcd34d' },
  { id: 'emerald', label: 'Emerald', bg: '#d1fae5', border: '#6ee7b7' },
  { id: 'sky', label: 'Sky', bg: '#e0f2fe', border: '#7dd3fc' },
  { id: 'violet', label: 'Violet', bg: '#ede9fe', border: '#c4b5fd' },
  { id: 'rose', label: 'Rose', bg: '#ffe4e6', border: '#fda4af' },
  { id: 'slate', label: 'Slate', bg: '#f1f5f9', border: '#cbd5e1' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteModal, setNoteModal] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', description: '', color: 'amber' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);

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

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await notesAPI.getAll();
      setNotes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadNotes();
  }, [loadOverview, loadNotes]);

  const openCreateNote = () => {
    setNoteForm({ title: '', description: '', color: 'amber' });
    setNoteModal({ mode: 'create' });
  };

  const openEditNote = (note) => {
    setNoteForm({
      title: note.title || '',
      description: note.description || '',
      color: note.color || 'amber',
    });
    setNoteModal({ mode: 'edit', note });
  };

  const closeNoteModal = () => {
    if (noteSaving) return;
    setNoteModal(null);
    setNoteForm({ title: '', description: '', color: 'amber' });
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title.trim()) {
      showToast('Note title is required', 'error');
      return;
    }
    setNoteSaving(true);
    try {
      if (noteModal.mode === 'create') {
        const res = await notesAPI.create(noteForm);
        showToast(res.data?.message || 'Note created successfully', 'success');
      } else {
        const res = await notesAPI.update(noteModal.note._id, noteForm);
        showToast(res.data?.message || 'Note updated successfully', 'success');
      }
      closeNoteModal();
      await loadNotes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save note', 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await notesAPI.remove(id);
      showToast('Note deleted successfully', 'success');
      setDeleteNoteId(null);
      await loadNotes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete note', 'error');
    }
  };

  const formatNoteDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

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

      {/* Quick Notes Section */}
      <section className="dashboard-grid single-col-grid">
        <article className="panel quick-notes-panel">
          <div className="panel-heading">
            <div>
              <h3>📌 Quick Notes</h3>
              <p>Your private reminders, tasks, and academy notes</p>
            </div>
            <button
              className="quick-notes-add-btn"
              type="button"
              onClick={openCreateNote}
            >
              ＋ Add Note
            </button>
          </div>

          {notesLoading ? (
            <Skeleton height={140} />
          ) : notes.length === 0 ? (
            <div className="quick-notes-empty">
              <span className="empty-notes-icon">📝</span>
              <strong>No notes saved yet</strong>
              <p>Jot down quick thoughts, payment follow-ups, or batch reminders.</p>
              <button
                type="button"
                className="quick-notes-empty-btn"
                onClick={openCreateNote}
              >
                ＋ Create your first note
              </button>
            </div>
          ) : (
            <div className="quick-notes-grid">
              {notes.map((note) => (
                <div key={note._id} className={`note-card note-card-${note.color || 'amber'}`}>
                  <div className="note-card-header">
                    <h4 className="note-card-title">{note.title}</h4>
                    <div className="note-card-actions">
                      <button
                        type="button"
                        className="note-action-btn edit"
                        title="Edit note"
                        onClick={() => openEditNote(note)}
                        aria-label="Edit note"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="note-action-btn delete"
                        title="Delete note"
                        onClick={() => setDeleteNoteId(note._id)}
                        aria-label="Delete note"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {note.description && (
                    <p className="note-card-desc">{note.description}</p>
                  )}
                  <div className="note-card-footer">
                    <span className="note-card-date">
                      {formatNoteDate(note.updatedAt || note.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Add / Edit Note Modal */}
      {noteModal && (
        <div className="note-modal-backdrop" role="presentation" onClick={closeNoteModal}>
          <div className="note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="note-modal-heading">
              <div>
                <span className="eyebrow">QUICK NOTE</span>
                <h3>{noteModal.mode === 'create' ? 'Add Quick Note' : 'Edit Note'}</h3>
              </div>
              <button type="button" aria-label="Close" onClick={closeNoteModal} disabled={noteSaving}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNote} className="note-form">
              <div className="note-form-group">
                <label htmlFor="note-title">Title *</label>
                <input
                  id="note-title"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="e.g. Call parent of Aarav for demo class"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="note-form-group">
                <label htmlFor="note-desc">Description</label>
                <textarea
                  id="note-desc"
                  rows={4}
                  maxLength={5000}
                  placeholder="Details, checklist items, or phone numbers..."
                  value={noteForm.description}
                  onChange={(e) => setNoteForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="note-form-group">
                <label>Color Theme</label>
                <div className="note-color-picker">
                  {noteColors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`color-choice-btn ${noteForm.color === c.id ? 'active' : ''}`}
                      style={{ background: c.bg, borderColor: c.border }}
                      onClick={() => setNoteForm((prev) => ({ ...prev, color: c.id }))}
                      title={c.label}
                    >
                      {noteForm.color === c.id && <span className="color-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="note-modal-actions">
                <button
                  type="button"
                  className="note-btn-secondary"
                  onClick={closeNoteModal}
                  disabled={noteSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="note-btn-primary"
                  disabled={noteSaving || !noteForm.title.trim()}
                >
                  {noteSaving ? 'Saving…' : noteModal.mode === 'create' ? 'Save Note' : 'Update Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteNoteId && (
        <div className="note-modal-backdrop" role="presentation" onClick={() => setDeleteNoteId(null)}>
          <div className="note-modal note-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="note-modal-heading">
              <div>
                <span className="eyebrow" style={{ color: '#ef4444' }}>DELETE NOTE</span>
                <h3>Are you sure?</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setDeleteNoteId(null)}>
                ✕
              </button>
            </div>
            <p className="delete-modal-text">
              This note will be permanently removed from your dashboard.
            </p>
            <div className="note-modal-actions">
              <button
                type="button"
                className="note-btn-secondary"
                onClick={() => setDeleteNoteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="note-btn-danger"
                onClick={() => handleDeleteNote(deleteNoteId)}
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
}
