import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { teacherInviteAPI } from '../../api/teacherInvites';
import { batchAPI } from '../../api/auth';
import useToast from '../../hooks/useToast';
import './Teachers.css';

const emptyForm = { name: '', email: '', phone: '', subject: '', batchIds: [] };
const filters = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['expired', 'Expired'], ['cancelled', 'Cancelled']];

export default function Teachers() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [previewUrl, setPreviewUrl] = useState('');
  const { showToast, ToastComponent } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        teacherInviteAPI.list(statusFilter),
        batchAPI.getAll(),
      ]);
      const errors = [];

      results.forEach((result, index) => {
        const resource = index === 0 ? 'teacher invitations' : 'batches';
        if (result.status === 'fulfilled') {
          if (index === 0) {
            setItems(result.value.data?.data || []);
          } else {
            const data = result.value.data?.data ?? result.value.data;
            setBatches(Array.isArray(data) ? data : []);
          }
          return;
        }

        const err = result.reason;
        const url = err.config?.baseURL && err.config?.url
          ? `${err.config.baseURL.replace(/\/+$/, '')}/${err.config.url.replace(/^\/+/, '')}`
          : err.config?.url;
        console.error(`[Teachers.load] failed to load ${resource}:`, {
          url,
          status: err.response?.status,
          data: err.response?.data,
        });
        errors.push(err.response
          ? `Could not load ${resource} from ${url || 'the API'}: ${err.response.data?.message || `API returned HTTP ${err.response.status}.`} (HTTP ${err.response.status})`
          : `Could not load ${resource} from ${url || err.config?.baseURL || 'http://localhost:5000/api'}: ${err.message}. Check that the backend is running.`);
      });

      if (errors.length) showToast(errors.join(' '));
    }
    finally { setLoading(false); }
  }, [statusFilter, showToast]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, accepted: 0, expired: 0, cancelled: 0 };
    items.forEach((i) => { if (c[i.status] !== undefined) c[i.status] += 1; });
    return c;
  }, [items]);

  const toggleBatch = (id) => setForm((f) => ({ ...f, batchIds: f.batchIds.includes(id) ? f.batchIds.filter((b) => b !== id) : [...f.batchIds, id] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { showToast('Name and email are required.'); return; }
    setSaving(true);
    try {
      const res = await teacherInviteAPI.create({ ...form, name: form.name.trim(), email: form.email.trim() });
      setPreviewUrl(res.data?.data?.inviteUrl || '');
      setDialog(false);
      setForm(emptyForm);
      showToast(res.data?.message || 'Invitation created.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not send invitation.'); }
    finally { setSaving(false); }
  };

  const resend = async (id) => {
    try {
      const res = await teacherInviteAPI.resend(id);
      setPreviewUrl(res.data?.data?.inviteUrl || '');
      showToast(res.data?.message || 'Invitation resent.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not resend.'); }
  };
  const cancel = async (id) => {
    if (!window.confirm('Cancel this invitation?')) return;
    try {
      const res = await teacherInviteAPI.cancel(id);
      showToast(res.data?.message || 'Invitation cancelled.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not cancel.'); }
  };

  return (
    <div className="teachers-page">
      <header className="teachers-heading">
        <div><span className="eyebrow">STAFF</span><h2>Teachers</h2><p>Invite teachers by email. They get a secure link to create their teacher login.</p></div>
        <button className="teacher-button primary" type="button" onClick={() => { setForm(emptyForm); setPreviewUrl(''); setDialog(true); }}>+ Invite Teacher</button>
      </header>
      {previewUrl && <div className="teacher-notice"><span>SMTP not configured — share this secure link manually:</span><code>{previewUrl}</code></div>}
      <div className="teacher-stats">
        {filters.map(([key, label]) => <button key={key} type="button" className={`teacher-stat ${statusFilter === key ? 'selected' : ''}`} onClick={() => setStatusFilter(key)}><span>{label}</span><strong>{key === 'all' ? counts.all : counts[key] || 0}</strong></button>)}
      </div>
      <section className="teacher-panel">
        <div className="teacher-toolbar"><div><h3>Invitations</h3><p>Pending, accepted, expired and cancelled invites for this academy.</p></div><button className="teacher-button secondary" type="button" onClick={load}>Refresh</button></div>
        <div className="teacher-table-wrap">
          {loading ? <p className="teacher-empty">Loading invitations…</p> : items.length === 0 ? <p className="teacher-empty">No invitations yet. Click “Invite Teacher”.</p> : (
            <table className="teacher-table">
              <thead><tr><th>Teacher</th><th>Subject</th><th>Batches</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.name}</strong><span>{item.email}</span><small>{item.phone || 'No phone'}</small></td>
                    <td>{item.subject || '—'}</td>
                    <td>{item.batchIds && item.batchIds.length ? item.batchIds.map((b) => (b && b.name) || b).join(', ') : '—'}</td>
                    <td><span className={`teacher-status status-${item.status}`}>{item.status}</span></td>
                    <td>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '—'}</td>
                    <td><div className="teacher-row-actions">
                      {item.status === 'pending' && <><button type="button" onClick={() => resend(item._id)}>Resend</button><button type="button" className="danger" onClick={() => cancel(item._id)}>Cancel</button></>}
                      {item.status === 'expired' && <button type="button" onClick={() => resend(item._id)}>Renew</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      {dialog && <div className="teacher-modal-backdrop" role="presentation"><form className="teacher-modal" onSubmit={submit}>
        <div className="teacher-modal-heading"><div><span className="eyebrow">INVITE TEACHER</span><h3>Send a secure invitation</h3></div><button type="button" aria-label="Close" onClick={() => setDialog(false)}>×</button></div>
        <div className="teacher-form-grid">
          <label>Name*<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" /></label>
          <label>Email*<input required type="email" maxLength="254" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@mail.com" /></label>
          <label>Phone<input maxLength="30" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" /></label>
          <label>Subject<input maxLength="120" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Maths, Science…" /></label>
          <fieldset className="teacher-batches"><legend>Assigned batches</legend>{batches.length === 0 ? <small>No batches yet — create one first.</small> : batches.map((b) => <label key={b._id}><input type="checkbox" checked={form.batchIds.includes(b._id)} onChange={() => toggleBatch(b._id)} />{b.name}{b.subject ? ' · ' + b.subject : ''}</label>)}</fieldset>
        </div>
        <p className="teacher-hint">Link expires in 72 hours. Teacher opens the emailed link, sets a password, and can sign in.</p>
        <div className="teacher-modal-actions"><button className="teacher-button secondary" type="button" onClick={() => setDialog(false)}>Cancel</button><button className="teacher-button primary" type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send invite'}</button></div>
      </form></div>}
      <ToastComponent />
    </div>
  );
}
