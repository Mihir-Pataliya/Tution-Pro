import React, { useEffect, useMemo, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const isOverdue = (a) => a.status === 'open' && a.dueDate && new Date(a.dueDate) < new Date();

export default function StudentAssignments() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showToast, ToastComponent } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, bRes] = await Promise.all([studentPortalAPI.getAssignments(), studentPortalAPI.getBatches()]);
      setItems(aRes.data?.data || []);
      setBatches(bRes.data?.data || []);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load assignments'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

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

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>ACADEMICS</span>
          <h2>Assignments</h2>
          <p>Your class assignments and deadlines.</p>
        </div>
      </header>

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
            <option value='open'>Open</option>
            <option value='closed'>Closed</option>
            <option value='overdue'>Overdue</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>📝</div>
          <h3>No assignments found</h3>
          <p>Your assignments will appear here.</p>
        </div>
      ) : (
        <div className='class-cards-grid'>
          {filtered.map((a) => {
            const overdue = isOverdue(a);
            return (
              <article className='class-card' key={a.id || a._id}>
                <div className='class-card-head'>
                  <span className='class-subject-icon'>📝</span>
                  <div>
                    <strong>{a.title}</strong>
                    <span>{a.batchId?.name || '—'}</span>
                  </div>
                </div>
                {a.description && <p className='assignment-desc'>{a.description}</p>}
                <div className='assignment-meta'>
                  <span>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</span>
                  <span>Created: {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <div className='progress-wrap'>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: a.status === 'closed' ? '100%' : '40%' }} /></div>
                  <small>{a.status === 'closed' ? 'Completed' : overdue ? 'Overdue' : 'In progress'}</small>
                </div>
                <div className='class-actions'>
                  <span className={`status-badge ${a.status === 'closed' ? 'active' : overdue ? 'inactive' : 'active'}`}>{a.status === 'closed' ? 'Closed' : overdue ? 'Overdue' : 'Open'}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}