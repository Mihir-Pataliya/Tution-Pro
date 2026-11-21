import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import '../owner/Attendance.css';
import '../owner/PremiumOwner.css';

export default function TeacherAttendance() {
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(searchParams.get('batch') || '');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    teacherAPI.getBatches().then((res) => {
      const list = res.data?.data || [];
      setBatches(list);
      if (!batchId && list.length) setBatchId(list[0].id || list[0]._id);
      if (batchId && !list.some((b) => (b.id || b._id) === batchId) && list.length) setBatchId(list[0].id || list[0]._id);
    }).catch((err) => showToast(err.response?.data?.message || 'Could not load batches')).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => {
    if (!batchId) { setStudents([]); return; }
    setLoading(true);
    teacherAPI.getAttendance(batchId).then((res) => setStudents(res.data?.data?.students || [])).catch((err) => showToast(err.response?.data?.message || 'Could not load attendance')).finally(() => setLoading(false));
  }, [batchId, showToast]);

  const setStatus = (studentId, status) => setStudents((current) => current.map((s) => (s.id || s._id) === studentId ? { ...s, status } : s));
  const save = async () => {
    if (!batchId) return;
    const records = students.filter((s) => s.status).map((s) => ({ studentId: s.id || s._id, status: s.status }));
    setSaving(true);
    try { await teacherAPI.saveAttendance(batchId, records); showToast('Attendance saved successfully', 'success'); }
    catch (err) { showToast(err.response?.data?.message || 'Could not save attendance'); }
    finally { setSaving(false); }
  };
  const markAll = (status) => setStudents((current) => current.map((s) => ({ ...s, status })));

  return (
    <div className='attendance-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>DAILY OPERATIONS</span>
          <h2>Attendance</h2>
          <p>Record today’s attendance by batch.</p>
        </div>
      </header>
      <section className='toolbar-card'>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value=''>Choose a batch</option>
            {batches.map((b) => <option value={b.id || b._id} key={b.id || b._id}>{b.name}</option>)}
          </select>
        </div>
        <button type='button' className='btn-secondary' onClick={() => markAll('present')}>Mark all present</button>
        <button type='button' className='btn-primary' onClick={save} disabled={saving || loading}>{saving ? 'Saving…' : 'Save attendance'}</button>
      </section>
      <section className='table-card'>
        {loading ? (
          <div className='skeleton-table'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
        ) : !batchId ? (
          <div className='empty-state'><div className='empty-icon'>▦</div><h3>No batch selected</h3><p>Choose a batch to load students.</p></div>
        ) : students.length === 0 ? (
          <div className='empty-state'><div className='empty-icon'>♙</div><h3>No active students</h3><p>This batch has no active students yet.</p></div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead><tr><th>Student</th><th>Status</th></tr></thead>
              <tbody>
                {students.map((s) => {
                  const id = s.id || s._id;
                  return (
                    <tr key={id}>
                      <td>
                        <div className='person-cell'>
                          <span className='avatar'>{s.name?.[0]?.toUpperCase() || '?'}</span>
                          <div><strong>{s.name || 'Unnamed student'}</strong><small>{s.status || 'Not marked'}</small></div>
                        </div>
                      </td>
                      <td>
                        <div className='attendance-options'>
                          {['present', 'late', 'absent'].map((status) => (
                            <button type='button' key={status} className={`${s.status === status ? `is-${status}` : ''}`} aria-pressed={s.status === status} onClick={() => setStatus(id, status)}>
                              {status[0].toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

