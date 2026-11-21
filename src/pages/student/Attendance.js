import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/Attendance.css';
import '../owner/PremiumOwner.css';

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(searchParams.get('batch') || '');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    studentPortalAPI.getBatches().then((res) => {
      const list = res.data?.data || [];
      setBatches(list);
      if (!batchId && list.length) setBatchId(list[0].id || list[0]._id);
    }).catch((err) => showToast(err.response?.data?.message || 'Could not load batches'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => {
    setLoading(true);
    studentPortalAPI.getAttendance(batchId || undefined)
      .then((res) => {
        setRecords(res.data?.data?.records || []);
        setSummary(res.data?.data?.summary || null);
      })
      .catch((err) => showToast(err.response?.data?.message || 'Could not load attendance'))
      .finally(() => setLoading(false));
  }, [batchId, showToast]);

  return (
    <div className='attendance-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>ATTENDANCE</span>
          <h2>My Attendance</h2>
          <p>View your attendance records.</p>
        </div>
      </header>
      <section className='toolbar-card'>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value=''>All batches</option>
            {batches.map((b) => <option value={b.id || b._id} key={b.id || b._id}>{b.name}</option>)}
          </select>
        </div>
        {summary && (
          <div className='filter-group'>
            <label>Summary</label>
            <span style={{ fontWeight: 650, color: '#17213b' }}>{summary.percentage}% ({summary.present}/{summary.total})</span>
          </div>
        )}
      </section>
      <section className='table-card'>
        {loading ? (
          <div className='skeleton-table'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
        ) : records.length === 0 ? (
          <div className='empty-state'><div className='empty-icon'>♙</div><h3>No attendance records</h3><p>Your attendance will appear here.</p></div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead><tr><th>Date</th><th>Batch</th><th>Status</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                    <td>{r.batchId?.name || '—'}</td>
                    <td><span className={`status-badge ${r.status === 'present' ? 'active' : r.status === 'late' ? 'inactive' : 'inactive'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}