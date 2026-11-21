import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { enquiriesAPI } from '../../api/enquiries';
import { batchAPI } from '../../api/auth';
import useToast from '../../hooks/useToast';
import './Enquiries.css';

const emptyForm = { studentName: '', studentAge: '', parentName: '', parentPhone: '', parentEmail: '', interestedCourse: '', followUpDate: '', status: 'new', source: '', notes: '' };
const statusLabels = { new: 'New', contacted: 'Contacted', demo_scheduled: 'Demo scheduled', converted: 'Converted', lost: 'Lost' };
const dateValue = (date) => date ? new Date(date).toISOString().slice(0, 10) : '';

export default function Enquiries() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [convertBatchId, setConvertBatchId] = useState('');
  const [recoverItem, setRecoverItem] = useState(null);
  const [recoverStatus, setRecoverStatus] = useState('new');
  const [saving, setSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enquiriesResponse, batchesResponse] = await Promise.all([enquiriesAPI.list(), batchAPI.getAll()]);
      setItems(enquiriesResponse.data?.data || []);
      setBatches(batchesResponse.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load enquiries.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [item.studentName, item.parentName, item.parentPhone, item.parentEmail, item.interestedCourse].some((value) => value?.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [items, search, statusFilter]);

  const overdue = items.filter((i) => i.followUpDate && new Date(i.followUpDate) < new Date() && !['lost','converted'].includes(i.status));
  const demoPending = items.filter((i) => i.status === 'demo_scheduled');


  const openCreate = () => { setForm(emptyForm); setDialog({ mode: 'create' }); };
  const openEdit = (item) => {
    setForm({ studentName: item.studentName || '', studentAge: item.studentAge || '', parentName: item.parentName || '', parentPhone: item.parentPhone || '', parentEmail: item.parentEmail || '', interestedCourse: item.interestedCourse || '', followUpDate: dateValue(item.followUpDate), status: item.status || 'new', source: item.source || '', notes: item.notes || '' });
    setDialog({ mode: 'edit', item });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = { ...form, studentAge: form.studentAge ? Number(form.studentAge) : undefined, followUpDate: form.followUpDate || null };
    try {
      if (dialog.mode === 'create') await enquiriesAPI.create(data);
      else await enquiriesAPI.update(dialog.item._id, data);
      setDialog(null);
      showToast(dialog.mode === 'create' ? 'Enquiry added.' : 'Enquiry updated.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not save this enquiry.'); }
    finally { setSaving(false); }
  };

  const startConvert = (item) => { setConvertBatchId(''); setDialog({ mode: 'convert', item }); };
  const convert = async (event) => {
    event.preventDefault();
    if (!convertBatchId) return;
    setSaving(true);
    try {
      await enquiriesAPI.convert(dialog.item._id, convertBatchId);
      setDialog(null);
      showToast('Enquiry converted to a student.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not convert this enquiry.'); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete the enquiry for ${item.studentName}?`)) return;
    try {
      await enquiriesAPI.remove(item._id);
      showToast('Enquiry deleted.', 'success');
      await load();
    } catch (err) { showToast(err.response?.data?.message || 'Could not delete this enquiry.'); }
  };

  const counts = useMemo(() => items.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {}), [items]);

  return <div className="enquiries-page">
    <ToastComponent />
    <header className="enquiries-heading"><div><span className="eyebrow">OWNER WORKSPACE</span><h2>Enquiries</h2><p>Track prospective students and keep every follow-up moving.</p></div><div className="enquiries-heading-actions"><button className="enquiry-button secondary" type="button" onClick={load} disabled={loading}>Refresh</button><button className="enquiry-button primary" type="button" onClick={openCreate}>＋ Add enquiry</button></div></header>
    {error && <div className="enquiry-error" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}
    <section className="enquiry-stats" aria-label="Enquiry status summary">{[['all', 'All enquiries'], ['new', 'New'], ['contacted', 'Contacted'], ['demo_scheduled', 'Demo scheduled'], ['converted', 'Converted'], ['lost', 'Lost']].map(([key, label]) => <button key={key} type="button" className={`enquiry-stat ${statusFilter === key ? 'selected' : ''}`} onClick={() => setStatusFilter(key)}><span>{label}</span><strong>{key === 'all' ? items.length : counts[key] || 0}</strong></button>)}</section>
    <section className="enquiry-panel">
      <div className="enquiry-toolbar"><div><h3>Student enquiries</h3><p>{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</p></div><label className="enquiry-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, parent, phone, or course" aria-label="Search enquiries" /></label></div>
      <section className="enquiry-overdue" style={{marginBottom:16}}><h3>Overdue Follow-ups ({overdue.length})</h3>{overdue.length===0 ? <p style={{color:'#727b91',fontSize:13}}>No overdue follow-ups.</p> : overdue.map((i)=><div key={i._id} style={{padding:8,borderBottom:'1px solid #f0f1f6'}}><strong>{i.studentName}</strong> · {i.parentName} · {i.parentPhone} · {i.status} · {new Date(i.followUpDate).toLocaleDateString()}</div>)}</section>
      <section className="enquiry-overdue" style={{marginBottom:16}}><h3>Demo Follow-ups Pending ({demoPending.length})</h3>{demoPending.length===0 ? <p style={{color:'#727b91',fontSize:13}}>No demo follow-ups pending.</p> : demoPending.map((i)=><div key={i._id} style={{padding:8,borderBottom:'1px solid #f0f1f6'}}><strong>{i.studentName}</strong> · {i.parentName} · {i.parentPhone} · {i.interestedCourse}</div>)}</section>
      <div className="enquiry-table-wrap"><table className="enquiry-table"><thead><tr><th>Student &amp; parent</th><th>Interested course</th><th>Follow-up</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {loading ? <tr><td className="enquiry-empty-cell" colSpan="5">Loading enquiries…</td></tr> : filtered.length === 0 ? <tr><td className="enquiry-empty-cell" colSpan="5">{items.length ? 'No enquiries match these filters.' : 'No enquiries yet. Add your first prospective student to get started.'}</td></tr> : filtered.map((item) => <tr key={item._id}>
          <td><strong>{item.studentName}</strong><span>{item.parentName || 'Parent not added'}{item.parentPhone ? ` · ${item.parentPhone}` : ''}</span>{item.parentEmail && <small>{item.parentEmail}</small>}</td>
          <td>{item.interestedCourse || '—'}</td><td>{item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : '—'}</td>
          <td><span className={`enquiry-status status-${item.status}`}>{statusLabels[item.status] || item.status}</span></td>
          <td><div className="enquiry-row-actions">{item.status !== 'converted' && <button type="button" onClick={() => openEdit(item)}>Edit</button>}{item.status === 'lost' && <button type="button" onClick={() => { setRecoverItem(item); setRecoverStatus('new'); }}>Recover</button>}{item.status !== 'converted' && item.status !== 'lost' && <button type="button" onClick={() => startConvert(item)}>Convert</button>}{item.status !== 'converted' && <button type="button" className="danger" onClick={() => remove(item)}>Delete</button>}{item.convertedStudentId && <Link to="/owner/students">View student</Link>}</div></td>
        </tr>)}
      </tbody></table></div>
    </section>

    {dialog?.mode !== 'convert' && dialog && <div className="enquiry-modal-backdrop" role="presentation"><form className="enquiry-modal" onSubmit={save} aria-labelledby="enquiry-form-title"><div className="enquiry-modal-heading"><div><span className="eyebrow">ENQUIRY DETAILS</span><h3 id="enquiry-form-title">{dialog.mode === 'create' ? 'Add enquiry' : 'Edit enquiry'}</h3></div><button type="button" aria-label="Close" onClick={() => setDialog(null)}>×</button></div><div className="enquiry-form-grid">
      <label>Student name<input required maxLength="100" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} /></label><label>Student age<input type="number" min="2" max="100" value={form.studentAge} onChange={(e) => setForm({ ...form, studentAge: e.target.value })} /></label>
      <label>Parent / guardian<input value={form.parentName} maxLength="100" onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></label><label>Parent phone<input required type="tel" maxLength="30" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></label>
      <label>Parent email<input type="email" maxLength="254" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} /></label><label>Interested course<input maxLength="120" list="enquiry-courses" value={form.interestedCourse} onChange={(e) => setForm({ ...form, interestedCourse: e.target.value })} /><datalist id="enquiry-courses">{batches.map((batch) => <option key={batch._id} value={batch.subject || batch.name} />)}</datalist></label>
      <label>Follow-up date<input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(statusLabels).filter(([key]) => key !== 'converted').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Source<input maxLength="80" placeholder="Website, referral…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label><label className="enquiry-notes-field">Notes<textarea rows="3" maxLength="2000" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
    </div>{dialog?.item?.recoveryHistory?.length ? <div className="enquiry-recovery-history"><strong>Recovery History</strong>{dialog.item.recoveryHistory.map((r,i)=><div key={i} style={{fontSize:12,color:'#727b91',marginTop:4}}>{r.lostReason} → {r.newStatus} ({new Date(r.recoveredAt).toLocaleDateString()})</div>)}</div> : null}<div className="enquiry-modal-actions"><button className="enquiry-button secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="enquiry-button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save enquiry'}</button></div></form></div>}

    {dialog?.mode === 'convert' && <div className="enquiry-modal-backdrop" role="presentation"><form className="enquiry-modal enquiry-convert-modal" onSubmit={convert}><div className="enquiry-modal-heading"><div><span className="eyebrow">CONVERT ENQUIRY</span><h3>Add {dialog.item.studentName} as a student</h3></div><button type="button" aria-label="Close" onClick={() => setDialog(null)}>×</button></div><p>Choose the student’s starting batch. Parent contact details will be copied to the student record.</p><label>Batch<select required value={convertBatchId} onChange={(e) => setConvertBatchId(e.target.value)}><option value="">Select a batch</option>{batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}{batch.subject ? ` · ${batch.subject}` : ''}</option>)}</select></label>{!batches.length && <p className="enquiry-form-hint">Create a batch first, then return to convert this enquiry.</p>}<div className="enquiry-modal-actions"><button className="enquiry-button secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="enquiry-button primary" type="submit" disabled={saving || !batches.length}>{saving ? 'Converting…' : 'Create student'}</button></div></form></div>}
    {recoverItem && <div className="enquiry-modal-backdrop" role="presentation"><div className="enquiry-modal"><div className="enquiry-modal-heading"><div><span className="eyebrow">RECOVER ENQUIRY</span><h3>Recover {recoverItem.studentName}</h3></div><button type="button" aria-label="Close" onClick={() => setRecoverItem(null)}>×</button></div><p>Do you want to recover this enquiry?</p><label>New status<select value={recoverStatus} onChange={(e)=>setRecoverStatus(e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="demo_scheduled">Demo Scheduled</option><option value="interested">Interested</option></select></label><div className="enquiry-modal-actions"><button className="enquiry-button secondary" type="button" onClick={() => setRecoverItem(null)}>Cancel</button><button className="enquiry-button primary" type="button" onClick={async () => { try { await enquiriesAPI.update(recoverItem._id, { ...recoverItem, status: recoverStatus }); setRecoverItem(null); showToast('Enquiry recovered.', 'success'); await load(); } catch { showToast('Recovery failed.', 'error'); } }}>Recover</button></div></div></div>}
  </div>;
}
