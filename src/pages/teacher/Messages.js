import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { teacherAPI } from '../../api/teacherApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import './TeacherDashboard.css';

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
      const [mRes, bRes] = await Promise.all([teacherAPI.getMessages(), teacherAPI.getBatches()]);
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
    teacherAPI.getRecipients(recipientType)
      .then((res) => { if (active) setRecipients(res.data?.data || []); })
      .catch(() => { if (active) showToast('Failed to load recipients'); })
      .finally(() => { if (active) setLoadingRecipients(false); });
    return () => { active = false; };
  }, [recipientType, showToast]);

  const inbox = useMemo(() => messages.filter((m) => m.recipient?.role === 'teacher'), [messages]);
  const sent = useMemo(() => messages.filter((m) => m.sender?.role === 'teacher'), [messages]);

  const filtered = useMemo(() => {
    const list = tab === 'inbox' ? inbox : sent;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => [m.subject, m.content, m.sender?.name, m.recipient?.name, m.batchId?.name].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [tab, inbox, sent, search]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: inbox.filter((m) => !m.read).length,
    sent: sent.length,
    announcements: messages.filter((m) => m.sender?.role !== 'teacher').length,
  }), [messages, inbox, sent]);

  const send = async (e) => {
    e.preventDefault();
    if (!recipientId) { showToast('Please select a recipient'); return; }
    if (!content.trim()) { showToast('Message content is required'); return; }
    setSending(true);
    try {
      await teacherAPI.sendMessage({ content, subject, batchId: batchId || undefined, recipientType, recipientId });
      showToast('Message sent', 'success');
      setContent(''); setSubject(''); setBatchId(''); setRecipientId(''); load();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const markRead = async (id) => {
    try { await teacherAPI.markMessageRead(id); load(); } catch (err) { /* ignore */ }
  };

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>COMMUNICATION</span>
          <h2>Messages</h2>
          <p>Stay connected with your academy.</p>
        </div>
      </header>

      <section className='stats-grid'>
        <article className='stat-card'><span className='stat-icon violet'>✉</span><div><span>Total</span><strong>{loading ? '—' : stats.total}</strong><small>All messages</small></div></article>
        <article className='stat-card'><span className='stat-icon orange'>!</span><div><span>Unread</span><strong>{loading ? '—' : stats.unread}</strong><small>Inbox</small></div></article>
        <article className='stat-card'><span className='stat-icon green'>✓</span><div><span>Sent</span><strong>{loading ? '—' : stats.sent}</strong><small>By you</small></div></article>
        <article className='stat-card'><span className='stat-icon blue'>📢</span><div><span>From Academy</span><strong>{loading ? '—' : stats.announcements}</strong><small>Received</small></div></article>
      </section>

      <section className='dashboard-grid overview-grid'>
        <article className='panel'>
          <div className='panel-heading'>
            <div><h3>{tab === 'inbox' ? 'Inbox' : 'Sent'}</h3><p>{filtered.length} messages</p></div>
            <div className='tab-group'>
              <button type='button' className={tab === 'inbox' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('inbox')}>Inbox</button>
              <button type='button' className={tab === 'sent' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('sent')}>Sent</button>
            </div>
          </div>
          <div className='search-box' style={{ marginBottom: 12 }}>
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
                const isInbox = m.recipient?.role === 'teacher';
                const unread = isInbox && !m.read;
                return (
                  <div className={`message-item ${unread ? 'unread' : ''}`} key={m.id || m._id}>
                    <div className='message-item-head'>
                      <div>
                        <strong>{m.subject || '(No subject)'}</strong>
                        <span>{isInbox ? `From: ${m.sender?.name || '—'} (${m.sender?.role || ''})` : `To: ${m.recipient?.name || '—'}`}{m.batchId?.name ? ` · ${m.batchId.name}` : ''}</span>
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
          <div className='panel-heading'><div><h3>Compose</h3><p>Send a message to your academy</p></div></div>
          <form className='premium-form' onSubmit={send}>
            <div className='form-group'>
              <label>Send To *</label>
              <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
                <option value='academy'>Academy Owner/Admin</option>
                <option value='teacher'>Another Teacher</option>
                <option value='student'>Student</option>
                <option value='parent'>Parent</option>
              </select>
            </div>
            <div className='form-group'>
              <label>Recipient *</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} disabled={loadingRecipients}>
                <option value=''>{loadingRecipients ? 'Loading recipients…' : 'Choose recipient'}</option>
                {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}{r.batchName ? ` · ${r.batchName}` : ''}</option>)}
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