import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import './Payroll.css';

const toINR = (v) => `₹${Number(v || 0).toLocaleString()}`;

export default function Payroll() {
  const { showToast, ToastComponent } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await teacherAPI.getTeachers();
      const data = res.data?.data ?? res.data;
      setTeachers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load teacher salary data');
      showToast('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    let totalMonthly = 0;
    let totalPaid = 0;
    let totalPending = 0;
    teachers.forEach((t) => {
      const salary = Number(t.monthlySalary || 0);
      totalMonthly += salary;
      totalPending += salary - (Number(t.paidAmount || 0));
      totalPaid += Number(t.paidAmount || 0);
    });
    return { totalMonthly, totalPaid, totalPending, teacherCount: teachers.length };
  }, [teachers]);

  const statusLabel = (t) => {
    const salary = Number(t.monthlySalary || 0);
    const paid = Number(t.paidAmount || 0);
    if (salary <= 0) return 'Not Set';
    if (paid >= salary) return 'Paid';
    if (paid > 0) return 'Partially Paid';
    return 'Pending';
  };

  const statusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'paid': return 'badge paid';
      case 'partially paid': return 'badge partial';
      case 'pending': return 'badge pending';
      case 'not set': return 'badge overdue';
      default: return 'badge';
    }
  };

  return (
    <div className='payroll-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>PAYROLL</span>
          <h2>Teacher Salary</h2>
          <p>View teacher salaries, pending dues, and payment status.</p>
        </div>
        <div className='header-actions'>
          <button type='button' className='btn-secondary' onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className='error-banner'>{error}</div>}

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon blue'>₹</span><div><span>Total Monthly Salary</span><strong>{loading ? '—' : toINR(summary.totalMonthly)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon green'>₹</span><div><span>Paid Salary</span><strong>{loading ? '—' : toINR(summary.totalPaid)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon orange'>₹</span><div><span>Pending Salary</span><strong>{loading ? '—' : toINR(summary.totalPending)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon violet'>#</span><div><span>Total Teachers</span><strong>{loading ? '—' : summary.teacherCount}</strong></div></article>
      </section>

      <section className='table-card'>
        <div style={{ padding: '16px' }}>
          {loading ? (
            <div className='skeleton-table'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : error ? (
            <div className='empty-state'>
              <div className='empty-icon'>!</div>
              <h3>Failed to load payroll</h3>
              <p>{error}</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className='empty-state'>
              <div className='empty-icon'>👨‍🏫</div>
              <h3>No teachers found</h3>
              <p>Invite teachers from the Teachers page to see payroll data here.</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='data-table premium-table'>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Monthly Salary</th>
                    <th>Paid Amount</th>
                    <th>Pending Amount</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const salary = Number(t.monthlySalary || 0);
                    const paid = Number(t.paidAmount || 0);
                    const pending = salary - paid;
                    const status = statusLabel(t);
                    return (
                      <tr key={t._id}>
                        <td>
                          <div className='person-cell'>
                            <span className='avatar'>{(t.name || 'T')[0].toUpperCase()}</span>
                            <div>
                              <strong>{t.name || '—'}</strong>
                              <small>{t.subject || 'Teacher'}</small>
                            </div>
                          </div>
                        </td>
                        <td className='fee-cell'>{toINR(salary)}</td>
                        <td className='fee-cell'>{toINR(paid)}</td>
                        <td className='fee-cell'>{toINR(pending)}</td>
                        <td><span className={statusBadgeClass(status)}>{status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
