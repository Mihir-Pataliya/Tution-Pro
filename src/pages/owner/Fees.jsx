import React, { useEffect, useMemo, useState } from 'react';
import useToast from '../../hooks/useToast';
import { feesAPI } from '../../api/feesApi';
import { studentAPI } from '../../api/studentApi';
import { batchAPI } from '../../api/batchApi';
import './Fees.css';
import './PremiumOwner.css';

const statusBadge = (status) => (status || 'pending').toLowerCase();
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const toINR = (v) => `₹${Number(v || 0).toLocaleString()}`;

export default function Fees() {
  const { showToast, ToastComponent } = useToast();
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', batchId: '', search: '' });
  const [form, setForm] = useState({ studentId: '', batchId: '', amount: '', dueDate: '', status: 'pending', description: '', paidDate: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showInstallmentDetails, setShowInstallmentDetails] = useState(false);
  const [selectedInstallmentStudentId, setSelectedInstallmentStudentId] = useState('');
  const [installmentDetail, setInstallmentDetail] = useState(null);
  const [installmentDetailLoading, setInstallmentDetailLoading] = useState(false);
  const [installmentDetailError, setInstallmentDetailError] = useState('');
  const [showCreateInstallment, setShowCreateInstallment] = useState(false);
  const [createInstForm, setCreateInstForm] = useState({ studentId: '', totalFee: '', installmentCount: '3' });
  const [creatingInstallment, setCreatingInstallment] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [fRes, sRes, bRes] = await Promise.all([
        feesAPI.getAll(filters),
        studentAPI.getAll(),
        batchAPI.getAll(),
      ]);
      setFees(Array.isArray(fRes.data) ? fRes.data : fRes.data?.data || []);
      setStudents(Array.isArray(sRes.data) ? sRes.data : sRes.data?.data || []);
      setBatches(Array.isArray(bRes.data) ? bRes.data : bRes.data?.data || []);
      setLoadError('');
    } catch (e) {
      setLoadError('Failed to load fee data');
      showToast('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const filtered = useMemo(() => fees.filter((f) => {
    if (filters.status && f.status !== filters.status) return false;
    if (filters.batchId) {
      const bid = f.batchId?._id || f.batchId;
      if (bid !== filters.batchId) return false;
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const student = f.studentId?.name || '';
      if (!student.toLowerCase().includes(s) && !f.description?.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [fees, filters]);

  const summary = useMemo(() => {
    let collected = 0, pending = 0, overdue = 0;
    fees.forEach((f) => {
      const amt = Number(f.amount || 0);
      if (f.status === 'paid') collected += amt;
      else if (f.status === 'overdue') overdue += amt;
      else pending += amt;
    });
    return { collected, pending, overdue, total: collected + pending + overdue };
  }, [fees]);

  const installmentPlans = useMemo(() => {
    const map = new Map();
    fees.forEach((f) => {
      if (!f.installmentPlanId) return;
      const key = String(f.installmentPlanId);
      if (!map.has(key)) {
        map.set(key, {
          planId: f.installmentPlanId,
          studentId: f.studentId?._id || f.studentId,
          studentName: f.studentId?.name || '—',
          totalFee: 0,
          totalPaid: 0,
          installmentCount: 0,
        });
      }
      const p = map.get(key);
      p.totalFee += Number(f.amount || 0);
      p.totalPaid += Number(f.paidAmount || 0);
      p.installmentCount += 1;
    });
    return Array.from(map.values()).map((p) => ({
      ...p,
      remaining: p.totalFee - p.totalPaid,
    }));
  }, [fees]);

  const openForm = (fee) => {
    if (fee) {
      setEditing(fee);
      setForm({
        studentId: fee.studentId?._id || fee.studentId,
        batchId: fee.batchId?._id || fee.batchId,
        amount: fee.amount,
        dueDate: fee.dueDate ? fee.dueDate.slice(0, 10) : '',
        status: fee.status,
        description: fee.description || '',
        paidDate: fee.paidDate ? fee.paidDate.slice(0, 10) : '',
      });
    } else {
      setEditing(null);
      setForm({ studentId: '', batchId: '', amount: '', dueDate: '', status: 'pending', description: '', paidDate: '' });
    }
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId) { showToast('Student is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { showToast('Amount must be greater than 0'); return; }
    if (!form.dueDate) { showToast('Due date is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await feesAPI.update(editing._id, form);
        showToast('Fee updated', 'success');
      } else {
        await feesAPI.create(form);
        showToast('Fee created', 'success');
      }
      closeForm();
      await load();
    } catch (e) {
      showToast('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (fee) => {
    if (!window.confirm(`Record payment of ₹${fee.amount} for ${fee.studentId?.name}?`)) return;
    try {
      await feesAPI.recordPayment({ feeId: fee._id, amount: fee.amount });
      showToast('Payment recorded', 'success');
      await load();
      if (showInstallmentDetails) await refetchInstallmentDetails();
    } catch (e) {
      showToast('Payment failed');
    }
  };

  const handleDelete = async (fee) => {
    if (!window.confirm('Delete this fee record?')) return;
    try {
      await feesAPI.delete(fee._id);
      showToast('Deleted', 'success');
      await load();
    } catch (e) {
      showToast('Delete failed');
    }
  };

  const handleCreateInstallment = async (e) => {
    e.preventDefault();
    if (!createInstForm.studentId) { showToast('Student is required'); return; }
    if (!createInstForm.totalFee || Number(createInstForm.totalFee) <= 0) { showToast('Total fee must be greater than 0'); return; }
    const count = parseInt(createInstForm.installmentCount, 10) || 1;
    if (count < 1) { showToast('Installment count must be at least 1'); return; }

    const student = students.find((s) => s._id === createInstForm.studentId);
    const totalFee = Number(createInstForm.totalFee);
    const perInstallment = totalFee / count;
    const installments = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const due = new Date(today.getFullYear(), today.getMonth() + 1 + i, today.getDate());
      installments.push({ amount: Number(perInstallment.toFixed(2)), dueDate: due.toISOString() });
    }

    setCreatingInstallment(true);
    try {
      await feesAPI.createInstallmentPlan({
        studentId: createInstForm.studentId,
        batchId: student?.batchId,
        totalFee,
        installments,
      });
      showToast('Installment plan created', 'success');
      setShowCreateInstallment(false);
      setCreateInstForm({ studentId: '', totalFee: '', installmentCount: '3' });
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create installment plan');
    } finally {
      setCreatingInstallment(false);
    }
  };

  const installmentStatusLabel = (status) => {
    const v = (status || 'pending').toLowerCase();
    if (v === 'partial') return 'Partially Paid';
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  const openInstallmentDetails = async (studentId) => {
    setSelectedInstallmentStudentId(studentId);
    setShowInstallmentDetails(true);
    setInstallmentDetail(null);
    setInstallmentDetailError('');
    setInstallmentDetailLoading(true);
    try {
      const res = await feesAPI.getInstallmentPlan(studentId);
      setInstallmentDetail(res.data?.data || res.data);
    } catch (e) {
      setInstallmentDetailError(e?.response?.data?.message || 'Failed to load installment details');
    } finally {
      setInstallmentDetailLoading(false);
    }
  };

  const closeInstallmentDetails = () => {
    setShowInstallmentDetails(false);
    setSelectedInstallmentStudentId('');
    setInstallmentDetail(null);
    setInstallmentDetailError('');
  };

  const refetchInstallmentDetails = async () => {
    if (!selectedInstallmentStudentId) return;
    setInstallmentDetailLoading(true);
    try {
      const res = await feesAPI.getInstallmentPlan(selectedInstallmentStudentId);
      setInstallmentDetail(res.data?.data || res.data);
      setInstallmentDetailError('');
    } catch (e) {
      setInstallmentDetailError(e?.response?.data?.message || 'Failed to load installment details');
    } finally {
      setInstallmentDetailLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Student', 'Batch', 'Amount', 'Due', 'Status', 'Paid', 'Description'];
    const rows = filtered.map((f) => [
      f.studentId?.name || '',
      f.batchId?.name || '',
      f.amount,
      formatDate(f.dueDate),
      f.status,
      formatDate(f.paidDate),
      f.description || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = (fee) => {
    const w = window.open('', '_blank', 'width=500,height=650');
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;}td,th{border:1px solid #eee;padding:8px;}h1{font-size:18px;}</style></head><body>
        <h1>TuitionPro - Fee Receipt</h1>
        <table>
          <tr><th>Receipt No</th><td>${fee._id.slice(-6)}</td></tr>
          <tr><th>Student</th><td>${fee.studentId?.name || ''}</td></tr>
          <tr><th>Batch</th><td>${fee.batchId?.name || ''}</td></tr>
          <tr><th>Amount</th><td>₹${fee.amount}</td></tr>
          <tr><th>Due Date</th><td>${formatDate(fee.dueDate)}</td></tr>
          <tr><th>Paid Date</th><td>${formatDate(fee.paidDate)}</td></tr>
          <tr><th>Status</th><td>${fee.status}</td></tr>
          <tr><th>Description</th><td>${fee.description || ''}</td></tr>
        </table>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className='fees-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>FINANCE</span>
          <h2>Fees & Payments</h2>
          <p>Track collections, pending dues, and payment records.</p>
        </div>
        <div className='header-actions'>
          <button type='button' className='btn-secondary' onClick={exportCSV}>Export CSV</button>
          <button type='button' className='btn-secondary' onClick={() => setShowCreateInstallment(true)}>Create Installment Plan</button>
          <button type='button' className='btn-primary' onClick={() => openForm(null)}>+ Record Fee</button>
        </div>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon green'>₹</span><div><span>Collected</span><strong>{loading ? '—' : toINR(summary.collected)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon orange'>⏳</span><div><span>Pending</span><strong>{loading ? '—' : toINR(summary.pending)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon violet'>!</span><div><span>Overdue</span><strong>{loading ? '—' : toINR(summary.overdue)}</strong></div></article>
        <article className='stat-card'><span className='stat-icon blue'>Σ</span><div><span>Total</span><strong>{loading ? '—' : toINR(summary.total)}</strong></div></article>
      </section>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span aria-hidden='true'>⌕</span>
          <input type='search' placeholder='Search student or description…' value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}>
            <option value=''>All batches</option>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className='filter-group'>
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value=''>All statuses</option>
            <option value='paid'>Paid</option>
            <option value='pending'>Pending</option>
            <option value='partial'>Partial</option>
            <option value='overdue'>Overdue</option>
          </select>
        </div>
        <button type='button' className='btn-secondary' onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </section>
      {showForm && (
        <div className='premium-modal-backdrop' onClick={closeForm}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>{editing ? 'EDIT FEE' : 'RECORD FEE'}</span>
                <h3>{editing ? 'Edit Fee' : 'Record Fee'}</h3>
              </div>
              <button type='button' className='modal-close' onClick={closeForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className='premium-form'>
              <div className='form-grid'>
                <div className='form-group'>
                  <label>Student</label>
                  <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
                    <option value=''>Select Student</option>
                    {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className='form-group'>
                  <label>Batch</label>
                  <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                    <option value=''>Select Batch</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className='form-group'>
                  <label>Amount (₹)</label>
                  <input type='number' required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className='form-group'>
                  <label>Due Date</label>
                  <input type='date' required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className='form-group'>
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value='pending'>Pending</option>
                    <option value='paid'>Paid</option>
                    <option value='overdue'>Overdue</option>
                    <option value='partial'>Partial</option>
                  </select>
                </div>
                <div className='form-group'>
                  <label>Paid Date</label>
                  <input type='date' value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
                </div>
                <div className='form-group full'>
                  <label>Description</label>
                  <input type='text' value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className='form-actions'>
                <button type='submit' className='btn-primary' disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update Fee' : 'Create Fee')}</button>
                <button type='button' className='btn-secondary' onClick={closeForm} disabled={saving}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


      <section className='table-card' style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Installment Plans</h3>
        </div>
        {loading ? (
          <div className='skeleton-table'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
        ) : loadError ? (
          <div className='empty-state'>
            <div className='empty-icon'>!</div>
            <h3>Failed to load installment plans</h3>
            <p>{loadError}</p>
          </div>
        ) : installmentPlans.length === 0 ? (
          <div className='empty-state'>
            <div className='empty-icon'>₹</div>
            <h3>No installment plans found</h3>
            <p>Students with an installment plan will appear here.</p>
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Course Fee</th>
                  <th>Total Paid</th>
                  <th>Remaining</th>
                  <th>Installments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {installmentPlans.map((p) => (
                  <tr key={p.planId}>
                    <td><strong>{p.studentName}</strong></td>
                    <td className='fee-cell'>{toINR(p.totalFee)}</td>
                    <td>{toINR(p.totalPaid)}</td>
                    <td>{toINR(p.remaining)}</td>
                    <td>{p.installmentCount}</td>
                    <td>
                      <button type='button' className='btn-sm btn-copy' onClick={() => openInstallmentDetails(p.studentId)}>View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className='table-card'>
        {loading ? (
          <div className='skeleton-table'>{Array.from({ length: 6 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className='empty-state'>
            <div className='empty-icon'>₹</div>
            <h3>No fee records found</h3>
            <p>Create a fee record to start tracking payments.</p>
            <button type='button' className='btn-primary' onClick={() => openForm(null)}>+ Record Fee</button>
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div className='person-cell'>
                        <span className='avatar'>{f.studentId?.name?.[0]?.toUpperCase() || '?'}</span>
                        <div>
                          <strong>{f.studentId?.name || '—'}</strong>
                          <small>{f.studentId?.parentName || 'Student'}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className='pill'>{f.batchId?.name || '—'}</span></td>
                    <td className='fee-cell'>{toINR(f.amount)}</td>
                    <td>{formatDate(f.dueDate)}</td>
                    <td><span className={`status-badge ${statusBadge(f.status)}`}>{f.status}</span></td>
                    <td>{formatDate(f.paidDate)}</td>
                    <td>{f.description || '—'}</td>
                    <td>
                      <div className='actions'>
                        <button type='button' className='btn-sm btn-edit' onClick={() => openForm(f)}>Edit</button>
                        {f.status !== 'paid' && <button type='button' className='btn-sm btn-copy' onClick={() => handlePayment(f)}>Pay</button>}
                        <button type='button' className='btn-sm btn-copy' onClick={() => printReceipt(f)}>Receipt</button>
                        <button type='button' className='btn-sm btn-danger' onClick={() => handleDelete(f)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
      </section>
      {showInstallmentDetails && (
        <div className='premium-modal-backdrop' onClick={closeInstallmentDetails}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>INSTALLMENT DETAILS</span>
                <h3>{installmentDetail?.studentName || 'Installment Schedule'}</h3>
              </div>
              <button type='button' className='modal-close' onClick={closeInstallmentDetails}>×</button>
            </div>
            <div style={{ padding: '16px' }}>
              {installmentDetailLoading ? (
                <div className='skeleton-table'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
              ) : installmentDetailError ? (
                <div className='empty-state'>
                  <div className='empty-icon'>!</div>
                  <h3>Failed to load details</h3>
                  <p>{installmentDetailError}</p>
                </div>
              ) : !installmentDetail ? (
                <div className='empty-state'>
                  <div className='empty-icon'>₹</div>
                  <h3>No installment details found</h3>
                  <p>This student does not have an installment plan.</p>
                </div>
              ) : (
                <>
                  <div className='stats-grid' style={{ marginBottom: '16px' }}>
                    <article className='stat-card'><span className='stat-icon blue'>₹</span><div><span>Total Course Fee</span><strong>{toINR(installmentDetail.totalFee)}</strong></div></article>
                    <article className='stat-card'><span className='stat-icon green'>₹</span><div><span>Total Paid</span><strong>{toINR(installmentDetail.totalPaid)}</strong></div></article>
                    <article className='stat-card'><span className='stat-icon orange'>₹</span><div><span>Remaining</span><strong>{toINR(installmentDetail.remainingBalance)}</strong></div></article>
                    <article className='stat-card'><span className='stat-icon violet'>#</span><div><span>Installments</span><strong>{installmentDetail.installments?.length || 0}</strong></div></article>
                  </div>
                  {(!installmentDetail.installments || installmentDetail.installments.length === 0) ? (
                    <div className='empty-state'>
                      <div className='empty-icon'>₹</div>
                      <h3>No installments found</h3>
                      <p>This installment plan has no installments.</p>
                    </div>
                  ) : (
                    <div className='table-responsive'>
                      <table className='data-table premium-table'>
                        <thead>
                          <tr>
                            <th>Installment</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Paid</th>
                            <th>Remaining</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {installmentDetail.installments.map((inst) => (
                            <tr key={inst._id || inst.installmentNumber}>
                              <td>#{inst.installmentNumber}</td>
                              <td className='fee-cell'>{toINR(inst.amount)}</td>
                              <td>{formatDate(inst.dueDate)}</td>
                              <td>{toINR(inst.paidAmount)}</td>
                              <td>{toINR(inst.remaining)}</td>
                              <td><span className={`status-badge ${statusBadge(inst.status)}`}>{installmentStatusLabel(inst.status)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateInstallment && (
        <div className='premium-modal-backdrop' onClick={() => setShowCreateInstallment(false)}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>CREATE INSTALLMENT PLAN</span>
                <h3>New Installment Plan</h3>
              </div>
              <button type='button' className='modal-close' onClick={() => setShowCreateInstallment(false)}>×</button>
            </div>
            <form onSubmit={handleCreateInstallment} className='premium-form' style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className='form-group'>
                <label>Student</label>
                <select value={createInstForm.studentId} onChange={(e) => setCreateInstForm({ ...createInstForm, studentId: e.target.value })} required>
                  <option value=''>Select Student</option>
                  {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className='form-group'>
                <label>Total Course Fee (₹)</label>
                <input type='number' required value={createInstForm.totalFee} onChange={(e) => setCreateInstForm({ ...createInstForm, totalFee: e.target.value })} />
              </div>
              <div className='form-group'>
                <label>Number of Installments</label>
                <input type='number' min='1' required value={createInstForm.installmentCount} onChange={(e) => setCreateInstForm({ ...createInstForm, installmentCount: e.target.value })} />
              </div>
              <div className='form-actions'>
                <button type='submit' className='btn-primary' disabled={creatingInstallment}>{creatingInstallment ? 'Creating…' : 'Create Plan'}</button>
                <button type='button' className='btn-secondary' onClick={() => setShowCreateInstallment(false)} disabled={creatingInstallment}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
