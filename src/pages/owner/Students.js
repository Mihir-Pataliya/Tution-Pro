import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { studentAPI, batchAPI } from '../../api/auth';
import { studentInviteAPI } from '../../api/studentInvites';
import useToast from '../../hooks/useToast';
import AddEditStudentModal from './AddEditStudentModal';

import './Students.css';
import './PremiumOwner.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', batchIds: [] });
  const [inviteSaving, setInviteSaving] = useState(false);
  const pageSize = 8;
  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        studentAPI.getAll(),
        batchAPI.getAll(),
      ]);
      const studentsData = studentsRes.data?.data ?? studentsRes.data;
      const batchesData = batchesRes.data?.data ?? batchesRes.data;
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
      showToast(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filterBatch]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const batchId = student.batchId?._id || student.batchId;
      const matchesBatch = !filterBatch || batchId === filterBatch;
      const haystack = [student.name, student.parentName, student.parentPhone, student.batchId?.name]
        .filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesBatch && matchesSearch;
    });
  }, [students, search, filterBatch]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.isActive !== false).length;
    const feeTotal = students.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);
    return { total, active, feeTotal, batches: batches.length };
  }, [students, batches]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await studentAPI.create(data);
      setShowModal(false);
      setEditingStudent(null);
      showToast('Student created successfully', 'success');
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    try {
      await studentAPI.update(id, data);
      setShowModal(false);
      setEditingStudent(null);
      showToast('Student updated successfully', 'success');
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentAPI.delete(id);
      showToast('Student deleted successfully', 'success');
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const generateReportLink = (reportToken) => `${window.location.origin}/report/${reportToken}`;

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const values = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((v) => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
      const row = {};
      headers.forEach((header, index) => { row[header] = values[index] || ''; });
      return row;
    });
  };

  const handleImport = async (event) => {
    event.preventDefault();
    const file = event.target.file?.files?.[0];
    if (!file) { showToast('Please choose a CSV file.'); return; }
    setImporting(true);
    setImportProgress('Reading file…');
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { showToast('No student rows found in CSV.'); setImporting(false); return; }
      const batchMap = new Map(batches.map((b) => [String(b.name).toLowerCase(), b._id]));
      let successCount = 0;
      const errors = [];
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        setImportProgress(`Importing ${i + 1} of ${rows.length}…`);
        const batchId = batchMap.get(String(row.batch || row.batchname || row.batch_name || '').toLowerCase());
        if (!row.name || !batchId) { errors.push(`Row ${i + 2}: missing name or matching batch.`); continue; }
        try {
          await studentAPI.create({
            name: row.name.trim(),
            parentName: (row.parentname || row.parent_name || row.parent || '').trim() || 'Parent',
            parentPhone: (row.parentphone || row.parent_phone || row.phone || '').trim() || '0000000000',
            batchId,
            monthlyFee: Number(row.monthlyfee || row.monthly_fee || row.fee || 0) || 0,
          });
          successCount += 1;
        } catch (err) {
          errors.push(`Row ${i + 2}: ${err.response?.data?.message || 'Failed to create'}`);
        }
      }
      await fetchData();
      if (successCount) showToast(`${successCount} student(s) imported successfully.`, 'success');
      if (errors.length) showToast(errors.slice(0, 3).join(' '));
      if (successCount === rows.length) setShowImportModal(false);
    } catch (err) {
      showToast('Could not read or import the CSV file.');
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  const openAdd = () => { setEditingStudent(null); setShowModal(true); };
  const openInvite = () => setShowInviteModal(true);
  const openEdit = (student) => { setEditingStudent(student); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingStudent(null); };
  const openImport = () => setShowImportModal(true);
  const closeImport = () => { if (!importing) setShowImportModal(false); };
  const openReports = () => setShowReportsModal(true);
  const closeReports = () => setShowReportsModal(false);

  return (
    <div className='students-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>STUDENT MANAGEMENT</span>
          <h2>Students</h2>
          <p>Manage enrollments, batches, and learner records.</p>
        </div>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>♙</span><div><span>Total students</span><strong>{loading ? '—' : stats.total}</strong></div></article>
        <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Active students</span><strong>{loading ? '—' : stats.active}</strong></div></article>
        <article className='stat-card'><span className='stat-icon blue'>▦</span><div><span>Batches</span><strong>{loading ? '—' : stats.batches}</strong></div></article>
        <article className='stat-card'><span className='stat-icon orange'>₹</span><div><span>Monthly fees</span><strong>{loading ? '—' : money(stats.feeTotal)}</strong></div></article>
      </section>

      <section className='quick-actions-grid'>
        <button type='button' className='quick-action-card add-student' onClick={openAdd}>
          <span className='quick-action-icon'>＋</span>
          <div>
            <strong>Add New Student</strong>
            <small>Create a student record</small>
          </div>
        </button>
        <button type='button' className='quick-action-card' onClick={openInvite}>
          <span className='quick-action-icon'>✉</span>
          <div>
            <strong>Invite Student</strong>
            <small>Send secure invitation</small>
          </div>
        </button>
        <button type='button' className='quick-action-card' onClick={() => (window.location.href = '/owner/batches')}>
          <span className='quick-action-icon'>▦</span>
          <div>
            <strong>Manage Batches</strong>
            <small>Organize classes</small>
          </div>
        </button>
        <button type='button' className='quick-action-card' onClick={openImport}>
          <span className='quick-action-icon'>⤒</span>
          <div>
            <strong>Import Students</strong>
            <small>Upload CSV data</small>
          </div>
        </button>
        <button type='button' className='quick-action-card' onClick={openReports}>
          <span className='quick-action-icon'>📊</span>
          <div>
            <strong>View Reports</strong>
            <small>Student report links</small>
          </div>
        </button>
      </section>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span aria-hidden='true'>⌕</span>
          <input
            type='search'
            placeholder='Search students, parents, phone…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}>
            <option value=''>All batches</option>
            {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
          </select>
        </div>
        <button type='button' className='btn-secondary' onClick={fetchData} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </section>

      {error && <div className='error-banner'>{error}</div>}

      <section className='table-card'>
        {loading ? (
          <div className='skeleton-table'>
            {Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className='empty-state'>
            <div className='empty-icon'>♙</div>
            <h3>{students.length ? 'No matching students' : 'No students yet'}</h3>
            <p>{students.length ? 'Try a different search or batch filter.' : 'Add your first student to get started.'}</p>
            {!students.length && <button type='button' className='btn-primary' onClick={openAdd}>+ Add Student</button>}
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table premium-table'>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Parent</th>
                  <th>Phone</th>
                  <th>Monthly Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className='person-cell'>
                        <span className='avatar'>{student.name?.[0]?.toUpperCase() || '?'}</span>
                        <div>
                          <strong>{student.name}</strong>
                          <span className={`status-badge ${student.isActive === false ? 'inactive' : 'active'}`}>{student.isActive === false ? 'Inactive' : 'Active'}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className='pill'>{student.batchId?.name || batches.find((b) => b._id === (student.batchId?._id || student.batchId))?.name || 'N/A'}</span></td>
                    <td>{student.parentName || '—'}</td>
                    <td>{student.parentPhone || '—'}</td>
                    <td className='fee-cell'>{money(student.monthlyFee)}</td>
                    <td>
                      <div className='actions'>
                        <button type='button' className='btn-sm btn-edit' onClick={() => openEdit(student)}>Edit</button>
                        <button type='button' className='btn-sm btn-danger' onClick={() => handleDelete(student._id)}>Delete</button>
                        <button type='button' className='btn-sm btn-copy' onClick={() => { navigator.clipboard.writeText(generateReportLink(student.reportToken || '')); showToast('Report link copied!', 'success'); }}>Copy Link</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
      </section>

      {filteredStudents.length > pageSize && (
        <div className='pagination'>
          <button type='button' className='btn-secondary' disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type='button' className='btn-secondary' disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      )}

      {showImportModal && (
        <div className='premium-modal-backdrop' onClick={closeImport}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>IMPORT STUDENTS</span>
                <h3>Upload CSV</h3>
              </div>
              <button type='button' className='modal-close' onClick={closeImport}>×</button>
            </div>
            <form onSubmit={handleImport} className='premium-form'>
              <div className='form-group'>
                <label>CSV File</label>
                <input type='file' name='file' accept='.csv' required />
                <small style={{ color: '#64748b' }}>Columns: name, parentName/parent, parentPhone/phone, batch, monthlyFee/fee</small>
              </div>
              {importProgress && <div className='form-error' style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#3730a3' }}>{importProgress}</div>}
              <div className='form-actions'>
                <button type='button' className='btn-secondary' onClick={closeImport} disabled={importing}>Cancel</button>
                <button type='submit' className='btn-primary' disabled={importing}>{importing ? 'Importing…' : 'Import Students'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportsModal && (
        <div className='premium-modal-backdrop' onClick={closeReports}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <span className='eyebrow'>STUDENT REPORTS</span>
                <h3>Report Links</h3>
              </div>
              <button type='button' className='modal-close' onClick={closeReports}>×</button>
            </div>
            <div className='table-responsive'>
              <table className='premium-table'>
                <thead><tr><th>Student</th><th>Batch</th><th>Report Link</th></tr></thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.batchId?.name || '—'}</td>
                      <td>
                        <button type='button' className='btn-sm btn-copy' onClick={() => { navigator.clipboard.writeText(generateReportLink(student.reportToken || '')); showToast('Report link copied!', 'success'); }}>
                          Copy Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AddEditStudentModal
          batches={batches}
          student={editingStudent}
          saving={saving}
          onSave={editingStudent ? (data) => handleUpdate(editingStudent._id, data) : handleCreate}
          onClose={closeModal}        />
      )}

      {showInviteModal && (
        <div className='premium-modal-backdrop' onClick={() => setShowInviteModal(false)}>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div><span className='eyebrow'>INVITE STUDENT</span><h3>Invite a student</h3></div>
              <button className='modal-close' onClick={() => setShowInviteModal(false)}>�</button>
            </div>
            <form className='premium-form' onSubmit={async (e) => {
              e.preventDefault();
              setInviteSaving(true);
              try {
                await studentInviteAPI.create({ name: inviteForm.name, email: inviteForm.email, phone: inviteForm.phone, batchIds: inviteForm.batchIds });
                showToast('Invitation sent', 'success');
                setShowInviteModal(false);
                setInviteForm({ name: '', email: '', phone: '', batchIds: [] });
              } catch (err) { showToast(err.response?.data?.message || 'Failed to invite'); }
              finally { setInviteSaving(false); }
            }}>
              <div className='form-group'><label>Name *</label><input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} required /></div>
              <div className='form-group'><label>Email *</label><input type='email' value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required /></div>
              <div className='form-group'><label>Phone</label><input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} /></div>
              <div className='form-group'>
                <label>Batches</label>
                <select multiple value={inviteForm.batchIds} onChange={(e) => setInviteForm({ ...inviteForm, batchIds: Array.from(e.target.selectedOptions, (o) => o.value) })} style={{ minHeight: 90 }}>
                  {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className='form-actions'>
                <button type='submit' className='btn-primary' disabled={inviteSaving}>{inviteSaving ? 'Sending�' : 'Send Invitation'}</button>
                <button type='button' className='btn-secondary' onClick={() => setShowInviteModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
