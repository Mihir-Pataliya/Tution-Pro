import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('inbox');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [batchId, setBatchId] = useState('');
  const [recipientType, setRecipientType] = useState('academy');
  const [recipientId, setRecipientId] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, bRes] = await Promise.all([studentPortalAPI.getMessages(), studentPortalAPI.getBatches()]);
      setMessages(mRes.data?.data || []);
      setBatches(bRes.data?.data || []);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load messages'); }
    finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    setLoadingRecipients(true);
    setRecipients([]);
    setRecipientId('');
    studentPortalAPI.getRecipients(recipientType)
      .then((res) => { if (active) setRecipients(res.data?.data || []); })
      .catch(() => { if (active) showToast('Failed to load recipients'); })
      .finally(() => { if (active) setLoadingRecipients(false); });
    return () => { active = false; };
  }, [recipientType, showToast]);

  const sent = useMemo(() => messages.filter((m) => m.sender?.role === 'student'), [messages]);
  const inboxList = useMemo(() => messages.filter((m) => !sent.includes(m)), [messages, sent]);

  const filtered = useMemo(() => {
    const list = tab === 'inbox' ? inboxList : sent;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => [m.subject, m.content, m.sender?.name, m.recipientName].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [tab, inboxList, sent, search]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: inboxList.filter((m) => !m.read).length,
    sent: sent.length,
  }), [messages, inboxList, sent]);

  const send = async (e) => {
    e.preventDefault();
    if (!recipientId && recipientType !== 'academy') { showToast('Please select a recipient'); return; }
    if (!content.trim()) { showToast('Message content is required'); return; }
    setSending(true);
    try {
      await studentPortalAPI.sendMessage({ content, subject, batchId: batchId || undefined, recipientType, recipientId: recipientId || undefined });
      showToast('Message sent', 'success');
      setContent(''); setSubject(''); setBatchId(''); setRecipientId(''); load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const markRead = async (id) => {
    try { await studentPortalAPI.markMessageRead(id); load(); } catch (err) { /* ignore */ }
  };

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>COMMUNICATION</span>
          <h2>Messages</h2>
          <p>Communicate with your academy.</p>
        </div>
      </header>

      <section className='stats-grid' style={{ marginBottom: 14 }}>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#eef2ff', color: '#4f46e5' }}>✉</div><div><span>Total</span><strong>{stats.total}</strong><small>Messages</small></div></article>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#fef2f2', color: '#dc2626' }}>🔔</div><div><span>Unread</span><strong>{stats.unread}</strong><small>Inbox</small></div></article>
        <article className='stat-card'><div className='stat-icon' style={{ background: '#ecfdf5', color: '#059669' }}>📤</div><div><span>Sent</span><strong>{stats.sent}</strong><small>By you</small></div></article>
      </section>

      <section className='dashboard-grid bottom-grid'>
        <article className='panel'>
          <div className='panel-heading'><div><h3>{tab === 'inbox' ? 'Inbox' : 'Sent'}</h3><p>Your messages</p></div>
            <div className='tab-group'>
              <button className={`tab-btn ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>Inbox</button>
              <button className={`tab-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>Sent</button>
            </div>
          </div>
          <div className='search-box' style={{ marginBottom: 10 }}>
            <span>🔍</span>
            <input placeholder='Search messages…' value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className='empty-state'><div className='empty-icon'>✉</div><h3>No messages</h3><p>Your messages will appear here.</p></div>
          ) : (
            <div className='message-list'>
              {filtered.map((m) => {
                const isInbox = tab === 'inbox';
                const unread = isInbox && !m.read;
                return (
                  <div className={`message-item ${unread ? 'unread' : ''}`} key={m.id || m._id}>
                    <div className='message-item-head'>
                      <div>
                        <strong>{m.subject || '(No subject)'}</strong>
                        <span>{isInbox ? `From: ${m.sender?.name || '—'}` : `To: ${m.recipientName || '—'}`}</span>
                      </div>
                      <div className='message-item-meta'>
                        <small>{fmtDate(m.createdAt)}</small>
                        {unread && <span className='unread-dot' />}
                      </div>
                    </div>
                    <p className='message-preview'>{String(m.content).slice(0, 140)}{m.content.length > 140 ? '…' : ''}</p>
                    <div className='class-actions'>
                      {unread && <button type='button' className='btn-ripple btn-secondary-sm' onClick={() => markRead(m.id || m._id)}>Mark read</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className='panel'>
          <div className='panel-heading'><div><h3>Compose</h3><p>Send a message</p></div></div>
          <form className='premium-form' onSubmit={send}>
            <div className='form-group'>
              <label>Send To *</label>
              <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
                <option value='academy'>Academy Owner/Admin</option>
                <option value='teacher'>Teacher</option>
                <option value='student'>Student</option>
              </select>
            </div>
            <div className='form-group'>
              <label>Recipient *</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} disabled={loadingRecipients || recipientType === 'academy'}>
                <option value=''>{recipientType === 'academy' ? 'Academy owner' : (loadingRecipients ? 'Loading recipients…' : 'Choose recipient')}</option>
                {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className='form-group'><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder='Subject (optional)' /></div>
            <div className='form-group'><label>Batch (optional)</label><select value={batchId} onChange={(e) => setBatchId(e.target.value)}><option value=''>No batch</option>{batches.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}</select></div>
            <div className='form-group'><label>Message *</label><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} required placeholder='Write your message…' /></div>
            <div className='form-actions'>
              <button type='submit' className='save-button' disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}