import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../api/studentApi';
import { batchAPI } from '../../api/batchApi';
import useToast from '../../hooks/useToast';
import './Students.css';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parentName: '',
    parentPhone: '',
    batchId: '',
    monthlyFee: '',
  });
  const { showToast } = useToast();

  // Fetch batches for dropdown and filter options
  useEffect(() => {
    fetchBatches();
  }, []);

  // Fetch students based on filter
  useEffect(() => {
    fetchStudents();
  }, [filterBatchId]);

  const resetForm = () => {
    setFormData({
      name: '',
      parentName: '',
      parentPhone: '',
      batchId: '',
      monthlyFee: '',
    });
    setEditingStudent(null);
    setFormOpen(false);
  };

  const fetchBatches = async () => {
    try {
      const response = await batchAPI.getAll();
      setBatches(response.data?.data || response.data);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      // Non-fatal; we can still show empty dropdown
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterBatchId) {
        params.batchId = filterBatchId;
      }
      const response = await studentAPI.getAll(params);
      // Normalize response to array of students
      let studentsArray = [];
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          studentsArray = response.data.data;
        } else if (Array.isArray(response.data)) {
          studentsArray = response.data;
        }
        // If the data is an object with a students array inside
        else if (response.data.students && Array.isArray(response.data.students)) {
          studentsArray = response.data.students;
        }
      }
      setStudents(studentsArray);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
      showToast('Failed to load students', 'error');
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
      showToast('Student name is required', 'error');
      return;
    }
    if (!formData.batchId) {
      showToast('Please select a batch', 'error');
      return;
    }
    try {
      if (editingStudent) {
        await studentAPI.update(editingStudent._id, formData);
        showToast('Student updated successfully', 'success');
      } else {
        await studentAPI.create(formData);
        showToast('Student created successfully', 'success');
      }
      resetForm();
      fetchStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save student', 'error');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormOpen(true);
    setFormData({
      name: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      batchId: student.batchId?._id || '',
      monthlyFee: student.monthlyFee,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentAPI.delete(id);
      showToast('Student deleted successfully', 'success');
      if (editingStudent?._id === id) resetForm();
      fetchStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete student', 'error');
    }
  };

  const handleCopyLink = async (reportToken) => {
    const link = `${window.location.origin}/report/${reportToken}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied', 'success');
    } catch (err) {
      showToast('Failed to copy link', 'error');
    }
  };

  const openAddForm = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      parentName: '',
      parentPhone: '',
      batchId: '',
      monthlyFee: '',
    });
    setFormOpen(true);
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <div className='students-page'>
      <div className='students-top'>
        <div className='students-title-row'>
          <h2>Students</h2>
          <button type='button' className='add-student-button' onClick={openAddForm}>
            + Add student
          </button>
        </div>

        {/* Filter and form section */}
        <div className='students-controls'>
          <div className='filter-section'>
            <label htmlFor='filter-batch'>Filter by batch:</label>
            <select
              id='filter-batch'
              value={filterBatchId}
              onChange={(e) => setFilterBatchId(e.target.value)}
              disabled={loading}
            >
              <option value=''>All batches</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          {formOpen && (
            <section className='student-form' aria-label={editingStudent ? 'Edit student' : 'Add student'}>
              <form onSubmit={handleSubmit} className='form-grid'>
                <div className='form-group'>
                  <label htmlFor='student-name'>Student name <span aria-hidden='true'>*</span></label>
                  <input
                    type='text'
                    id='student-name'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder='Student name (required)'
                  />
                </div>
                <div className='form-group'>
                  <label htmlFor='parent-name'>Parent name</label>
                  <input
                    type='text'
                    id='parent-name'
                    name='parentName'
                    value={formData.parentName}
                    onChange={handleChange}
                    placeholder='Parent name'
                  />
                </div>
                <div className='form-group'>
                  <label htmlFor='parent-phone'>Parent phone</label>
                  <input
                    type='tel'
                    id='parent-phone'
                    name='parentPhone'
                    value={formData.parentPhone}
                    onChange={handleChange}
                    placeholder='Parent phone'
                  />
                </div>
                <div className='form-group'>
                  <label htmlFor='batch-dropdown'>Batch</label>
                  <select
                    id='batch-dropdown'
                    name='batchId'
                    value={formData.batchId}
                    onChange={handleChange}
                    required
                  >
                    <option value=''>Select a batch</option>
                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='form-group'>
                  <label htmlFor='monthly-fee'>Monthly fee</label>
                  <input
                    type='number'
                    id='monthly-fee'
                    name='monthlyFee'
                    value={formData.monthlyFee}
                    onChange={handleChange}
                    min='0'
                    step='0.01'
                    placeholder='Monthly fee'
                  />
                </div>
                <div className='form-actions'>
                  <button type='submit' className='btn-primary' disabled={loading}>
                    {editingStudent ? 'Update' : 'Save'}
                  </button>
                  <button type='button' onClick={handleCancel} className='btn-secondary'>Cancel</button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* Table section */}
      <section className='students-table-section' aria-label='Students list'>
        {error && <div className='error-message'>{error}</div>}

        {loading ? (
          <div className='loading-state'>Loading students...</div>
        ) : students.length === 0 ? (
          <div className='empty-state'>
            {batches.length === 0 ? (
              <>
                No batches yet. <a href='/owner/batches' className='link'>Add a batch first</a>.
              </>
            ) : (
              'No students yet. Please add your first student.'
            )}
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='data-table'>
              <thead>
                <tr>
                  <th scope='col'>Name</th>
                  <th scope='col'>Batch</th>
                  <th scope='col'>Parent phone</th>
                  <th scope='col'>Fee</th>
                  <th scope='col'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>{student.name}</td>
                    <td>
                      {student.batchId ? (
                        <span>
                          {student.batchId.name} ({student.batchId.timing})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{student.parentPhone || '—'}</td>
                    <td>
                      {student.monthlyFee !== undefined ? (
                        <span>${parseFloat(student.monthlyFee).toFixed(2)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='actions'>
                      <button
                        type='button'
                        onClick={() => handleCopyLink(student.reportToken)}
                        className='btn-sm btn-copy'
                        aria-label={`Copy report link for ${student.name}`}
                      >
                        Copy link
                      </button>
                      <button
                        type='button'
                        onClick={() => handleEdit(student)}
                        className='btn-sm btn-edit'
                        aria-label={`Edit ${student.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type='button'
                        onClick={() => handleDelete(student._id)}
                        className='btn-sm btn-danger'
                        aria-label={`Delete ${student.name}`}
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

export default StudentsPage;