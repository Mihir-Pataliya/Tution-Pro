import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const subjectIcon = (subject = '') => {
  const s = String(subject).toLowerCase();
  if (s.includes('math')) return '📐';
  if (s.includes('sci')) return '🔬';
  if (s.includes('eng')) return '📖';
  if (s.includes('hist')) return '🏛️';
  if (s.includes('comp') || s.includes('code')) return '💻';
  if (s.includes('art')) return '🎨';
  if (s.includes('phys')) return '⚛️';
  if (s.includes('chem')) return '🧪';
  if (s.includes('bio')) return '🧬';
  return '📚';
};

export default function MyClasses() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    studentPortalAPI.getBatches()
      .then((res) => { if (active) setBatches(res.data?.data || []); })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load classes'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>CLASS MANAGEMENT</span>
          <h2>My Classes</h2>
          <p>Your assigned batches and schedules.</p>
        </div>
      </header>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : batches.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>▦</div>
          <h3>No classes assigned yet</h3>
          <p>Ask your academy to assign batches to your account.</p>
        </div>
      ) : (
        <div className='class-cards-grid'>
          {batches.map((b) => {
            const count = b.studentCount ?? 0;
            const max = b.maxStudents || 30;
            const pct = Math.min(100, Math.round((count / max) * 100));
            return (
              <article className='class-card' key={b.id || b._id}>
                <div className='class-card-head'>
                  <span className='class-subject-icon'>{subjectIcon(b.subject)}</span>
                  <div>
                    <strong>{b.name}</strong>
                    <span>{b.subject || 'Subject'}</span>
                  </div>
                </div>
                <div className='class-meta'>
                  <span>👥 {count}/{max} students</span>
                  <span>⏰ {b.timing || 'Timing not set'}</span>
                  <span>📅 {(b.days || []).join(', ') || 'Days not set'}</span>
                </div>
                <div className='progress-wrap'>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: `${pct}%` }} /></div>
                  <small>{pct}% capacity</small>
                </div>
                <div className='class-actions'>
                  <Link to='/student/timetable' className='btn-ripple btn-secondary-sm'>View Schedule</Link>
                  <Link to={`/student/attendance?batch=${b.id || b._id}`} className='btn-ripple btn-primary-sm'>Attendance</Link>
                  <Link to={`/student/materials?batch=${b.id || b._id}`} className='btn-ripple btn-secondary-sm'>Materials</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}