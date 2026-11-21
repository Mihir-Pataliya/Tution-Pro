import React, { useEffect, useMemo, useState } from 'react';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

const emptyForm = { title: '', description: '', batchId: '', dueDate: '', status: 'open' };
const isOverdue = (a) => a.status === 'open' && a.dueDate && new Date(a.dueDate) < new Date();

export default function Assignments() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showToast, ToastComponent } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, bRes] = await Promise.all([teacherAPI.getAssignments(), teacherAPI.getBatches()]);
      setItems(aRes.data?.data || []);
      setBatches(bRes.data?.data || []);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load assignments'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(emptyForm); setEditing(null); setFormOpen(false); };
  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', batchId: item.batchId?._id || item.batchId, dueDate: item.dueDate ? item.dueDate.slice(0,10) : '', status: item.status || 'open' });
    setFormOpen(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    const data = { title: form.title.trim(), description: form.description, batchId: form.batchId, dueDate: form.dueDate || null, status: form.status };
    setSaving(true);
    try {
      if (editing) await teacherAPI.updateAssignment(editing.id || editing._id, data);
      else await teacherAPI.createAssignment(data);
      showToast(editing ? 'Assignment updated' : 'Assignment created', 'success');
      reset(); load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to save assignment'); }
    finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try { await teacherAPI.deleteAssignment(id); showToast('Assignment deleted', 'success'); load(); }
    catch (err) { showToast(err.response?.data?.message || 'Failed to delete'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (batchFilter && (a.batchId?._id || a.batchId) !== batchFilter) return false;
      if (statusFilter === 'open' && a.status !== 'open') return false;
      if (statusFilter === 'closed' && a.status !== 'closed') return false;
      if (statusFilter === 'overdue' && !isOverdue(a)) return false;
      if (!q) return true;
      return [a.title, a.description, a.batchId?.name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, search, batchFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((a) => a.status === 'open').length,
    completed: items.filter((a) => a.status === 'closed').length,
    overdue: items.filter(isOverdue).length,
  }), [items]);

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>ASSIGNMENTS</span>
          <h2>Assignments</h2>
          <p>Create and manage homework for your classes.</p>
        </div>
        <button type='button' className='btn-ripple btn-primary-sm' style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }} onClick={openAdd}>+ Create Assignment</button>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>A</span><div><span>Total</span><strong>{loading ? '—' : stats.total}</strong><small>All assignments</small></div></article>
        <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Active</span><strong>{loading ? '—' : stats.active}</strong><small>Open</small></div></article>
        <article className='stat-card'><span className='stat-icon blue'>✓</span><div><span>Completed</span><strong>{loading ? '—' : stats.completed}</strong><small>Closed</small></div></article>
        <article className='stat-card'><span className='stat-icon orange'>!</span><div><span>Overdue</span><strong>{loading ? '—' : stats.overdue}</strong><small>Past due</small></div></article>
      </section>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span>🔍</span>
          <input placeholder='Search assignments…' value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <option value='open'>Active</option>
            <option value='closed'>Completed</option>
            <option value='overdue'>Overdue</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>A</div>
          <h3>No assignments found</h3>
          <p>Create an assignment to get started.</p>
        </div>
      ) : (
        <div className='assignment-cards-grid'>
          {filtered.map((a) => {
            const overdue = isOverdue(a);
            return (
              <article className='assignment-card' key={a.id || a._id}>
                <div className='assignment-card-head'>
                  <div>
                    <strong>{a.title}</strong>
                    <span>{a.batchId?.name || '—'} · {a.status === 'closed' ? 'Completed' : overdue ? 'Overdue' : 'Active'}</span>
                  </div>
                  <span className={`status-badge ${a.status === 'closed' ? 'active' : overdue ? 'inactive' : 'active'}`}>{a.status === 'closed' ? 'Closed' : overdue ? 'Overdue' : 'Open'}</span>
                </div>
                {a.description && <p className='assignment-desc'>{a.description}</p>}
                <div className='assignment-meta'>
                  <span>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</span>
                  <span>Created: {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <div className='progress-wrap'>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: a.status === 'closed' ? '100%' : '40%' }} /></div>
                  <small>{a.status === 'closed' ? 'Completed' : 'In progress'}</small>
                </div>
                <div className='class-actions'>
                  <button type='button' className='btn-ripple btn-secondary-sm' onClick={() => openEdit(a)}>Edit</button>
                  <button type='button' className='btn-ripple btn-secondary-sm' onClick={() => showToast('Submission review is not available in the current backend.', 'info')}>Submissions</button>
                  <button type='button' className='btn-ripple btn-secondary-sm' style={{ color: '#dc2626' }} onClick={() => remove(a.id || a._id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className='premium-modal-backdrop' onClick={reset}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>ASSIGNMENT</span>
                <h3>{editing ? 'Edit Assignment' : 'Create Assignment'}</h3>
              </div>
              <button className='modal-close' onClick={reset}>×</button>
            </div>
            <form className='premium-form' onSubmit={submit}>
              <div className='form-group'><label>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className='form-group'><label>Batch *</label><select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required><option value=''>Choose batch</option>{batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}</select></div>
              <div className='form-group'><label>Due date</label><input type='date' value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div className='form-group'><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value='open'>Open</option><option value='closed'>Closed</option></select></div>
              <div className='form-group'><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Save')}</button>
                <button type='button' className='cancel-button' onClick={reset}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}