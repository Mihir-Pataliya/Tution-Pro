import React, { useState } from 'react';

const AddEditBatchModal = ({ batch, onSave, onClose }) => {
  const [name, setName] = useState(batch?.name || '');
  const [subject, setSubject] = useState(batch?.subject || '');
  const [timing, setTiming] = useState(batch?.timing || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, subject, timing });
  };

  return (
    <div className='modal-backdrop' onClick={onClose}>
      <div className='modal-content' onClick={e => e.stopPropagation()}>
        <h3>{batch ? 'Edit Batch' : 'Add Batch'}</h3>
        <form onSubmit={handleSubmit} className='modal-form'>
          <div className='form-group'>
            <label>Batch Name</label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className='form-group'>
            <label>Subject</label>
            <input
              type='text'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className='form-group'>
            <label>Timing</label>
            <input
              type='text'
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              required
              placeholder='e.g., 4:00 PM - 6:00 PM'
            />
          </div>
          <div className='form-actions'>
            <button type='button' onClick={onClose} className='btn-secondary'>
              Cancel
            </button>
            <button type='submit' className='btn-primary'>
              {batch ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditBatchModal;