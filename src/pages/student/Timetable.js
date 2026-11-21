import React, { useEffect, useMemo, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const subjectColor = (subject = '') => {
  const s = String(subject).toLowerCase();
  if (s.includes('math')) return '#7c5cff';
  if (s.includes('sci')) return '#2563eb';
  if (s.includes('eng')) return '#10b981';
  if (s.includes('phys')) return '#f59e0b';
  if (s.includes('chem')) return '#ef4444';
  if (s.includes('bio')) return '#14b8a6';
  return '#6366f1';
};

const getWeekStart = (offset = 0) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0,0,0,0);
  return monday;
};

const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function Timetable() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [batchFilter, setBatchFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    let active = true;
    studentPortalAPI.getBatches()
      .then((res) => { if (active) setBatches(res.data?.data || []); })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load timetable'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  const filtered = useMemo(() => batches.filter((b) => {
    if (batchFilter && (b.id || b._id) !== batchFilter) return false;
    if (subjectFilter && String(b.subject || '').toLowerCase() !== subjectFilter.toLowerCase()) return false;
    return true;
  }), [batches, batchFilter, subjectFilter]);

  const byDay = useMemo(() => DAYS.map((day) => ({
    day,
    batches: filtered.filter((b) => (b.days || []).some((d) => String(d).toLowerCase() === day.toLowerCase())),
  })), [filtered]);

  const weekStart = getWeekStart(weekOffset);
  const weekDays = DAYS.map((_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const todayStr = new Date().toDateString();
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayClasses = byDay[todayIndex]?.batches || [];
  const subjects = useMemo(() => [...new Set(batches.map((b) => b.subject).filter(Boolean))], [batches]);

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>SCHEDULE</span>
          <h2>Timetable</h2>
          <p>Your weekly class schedule.</p>
        </div>
        <div className='welcome-tools' style={{ gap: 8 }}>
          <button type='button' className='dashboard-refresh' onClick={() => setWeekOffset((w) => w - 1)} aria-label='Previous week'>‹</button>
          <span style={{ fontWeight: 650, color: '#17213b' }}>{formatDate(weekDays[0])} – {formatDate(weekDays[6])}</span>
          <button type='button' className='dashboard-refresh' onClick={() => setWeekOffset((w) => w + 1)} aria-label='Next week'>›</button>
          <button type='button' className='dashboard-refresh' onClick={() => setWeekOffset(0)} aria-label='Today' style={{ width: 'auto', padding: '0 12px', fontSize: 12 }}>Today</button>
        </div>
      </header>

      <section className='toolbar-card'>
        <div className='filter-group'>
          <label>Batch</label>
          <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value=''>All Batches</option>
            {batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className='filter-group'>
          <label>Subject</label>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value=''>All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </section>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : batches.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>📅</div>
          <h3>No classes scheduled</h3>
          <p>You have no assigned batches yet.</p>
        </div>
      ) : (
        <>
          <section className='weekly-grid'>
            {byDay.map((d, i) => {
              const isToday = weekDays[i].toDateString() === todayStr;
              return (
                <article className={`day-column ${isToday ? 'is-today' : ''}`} key={d.day}>
                  <div className='day-header'>
                    <strong>{d.day.slice(0,3)}</strong>
                    <span>{formatDate(weekDays[i])}</span>
                  </div>
                  <div className='day-classes'>
                    {d.batches.length === 0 ? (
                      <div className='day-empty'>No classes</div>
                    ) : d.batches.map((b) => (
                      <div className='timetable-card' key={b.id || b._id} style={{ borderLeftColor: subjectColor(b.subject) }}>
                        <strong>{b.name}</strong>
                        <span>{b.subject || 'Subject'}</span>
                        <span>⏰ {b.timing || 'Timing not set'}</span>
                        <span>👥 {b.studentCount ?? '—'} students</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>

          <section className='dashboard-grid bottom-grid' style={{ marginTop: 14 }}>
            <article className='panel'>
              <div className='panel-heading'><div><h3>Today's agenda</h3><p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div></div>
              {todayClasses.length === 0 ? (
                <div className='empty-state'><div className='empty-icon'>📅</div><h3>No classes today</h3><p>Enjoy your day off.</p></div>
              ) : (
                <div className='recent-enquiries-list'>
                  {todayClasses.map((b) => (
                    <div className='recent-enquiry-row' key={b.id || b._id}>
                      <div><strong>{b.name}</strong><span>{b.subject || 'Subject'} · {b.timing || 'Timing not set'}</span></div>
                      <span className='panel-chip'>{b.studentCount ?? 0} students</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className='panel'>
              <div className='panel-heading'><div><h3>Upcoming classes</h3><p>From your schedule</p></div></div>
              {filtered.length === 0 ? (
                <div className='empty-state'><div className='empty-icon'>⏭️</div><h3>No classes</h3><p>No batches assigned.</p></div>
              ) : (
                <div className='recent-enquiries-list'>
                  {filtered.slice(0, 6).map((b) => (
                    <div className='recent-enquiry-row' key={b.id || b._id}>
                      <div><strong>{b.name}</strong><span>{b.subject || 'Subject'} · {(b.days || []).join(', ') || 'Days not set'} · {b.timing || 'Timing not set'}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
