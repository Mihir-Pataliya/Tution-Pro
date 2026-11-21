import React, { useState, useEffect } from 'react';
import { batchAPI } from '../../api/batchApi';
import useToast from '../../hooks/useToast';
import './Batches.css';

const BatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingBatch, setEditingBatch] = useState(null);
  const [formOpen, setFormOpen] = useState(true);
  const [formData, setFormData] = useState({ name: '', subject: '', timing: '' });
  const { showToast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', subject: '', timing: '' });
    setEditingBatch(null);
    setFormOpen(false);
  };

  const fetchBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await batchAPI.getAll();
      setBatches(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load batches');
      showToast('Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Batch name is required', 'error');
      return;
    }
    try {
      if (editingBatch) {
        await batchAPI.update(editingBatch._id, formData);
        showToast('Batch updated successfully', 'success');
      } else {
        await batchAPI.create(formData);
        showToast('Batch created successfully', 'success');
      }
      resetForm();
      fetchBatches();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save batch', 'error');
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormOpen(true);
    setFormData({ name: batch.name, subject: batch.subject || '', timing: batch.timing || '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await batchAPI.delete(id);
      showToast('Batch deleted successfully', 'success');
      if (editingBatch?._id === id) resetForm();
      fetchBatches();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete batch', 'error');
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const openAddForm = () => {
    setEditingBatch(null);
    setFormData({ name: '', subject: '', timing: '' });
    setFormOpen(true);
  };

  return (
    <div className='batches-page'>
      <div className='batches-top'>
        <div className='batches-title-row'>
          <h2>Batches</h2>
          <button type='button' className='add-batch-button' onClick={openAddForm}>
            + Add batch
          </button>
        </div>

        {formOpen && (
          <section className='batch-form' aria-label={editingBatch ? 'Edit batch' : 'Add batch'}>
            <form onSubmit={handleSubmit} className='form-grid'>
              <div className='form-group'>
                <label htmlFor='batch-name'>Batch name <span aria-hidden='true'>*</span></label>
                <input
                  type='text'
                  id='batch-name'
                  name='name'
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder='Batch name (required)'
                />
              </div>
              <div className='form-group'>
                <label htmlFor='batch-subject'>Subject</label>
                <input
                  type='text'
                  id='batch-subject'
                  name='subject'
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder='Subject'
                />
              </div>
              <div className='form-group'>
                <label htmlFor='batch-timing'>Timing</label>
                <input
                  type='text'
                  id='batch-timing'
                  name='timing'
                  value={formData.timing}
                  onChange={handleChange}
                  placeholder='Timing'
                />
              </div>
              <div className='form-actions'>
                <button type='submit' className='btn-primary' disabled={loading}>
                  {editingBatch ? 'Update' : 'Save'}
                </button>
                <button type='button' onClick={handleCancel} className='btn-secondary'>Cancel</button>
              </div>
            </form>
          </section>
        )}
      </div>

      <section className='batch-table-section' aria-label='Batches list'>
        {error && <div className='error-message'>{error}</div>}

        {loading ? (
          <div className='loading-state'>Loading batches...</div>
        ) : batches.length === 0 ? (
          <div className='empty-state'>No batches yet. Add your first batch above.</div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table'>
              <thead>
                <tr>
                  <th scope='col'>Batch name</th>
                  <th scope='col'>Subject</th>
                  <th scope='col'>Timing</th>
                  <th scope='col'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch._id}>
                    <td>{batch.name}</td>
                    <td>{batch.subject || '—'}</td>
                    <td>{batch.timing || '—'}</td>
                    <td className='actions'>
                      <button
                        type='button'
                        onClick={() => handleEdit(batch)}
                        className='btn-sm btn-edit'
                        aria-label={`Edit ${batch.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        onClick={() => handleDelete(batch._id)}
                        className='btn-sm btn-danger'
                        aria-label={`Delete ${batch.name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default BatchesPage;
