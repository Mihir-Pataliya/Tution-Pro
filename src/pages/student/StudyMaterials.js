import React, { useEffect, useMemo, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const typeIcon = (m) => {
  const url = String(m.url || '').toLowerCase();
  if (m.type === 'note') return '📝';
  if (url.endsWith('.pdf')) return '📄';
  if (url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo')) return '🎬';
  if (url.match(/\.(mp4|mov|avi|mkv)$/)) return '🎬';
  if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) return '🖼️';
  if (m.type === 'file') return '📁';
  return '🔗';
};

export default function StudyMaterials() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { showToast, ToastComponent } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, bRes] = await Promise.all([studentPortalAPI.getMaterials(), studentPortalAPI.getBatches()]);
      setItems(mRes.data?.data || []);
      setBatches(bRes.data?.data || []);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load materials'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (batchFilter && (m.batchId?._id || m.batchId) !== batchFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      return [m.title, m.description, m.type, m.batchId?.name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, search, batchFilter, typeFilter]);

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>RESOURCES</span>
          <h2>Study Materials</h2>
          <p>Resources shared with your batches.</p>
        </div>
      </header>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span>🔍</span>
          <input placeholder='Search materials…' value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value=''>All Batches</option>
            {batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className='filter-group'>
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value='all'>All</option>
            <option value='link'>Link</option>
            <option value='note'>Note</option>
            <option value='file'>File</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>📚</div>
          <h3>No study materials found</h3>
          <p>Materials shared with your batches will appear here.</p>
        </div>
      ) : (
        <div className='material-cards-grid'>
          {filtered.map((m) => (
            <article className='material-card' key={m.id || m._id}>
              <div className='material-card-head'>
                <span className='material-icon'>{typeIcon(m)}</span>
                <div>
                  <strong>{m.title}</strong>
                  <span>{m.batchId?.name || '—'} · {m.type}</span>
                </div>
              </div>
              {m.description && <p className='assignment-desc'>{m.description}</p>}
              <div className='assignment-meta'>
                <span>Uploaded: {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</span>
                {m.url && <span>Link available</span>}
              </div>
              <div className='class-actions'>
                {m.url && <a href={m.url} target='_blank' rel='noreferrer' className='btn-ripple btn-secondary-sm'>Preview</a>}
                {m.url && <a href={m.url} target='_blank' rel='noreferrer' className='btn-ripple btn-secondary-sm'>Download</a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}