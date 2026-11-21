import React, { useEffect, useState } from 'react';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

export default function Settings() {
  const { showToast, ToastComponent } = useToast();
  const [prefs, setPrefs] = useState({ enquiries: true, followUps: true, fees: true, attendance: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [support, setSupport] = useState({ subject: '', content: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    studentPortalAPI.getSettings()
      .then((res) => { if (active) setPrefs(res.data?.data?.notificationPreferences || prefs); })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load settings'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentPortalAPI.updateSettings({ notificationPreferences: prefs });
      showToast('Settings updated', 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to update settings'); }
    finally { setSaving(false); }
  };

  const sendSupport = async (e) => {
    e.preventDefault();
    if (!support.content.trim()) { showToast('Message is required'); return; }
    setSending(true);
    try {
      await studentPortalAPI.sendMessage({ content: support.content, subject: support.subject || 'Support request', recipientType: 'academy' });
      showToast('Support request sent', 'success');
      setSupport({ subject: '', content: '' });
    } catch (err) { showToast(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header'>
        <div>
          <span className='eyebrow'>SETTINGS</span>
          <h2>Settings & Support</h2>
          <p>Manage preferences and contact support.</p>
        </div>
      </header>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : (
        <div className='profile-grid'>
          <section className='panel'>
            <div className='panel-heading'><div><h3>Notification preferences</h3><p>Choose what you receive</p></div></div>
            <form className='premium-form' onSubmit={save}>
              {['enquiries','followUps','fees','attendance'].map((key) => (
                <div className='form-group' key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ textTransform: 'capitalize' }}>{key}</label>
                  <button type='button' className={`tab-btn ${prefs[key] ? 'active' : ''}`} onClick={() => toggle(key)}>{prefs[key] ? 'On' : 'Off'}</button>
                </div>
              ))}
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</button>
              </div>
            </form>
          </section>

          <section className='panel'>
            <div className='panel-heading'><div><h3>Support</h3><p>Contact your academy</p></div></div>
            <form className='premium-form' onSubmit={sendSupport}>
              <div className='form-group'><label>Subject</label><input value={support.subject} onChange={(e) => setSupport({ ...support, subject: e.target.value })} placeholder='Subject (optional)' /></div>
              <div className='form-group'><label>Message *</label><textarea value={support.content} onChange={(e) => setSupport({ ...support, content: e.target.value })} rows={6} required placeholder='Describe your issue…' /></div>
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={sending}>{sending ? 'Sending…' : 'Send Request'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}