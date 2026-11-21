import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { batchAPI } from '../../api/batchApi';
import { studentAPI } from '../../api/studentApi';
import { teacherInviteAPI } from '../../api/teacherInvites';
import useToast from '../../hooks/useToast';
import './Batches.css';
import './PremiumOwner.css';

const emptyForm = { name: '', subject: '', timing: '' };

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchesRes, studentsRes, teachersRes] = await Promise.all([
        batchAPI.getAll(),
        studentAPI.getAll(),
        teacherInviteAPI.list('accepted'),
      ]);
      const batchesData = batchesRes.data?.data ?? batchesRes.data;
      const studentsData = studentsRes.data?.data ?? studentsRes.data;
      const teachersData = teachersRes.data?.data ?? teachersRes.data;
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load batches');
      showToast(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentCountByBatch = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const id = student.batchId?._id || student.batchId;
      if (id) map.set(String(id), (map.get(String(id)) || 0) + 1);
    });
    return map;
  }, [students]);

  const teachersByBatch = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) => {
      (teacher.batchIds || []).forEach((batch) => {
        const id = batch?._id || batch;
        if (!id) return;
        if (!map.has(String(id))) map.set(String(id), []);
        map.get(String(id)).push(teacher.name);
      });
    });
    return map;
  }, [teachers]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return batches;
    return batches.filter((batch) => [batch.name, batch.subject, batch.timing, batch.timings]
      .filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [batches, search]);

  const stats = useMemo(() => ({
    total: batches.length,
    withStudents: batches.filter((b) => (studentCountByBatch.get(String(b._id)) || 0) > 0).length,
    totalStudents: students.length,
    withTeachers: batches.filter((b) => (teachersByBatch.get(String(b._id)) || []).length > 0).length,
  }), [batches, students, studentCountByBatch, teachersByBatch]);

  const resetForm = () => { setFormData(emptyForm); setEditingBatch(null); setFormOpen(false); };
  const openAdd = () => { setEditingBatch(null); setFormData(emptyForm); setFormOpen(true); };
  const openEdit = (batch) => { setEditingBatch(batch); setFormData({ name: batch.name, subject: batch.subject || '', timing: batch.timing || batch.timings || '' }); setFormOpen(true); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = { ...formData, name: formData.name.trim(), timing: formData.timing.trim() };
    if (!data.name) { showToast('Batch name is required'); return; }
    setSaving(true);
    try {
      if (editingBatch) await batchAPI.update(editingBatch._id, data);
      else await batchAPI.create(data);
      showToast(editingBatch ? 'Batch updated successfully' : 'Batch created successfully', 'success');
      resetForm();
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await batchAPI.delete(id);
      showToast('Batch deleted successfully', 'success');
      if (editingBatch?._id === id) resetForm();
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete batch');
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className='batches-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>BATCH MANAGEMENT</span>
          <h2>Batches</h2>
          <p>Organize classes, subjects, timings, and assignments.</p>
        </div>
        <button type='button' className='btn-primary' onClick={openAdd}>+ Create Batch</button>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>▦</span><div><span>Total batches</span><strong>{loading ? '—' : stats.total}</strong></div></article>
        <article className='stat-card'><span className='stat-icon blue'>♙</span><div><span>With students</span><strong>{loading ? '—' : stats.withStudents}</strong></div></article>
        <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Total students</span><strong>{loading ? '—' : stats.totalStudents}</strong></div></article>
        <article className='stat-card'><span className='stat-icon orange'>♙</span><div><span>With teachers</span><strong>{loading ? '—' : stats.withTeachers}</strong></div></article>
      </section>

      <section className='toolbar-card'>
        <div className='search-box'>
          <span aria-hidden='true'>⌕</span>
          <input
            type='search'
            placeholder='Search batches, subjects, timings…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type='button' className='btn-secondary' onClick={fetchData} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </section>

      {formOpen && (
        <form className='batch-form premium-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label>Batch name <span aria-hidden='true'>*</span></label>
            <input name='name' type='text' value={formData.name} onChange={handleChange} placeholder='e.g. Grade 8 - Evening' required />
          </div>
          <div className='form-group'>
            <label>Subject</label>
            <input name='subject' type='text' value={formData.subject} onChange={handleChange} placeholder='Mathematics' />
          </div>
          <div className='form-group'>
            <label>Timing</label>
            <input name='timing' type='text' value={formData.timing} onChange={handleChange} placeholder='4:00 PM - 6:00 PM' />
          </div>
          <div className='form-actions'>
            <button type='submit' className='btn-primary' disabled={saving}>{saving ? 'Saving…' : (editingBatch ? 'Update Batch' : 'Create Batch')}</button>
            <button type='button' className='btn-secondary' onClick={resetForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      {error && <div className='error-banner'>{error}</div>}

      {loading ? (
        <div className='skeleton-cards'>
          {Array.from({ length: 4 }).map((_, i) => <div className='skeleton-card' key={i} />)}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>▦</div>
          <h3>{batches.length ? 'No matching batches' : 'No batches yet'}</h3>
          <p>{batches.length ? 'Try a different search term.' : 'Create your first batch to organize students.'}</p>
          {!batches.length && <button type='button' className='btn-primary' onClick={openAdd}>+ Create Batch</button>}
        </div>
      ) : (
        <section className='batch-card-grid'>
          {filteredBatches.map((batch) => {
            const count = studentCountByBatch.get(String(batch._id)) || 0;
            const teacherNames = teachersByBatch.get(String(batch._id)) || [];
            return (
              <article className='batch-card' key={batch._id}>
                <div className='batch-card-head'>
                  <div>
                    <h3>{batch.name}</h3>
                    <p>{batch.subject || 'General subject'}</p>
                  </div>
                  <span className='batch-count'>{count} students</span>
                </div>
                <div className='batch-meta'>
                  <div><span>Timing</span><strong>{batch.timing || batch.timings || 'Not set'}</strong></div>
                  <div><span>Teachers</span><strong>{teacherNames.length ? teacherNames.join(', ') : 'Unassigned'}</strong></div>
                </div>
                <div className='batch-card-actions'>
                  <button type='button' className='btn-sm btn-edit' onClick={() => openEdit(batch)}>Edit</button>
                  <button type='button' className='btn-sm btn-danger' onClick={() => handleDelete(batch._id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

