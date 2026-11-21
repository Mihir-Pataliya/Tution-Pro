import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

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

const nextClassInfo = (days, timing) => {
  const today = new Date();
  const todayIdx = today.getDay();
  let minDiff = 8;
  let targetIdx = null;
  (days || []).forEach((d) => {
    const idx = DAYS.findIndex((x) => x.toLowerCase() === String(d).toLowerCase());
    if (idx < 0) return;
    let diff = idx - todayIdx;
    if (diff < 0) diff += 7;
    if (diff < minDiff) { minDiff = diff; targetIdx = idx; }
  });
  if (targetIdx === null) return 'Schedule not set';
  const label = minDiff === 0 ? 'Today' : minDiff === 1 ? 'Tomorrow' : DAYS[targetIdx];
  return `${label}${timing ? ' · ' + timing : ''}`;
};

export default function MyClasses() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    teacherAPI.getBatches()
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
          <p>Ask your academy owner to assign batches to your account.</p>
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
                  <span>⏭️ Next: {nextClassInfo(b.days, b.timing)}</span>
                </div>
                <div className='progress-wrap'>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: `${pct}%` }} /></div>
                  <small>{pct}% capacity</small>
                </div>
                <div className='class-actions'>
                  <Link to='/teacher/timetable' className='btn-ripple btn-secondary-sm'>View Class</Link>
                  <Link to={`/teacher/students?batch=${b.id || b._id}`} className='btn-ripple btn-secondary-sm'>View Students</Link>
                  <Link to={`/teacher/attendance?batch=${b.id || b._id}`} className='btn-ripple btn-primary-sm'>Mark Attendance</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}