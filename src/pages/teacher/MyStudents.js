import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import { studentInviteAPI } from '../../api/studentInvites';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

export default function MyStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', batchIds: [] });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    Promise.allSettled([teacherAPI.getStudents(), teacherAPI.getBatches(), studentInviteAPI.list()])
      .then(([sRes, bRes, iRes]) => {
        if (!active) return;
        setStudents(sRes.status === 'fulfilled' ? (sRes.value.data?.data || []) : []);
        setBatches(bRes.status === 'fulfilled' ? (bRes.value.data?.data || []) : []);
        setInvitations(iRes.status === 'fulfilled' ? (iRes.value.data?.data || []) : []);
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load students'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('batch');
    if (b) setBatchFilter(b);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (batchFilter && (s.batchId?._id || s.batchId) !== batchFilter) return false;
      if (statusFilter === 'active' && s.isActive === false) return false;
      if (statusFilter === 'inactive' && s.isActive !== false) return false;
      if (!q) return true;
      return [s.name, s.parentName, s.parentPhone, s.batchId?.name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [students, search, batchFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.isActive !== false).length;
    return { total, active, inactive: total - active, batches: batches.length };
  }, [students, batches]);

  const batchName = (s) => s.batchId?.name || batches.find((b) => (b.id || b._id) === (s.batchId?._id || s.batchId))?.name || 'N/A';

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>STUDENT DIRECTORY</span>
          <h2>My Students</h2>
          <p>Students across your assigned classes.</p>
        </div>
        <button type='button' className='btn-ripple btn-primary-sm' style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }} onClick={() => setInviteOpen(true)}>+ Invite Student</button>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>♙</span><div><span>Total Students</span><strong>{loading ? '—' : stats.total}</strong><small>All assigned</small></div></article>
        <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Active</span><strong>{loading ? '—' : stats.active}</strong><small>Currently enrolled</small></div></article>
        <article className='stat-card'><span className='stat-icon orange'>✕</span><div><span>Inactive</span><strong>{loading ? '—' : stats.inactive}</strong><small>Not active</small></div></article>
        <article className='stat-card'><span className='stat-icon blue'>▦</span><div><span>Batches</span><strong>{loading ? '—' : stats.batches}</strong><small>Your classes</small></div></article>
      </section>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span>🔍</span>
          <input placeholder='Search by name, parent, phone…' value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value=''>All Batches</option>
            {batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className='filter-group'>
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value='all'>All</option>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>♙</div>
          <h3>No students found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className='student-cards-grid'>
          {filtered.map((s) => {
            const id = s.id || s._id;
            return (
              <article className='student-card' key={id}>
                <div className='student-card-head'>
                  <span className='avatar-lg'>{(s.name || '?')[0].toUpperCase()}</span>
                  <div>
                    <strong>{s.name || 'Unnamed student'}</strong>
                    <span className={`status-badge ${s.isActive === false ? 'inactive' : 'active'}`}>{s.isActive === false ? 'Inactive' : 'Active'}</span>
                  </div>
                </div>
                <div className='student-details'>
                  <div><label>Student ID</label><span>{String(id).slice(-6).toUpperCase()}</span></div>
                  <div><label>Batch</label><span>{batchName(s)}</span></div>
                  <div><label>Parent</label><span>{s.parentName || '—'}</span></div>
                  <div><label>Phone</label><span>{s.parentPhone || '—'}</span></div>
                  <div><label>Monthly Fee</label><span>₹{s.monthlyFee || 0}</span></div>
                </div>
                <div className='class-actions'>
                  <button type='button' className='btn-ripple btn-secondary-sm' onClick={() => setSelected(s)}>View Profile</button>
                  <Link to={`/teacher/attendance?batch=${s.batchId?._id || s.batchId}`} className='btn-ripple btn-primary-sm'>View Attendance</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <div className='premium-modal-backdrop' onClick={() => setSelected(null)}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>STUDENT PROFILE</span>
                <h3>{selected.name}</h3>
              </div>
              <button className='modal-close' onClick={() => setSelected(null)}>×</button>
            </div>
            <div className='student-details modal-details'>
              <div><label>Student ID</label><span>{String(selected.id || selected._id).slice(-6).toUpperCase()}</span></div>
              <div><label>Batch</label><span>{batchName(selected)}</span></div>
              <div><label>Parent</label><span>{selected.parentName || '—'}</span></div>
              <div><label>Phone</label><span>{selected.parentPhone || '—'}</span></div>
              <div><label>Monthly Fee</label><span>₹{selected.monthlyFee || 0}</span></div>
              <div><label>Age</label><span>{selected.age || '—'}</span></div>
              <div><label>Status</label><span>{selected.isActive === false ? 'Inactive' : 'Active'}</span></div>
            </div>
          </div>
        </div>
)}
      <section className='panel' style={{ marginTop: 14 }}>
        <div className='panel-heading'><div><h3>Student Invitations</h3><p>Pending and recent invitations</p></div></div>
        {invitations.length === 0 ? (
          <div className='empty-state'><div className='empty-icon'>✉</div><h3>No invitations</h3><p>Invite students to join your classes.</p></div>
        ) : (
          <div className='recent-enquiries-list'>
            {invitations.map((inv) => (
              <div className='recent-enquiry-row' key={inv.id || inv._id}>
                <div>
                  <strong>{inv.name}</strong>
                  <span>{inv.email} · {inv.status}{inv.expiresAt ? ' · expires ' + new Date(inv.expiresAt).toLocaleDateString() : ''}</span>
                </div>
                <div className='class-actions'>
                  {inv.status === 'pending' && <button type='button' className='btn-ripple btn-secondary-sm' onClick={async () => { try { await studentInviteAPI.resend(inv.id || inv._id); showToast('Invitation resent', 'success'); } catch (e) { showToast(e.response?.data?.message || 'Failed'); } }}>Resend</button>}
                  {inv.status === 'pending' && <button type='button' className='btn-ripple btn-secondary-sm' style={{ color: '#dc2626' }} onClick={async () => { try { await studentInviteAPI.cancel(inv.id || inv._id); showToast('Cancelled', 'success'); setInvitations((prev) => prev.map((x) => (x.id || x._id) === (inv.id || inv._id) ? { ...x, status: 'cancelled' } : x)); } catch (e) { showToast(e.response?.data?.message || 'Failed'); } }}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {inviteOpen && (
        <div className='premium-modal-backdrop' onClick={() => setInviteOpen(false)}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div><span className='eyebrow'>INVITE STUDENT</span><h3>Invite a student</h3></div>
              <button className='modal-close' onClick={() => setInviteOpen(false)}>×</button>
            </div>
            <form className='premium-form' onSubmit={async (e) => {
              e.preventDefault();
              setInviteSaving(true);
              try {
                const res = await studentInviteAPI.create({ name: inviteForm.name, email: inviteForm.email, phone: inviteForm.phone, batchIds: inviteForm.batchIds });
                showToast(res.data?.message || 'Invitation sent', 'success');
                setInviteOpen(false);
                setInviteForm({ name: '', email: '', phone: '', batchIds: [] });
                const r = await studentInviteAPI.list();
                setInvitations(r.data?.data || []);
              } catch (err) { showToast(err.response?.data?.message || 'Failed to invite'); }
              finally { setInviteSaving(false); }
            }}>
              <div className='form-group'><label>Name *</label><input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} required /></div>
              <div className='form-group'><label>Email *</label><input type='email' value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required /></div>
              <div className='form-group'><label>Phone</label><input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} /></div>
              <div className='form-group'>
                <label>Batches</label>
                <select multiple value={inviteForm.batchIds} onChange={(e) => setInviteForm({ ...inviteForm, batchIds: Array.from(e.target.selectedOptions, (o) => o.value) })} style={{ minHeight: 90 }}>
                  {batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={inviteSaving}>{inviteSaving ? 'Sending…' : 'Send Invitation'}</button>
                <button type='button' className='cancel-button' onClick={() => setInviteOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
