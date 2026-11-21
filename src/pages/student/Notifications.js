import React, { useEffect, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

export default function Notifications() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentPortalAPI.getMessages();
      const all = res.data?.data || [];
      // received by student
      const inbox = all.filter((m) => m.sender?.role !== 'student');
      setMessages(inbox);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try { await studentPortalAPI.markMessageRead(id); load(); } catch (err) { /* ignore */ }
  };

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>UPDATES</span>
          <h2>Notifications</h2>
          <p>Announcements and updates from your academy.</p>
        </div>
      </header>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 5 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : messages.length === 0 ? (
        <div className='empty-state'>
          <div className='empty-icon'>🔔</div>
          <h3>No notifications</h3>
          <p>Updates will appear here.</p>
        </div>
      ) : (
        <div className='message-list'>
          {messages.map((m) => {
            const unread = !m.read;
            return (
              <div className={`message-item ${unread ? 'unread' : ''}`} key={m.id || m._id}>
                <div className='message-item-head'>
                  <div>
                    <strong>{m.subject || '(No subject)'}</strong>
                    <span>From: {m.sender?.name || m.recipientName || '—'}{m.batchId ? ` · Batch` : ''}</span>
                  </div>
                  <div className='message-item-meta'>
                    <small>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</small>
                    {unread && <span className='unread-dot' />}
                  </div>
                </div>
                <p className='message-preview'>{String(m.content).slice(0, 200)}{m.content.length > 200 ? '…' : ''}</p>
                <div className='class-actions'>
                  {unread && <button type='button' className='btn-ripple btn-secondary-sm' onClick={() => markRead(m.id || m._id)}>Mark read</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}