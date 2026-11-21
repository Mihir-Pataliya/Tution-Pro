import React, { useEffect, useMemo, useState } from 'react';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

const emptyForm = { title: '', description: '', batchId: '', type: 'link', url: '' };

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

const isRecent = (m) => m.createdAt && (Date.now() - new Date(m.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

export default function StudyMaterial() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { showToast, ToastComponent } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, bRes] = await Promise.all([teacherAPI.getMaterials(), teacherAPI.getBatches()]);
      setItems(mRes.data?.data || []);
      setBatches(bRes.data?.data || []);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load materials'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await teacherAPI.createMaterial({ title: form.title.trim(), description: form.description, batchId: form.batchId, type: form.type, url: form.url });
      showToast('Material added', 'success');
      setForm(emptyForm); setFormOpen(false); load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to add material'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try { await teacherAPI.deleteMaterial(id); showToast('Material deleted', 'success'); load(); }
    catch (err) { showToast(err.response?.data?.message || 'Failed to delete'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (batchFilter && (m.batchId?._id || m.batchId) !== batchFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      return [m.title, m.description, m.type, m.batchId?.name].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, search, batchFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    pdfs: items.filter((m) => String(m.url || '').toLowerCase().endsWith('.pdf') || m.type === 'file').length,
    videos: items.filter((m) => /youtube|youtu\.be|vimeo|\.mp4|\.mov|\.avi|\.mkv/i.test(m.url || '')).length,
    recent: items.filter(isRecent).length,
  }), [items]);

  const batchName = (m) => m.batchId?.name || '—';

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>RESOURCE LIBRARY</span>
          <h2>Study Material</h2>
          <p>Share notes, links, and resources with your classes.</p>
        </div>
        <button type='button' className='btn-ripple btn-primary-sm' style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }} onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Close' : '+ Upload Material'}</button>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>📚</span><div><span>Total Materials</span><strong>{loading ? '—' : stats.total}</strong><small>All resources</small></div></article>
        <article className='stat-card'><span className='stat-icon blue'>📄</span><div><span>PDFs / Files</span><strong>{loading ? '—' : stats.pdfs}</strong><small>Documents</small></div></article>
        <article className='stat-card'><span className='stat-icon green'>🎬</span><div><span>Videos</span><strong>{loading ? '—' : stats.videos}</strong><small>Media links</small></div></article>
        <article className='stat-card'><span className='stat-icon orange'>✨</span><div><span>Recently Added</span><strong>{loading ? '—' : stats.recent}</strong><small>Last 7 days</small></div></article>
      </section>

      {formOpen && (
        <section className='toolbar-card' style={{ display: 'block' }}>
          <form className='premium-form' onSubmit={submit}>
            <div className='form-grid'>
              <div className='form-group'><label>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div className='form-group'><label>Batch *</label><select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required><option value=''>Choose batch</option>{batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}</select></div>
              <div className='form-group'><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value='link'>Link</option><option value='note'>Note</option><option value='file'>File URL</option></select></div>
              <div className='form-group'><label>URL / Content</label><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder='https://...' /></div>
              <div className='form-group' style={{ gridColumn: '1 / -1' }}><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            </div>
            <div className='form-actions'>
              <button type='submit' className='save-button' disabled={saving || loading}>{saving ? 'Saving…' : 'Save'}</button>
              <button type='button' className='cancel-button' onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

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
          <p>Upload a resource to get started.</p>
        </div>
      ) : (
        <div className='material-cards-grid'>
          {filtered.map((m) => (
            <article className='material-card' key={m.id || m._id}>
              <div className='material-card-head'>
                <span className='material-icon'>{typeIcon(m)}</span>
                <div>
                  <strong>{m.title}</strong>
                  <span>{batchName(m)} · {m.type}</span>
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
                <button type='button' className='btn-ripple btn-secondary-sm' style={{ color: '#dc2626' }} onClick={() => remove(m.id || m._id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}