import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { attendanceAPI } from '../../api/dashboard';
import { batchAPI } from '../../api/batchApi';
import useToast from '../../hooks/useToast';
import './Attendance.css';
import './PremiumOwner.css';

export default function Attendance() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const { showToast, ToastComponent } = useToast();

  const isToday = date === new Date().toISOString().slice(0, 10);

  const loadBatches = useCallback(async () => {
    try {
      const res = await batchAPI.getAll();
      const list = res.data?.data ?? res.data ?? [];
      const safe = Array.isArray(list) ? list : [];
      setBatches(safe);
      if (safe.length && !batchId) setBatchId(safe[0]._id || safe[0].id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load batches');
      setLoading(false);
    }
  }, [batchId, showToast]);

  const loadAttendance = useCallback(async () => {
    if (!batchId) { setStudents([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [attRes, histRes] = await Promise.all([
        attendanceAPI.getForBatch(batchId, date),
        attendanceAPI.getHistory(batchId, 7),
      ]);
      setStudents(attRes.data?.data?.students || []);
      setHistory(histRes.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load attendance');
    } finally {
      setLoading(false);
    }
  }, [batchId, date, showToast]);

  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (s.name || '').toLowerCase().includes(q));
  }, [students, search]);

  const setStatus = (studentId, status) => {
    setStudents((current) => current.map((s) => s.id === studentId ? { ...s, status } : s));
  };

  const markAll = (status) => {
    setStudents((current) => current.map((s) => ({ ...s, status })));
  };

  const save = async () => {
    if (!batchId) return;
    const records = students.filter((s) => s.status).map((s) => ({ studentId: s.id || s._id, status: s.status }));
    if (!records.length) { showToast('Mark at least one student before saving.'); return; }
    setSaving(true);
    try {
      await attendanceAPI.saveForBatch(batchId, records, date);
      showToast('Attendance saved successfully', 'success');
      await loadAttendance();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const total = students.length;
    const present = students.filter((s) => s.status === 'present').length;
    const absent = students.filter((s) => s.status === 'absent').length;
    const late = students.filter((s) => s.status === 'late').length;
    const marked = present + absent + late;
    const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, marked, percentage };
  }, [students]);

  const selectedBatch = batches.find((b) => (b._id || b.id) === batchId);

  return (
    <div className='attendance-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>DAILY OPERATIONS</span>
          <h2>Attendance</h2>
          <p>Record and review attendance by batch.</p>
        </div>
      </header>

      {batches.length === 0 && !loading ? (
        <div className='empty-state'>
          <div className='empty-icon'>▦</div>
          <h3>No batches yet</h3>
          <p>Create a batch before recording attendance.</p>
        </div>
      ) : (
        <>
          <section className='stats-grid'>
            <article className='stat-card'><span className='stat-icon blue'>♙</span><div><span>Total students</span><strong>{loading ? '—' : summary.total}</strong></div></article>
            <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Present</span><strong>{loading ? '—' : summary.present}</strong></div></article>
            <article className='stat-card'><span className='stat-icon orange'>✕</span><div><span>Absent</span><strong>{loading ? '—' : summary.absent}</strong></div></article>
            <article className='stat-card'><span className='stat-icon violet'>%</span><div><span>Attendance</span><strong>{loading ? '—' : `${summary.percentage}%`}</strong></div></article>
          </section>

          <section className='toolbar-card'>
            <div className='filter-group'>
              <label>Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value=''>Choose a batch</option>
                {batches.map((b) => <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className='filter-group'>
              <label>Date</label>
              <input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className='search-box'>
              <span aria-hidden='true'>⌕</span>
              <input type='search' placeholder='Search students…' value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {!isToday && <span className='pill'>Viewing saved attendance for {date}</span>}
          </section>

          <section className='table-card'>
            {loading ? (
              <div className='skeleton-table'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
            ) : filteredStudents.length === 0 ? (
              <div className='empty-state'>
                <div className='empty-icon'>♙</div>
                <h3>No active students</h3>
                <p>This batch has no active students yet.</p>
              </div>
            ) : (
              <>
                <div className='attendance-toolbar'>
                  <span>{filteredStudents.length} students · {summary.marked} marked</span>
                  <div>
                    <button type='button' className='btn-secondary' onClick={() => markAll('present')}>Select All Present</button>
                    <button type='button' className='btn-primary' onClick={save} disabled={saving || !isToday}>{saving ? 'Saving…' : 'Save Attendance'}</button>
                  </div>
                </div>
                <div className='table-responsive'>
                  <table className='data-table premium-table'>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const studentId = student.id || student._id;
                        return (
                          <tr key={studentId}>
                            <td>
                              <div className='person-cell'>
                                <span className='avatar'>{student.name?.[0]?.toUpperCase() || '?'}</span>
                                <div>
                                  <strong>{student.name || 'Unnamed student'}</strong>
                                  <small>{student.status ? student.status : 'Not marked'}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className='attendance-options'>
                                {['present', 'late', 'absent'].map((status) => (
                                  <button
                                    type='button'
                                    key={status}
                                    className={`${student.status === status ? `is-${status}` : ''}`}
                                    aria-pressed={student.status === status}
                                    onClick={() => setStatus(studentId, status)}
                                    disabled={!isToday}
                                  >
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
              </>
            )}
          </section>

          <section className='table-card'>
            <div style={{ padding: '16px 18px 0' }}>
              <h3 style={{ margin: 0, color: '#19213c' }}>Attendance History</h3>
              <p style={{ margin: '4px 0 0', color: '#7e879d', fontSize: 12 }}>{selectedBatch?.name || 'Selected batch'} · last 7 days</p>
            </div>
            {history.length ? (
              <div className='history-chart'>
                {history.map((day) => {
                  const total = day.total || 1;
                  return (
                    <div className='history-row' key={day.date}>
                      <span className='history-date'>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
                      <div className='history-bar'>
                        <div className='history-segment present' style={{ width: `${Math.round((day.present / total) * 100)}%` }} />
                        <div className='history-segment late' style={{ width: `${Math.round((day.late / total) * 100)}%` }} />
                        <div className='history-segment absent' style={{ width: `${Math.round((day.absent / total) * 100)}%` }} />
                      </div>
                      <span className='history-count'>{day.present + day.late}/{day.total || 0}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='empty-state' style={{ minHeight: 120 }}>
                <p>No attendance history yet.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

