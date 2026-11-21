import React, { useEffect, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

export default function Results() {
  const [attendance, setAttendance] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    Promise.all([
      studentPortalAPI.getAttendance(),
      studentPortalAPI.getAssignments(),
      studentPortalAPI.getFees(),
    ]).then(([a, as, f]) => {
      if (!active) return;
      setAttendance(a.data?.data?.summary || null);
      setAssignments(as.data?.data || []);
      setFees(f.data?.data?.summary || null);
    }).catch((err) => showToast(err.response?.data?.message || 'Failed to load progress'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  const openAssignments = assignments.filter((a) => a.status !== 'closed').length;
  const closedAssignments = assignments.filter((a) => a.status === 'closed').length;

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>PROGRESS</span>
          <h2>Results & Progress</h2>
          <p>Your academic progress overview.</p>
        </div>
      </header>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : (
        <>
          <section className='stats-grid'>
            <article className='stat-card'><div className='stat-icon' style={{ background: '#eef2ff', color: '#4f46e5' }}>📅</div><div><span>Attendance</span><strong>{attendance ? `${attendance.percentage}%` : '—'}</strong><small>{attendance ? `${attendance.present}/${attendance.total} present` : 'No records'}</small></div></article>
            <article className='stat-card'><div className='stat-icon' style={{ background: '#ecfdf5', color: '#059669' }}>📝</div><div><span>Assignments completed</span><strong>{closedAssignments}</strong><small>{openAssignments} open</small></div></article>
            <article className='stat-card'><div className='stat-icon' style={{ background: '#fff7ed', color: '#ea580c' }}>💳</div><div><span>Fees paid</span><strong>{fees ? fees.paid : 0}</strong><small>{fees ? `${fees.pending + fees.overdue} due` : 'No fees'}</small></div></article>
            <article className='stat-card'><div className='stat-icon' style={{ background: '#f5f3ff', color: '#7c3aed' }}>📚</div><div><span>Total assignments</span><strong>{assignments.length}</strong><small>Tracked</small></div></article>
          </section>

          <section className='panel' style={{ marginTop: 14 }}>
            <div className='panel-heading'><div><h3>Exam results</h3><p>Results tracking</p></div></div>
            <div className='empty-state'>
              <div className='empty-icon'>📊</div>
              <h3>Exam results are not tracked yet</h3>
              <p>The current backend does not store exam or grade records. Progress shown above is based on attendance, assignments, and fees.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}