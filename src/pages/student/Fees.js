import React, { useEffect, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    studentPortalAPI.getFees()
      .then((res) => {
        if (!active) return;
        setFees(res.data?.data?.fees || []);
        setSummary(res.data?.data?.summary || null);
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load fees'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>FINANCE</span>
          <h2>Fees & Payments</h2>
          <p>Your fee records and payment status.</p>
        </div>
      </header>

      {summary && (
        <section className='stats-grid' style={{ marginBottom: 14 }}>
          <article className='stat-card'><div className='stat-icon' style={{ background: '#eef2ff', color: '#4f46e5' }}>💳</div><div><span>Total</span><strong>{summary.total}</strong><small>Records</small></div></article>
          <article className='stat-card'><div className='stat-icon' style={{ background: '#ecfdf5', color: '#059669' }}>✅</div><div><span>Paid</span><strong>{summary.paid}</strong><small>Completed</small></div></article>
          <article className='stat-card'><div className='stat-icon' style={{ background: '#fff7ed', color: '#ea580c' }}>⏳</div><div><span>Pending</span><strong>{summary.pending}</strong><small>Awaiting</small></div></article>
          <article className='stat-card'><div className='stat-icon' style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div><div><span>Overdue</span><strong>{summary.overdue}</strong><small>Due ₹{summary.dueAmount}</small></div></article>
        </section>
      )}

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : fees.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>💳</div>
          <h3>No fee records</h3>
          <p>Your fee records will appear here.</p>
        </div>
      ) : (
        <section className='table-card'>
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead><tr><th>Amount</th><th>Due date</th><th>Paid date</th><th>Status</th><th>Description</th></tr></thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td>₹{f.amount}</td>
                    <td>{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}</td>
                    <td>{f.paidDate ? new Date(f.paidDate).toLocaleDateString() : '—'}</td>
                    <td><span className={`status-badge ${f.status === 'paid' ? 'active' : f.status === 'overdue' ? 'inactive' : 'inactive'}`}>{f.status}</span></td>
                    <td>{f.description || f.batchId?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}