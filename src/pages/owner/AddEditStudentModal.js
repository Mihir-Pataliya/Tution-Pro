import React, { useState } from 'react';

const AddEditStudentModal = ({ batches, student, saving, onSave, onClose }) => {
  const [name, setName] = useState(student?.name || '');
  const [parentName, setParentName] = useState(student?.parentName || '');
  const [parentPhone, setParentPhone] = useState(student?.parentPhone || '');
  const [batchId, setBatchId] = useState(student?.batchId?._id || student?.batchId || '');
  const [monthlyFee, setMonthlyFee] = useState(student?.monthlyFee ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) { setError('Student name is required.'); return; }
    if (!parentName.trim()) { setError('Parent name is required.'); return; }
    if (!parentPhone.trim()) { setError('Parent phone is required.'); return; }
    if (!batchId) { setError('Please select a batch.'); return; }
    const fee = Number(monthlyFee);
    if (Number.isNaN(fee) || fee < 0) { setError('Monthly fee must be a valid number.'); return; }
    onSave({
      name: name.trim(),
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      batchId,
      monthlyFee: fee,
    });
  };

  return (
    <div className='modal-backdrop premium-modal-backdrop' onClick={onClose}>
      <div className='modal-content premium-modal' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <div>
            <span className='eyebrow'>{student ? 'EDIT STUDENT' : 'NEW STUDENT'}</span>
            <h3>{student ? 'Edit Student' : 'Add Student'}</h3>
          </div>
          <button type='button' className='modal-close' onClick={onClose} aria-label='Close'>×</button>
        </div>
        <form onSubmit={handleSubmit} className='modal-form premium-form'>
          {error && <div className='form-error'>{error}</div>}
          <div className='form-grid'>
            <div className='form-group'>
              <label>Student Name</label>
              <input type='text' value={name} onChange={(e) => setName(e.target.value)} placeholder='Student full name' required />
            </div>
            <div className='form-group'>
              <label>Parent Name</label>
              <input type='text' value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder='Parent / guardian' required />
            </div>
            <div className='form-group'>
              <label>Parent Phone</label>
              <input type='tel' value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder='+91…' required />
            </div>
            <div className='form-group'>
              <label>Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
                <option value=''>Select batch</option>
                {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
              </select>
            </div>
            <div className='form-group'>
              <label>Monthly Fee (₹)</label>
              <input type='number' value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} min='0' step='100' placeholder='0' required />
            </div>
          </div>
          <div className='form-actions'>
            <button type='button' className='btn-secondary' onClick={onClose} disabled={saving}>Cancel</button>
            <button type='submit' className='btn-primary' disabled={saving}>
              {saving ? 'Saving…' : (student ? 'Update Student' : 'Add Student')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditStudentModal;

