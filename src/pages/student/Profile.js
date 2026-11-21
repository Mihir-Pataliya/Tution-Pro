import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentPortalAPI } from '../../api/studentPortalApi';
import useToast from '../../hooks/useToast';
import '../owner/PremiumOwner.css';
import '../teacher/TeacherDashboard.css';

const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return score;
};

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', tuitionName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await studentPortalAPI.getProfile();
      const u = res.data?.data?.user || {};
      setProfile({ name: u.name || '', phone: u.phone || '', email: u.email || '', tuitionName: u.tuitionName || '' });
    } catch (err) { showToast(err.response?.data?.message || 'Failed to load profile'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) { showToast('Name is required'); return; }
    setSaving(true);
    try {
      await studentPortalAPI.updateProfile({ name: profile.name, phone: profile.phone });
      if (updateUserProfile) updateUserProfile({ ownerName: profile.name, phone: profile.phone });
      showToast('Profile updated', 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) { showToast('Passwords do not match'); return; }
    if (passwords.next.length < 8) { showToast('New password must be at least 8 characters'); return; }
    setChanging(true);
    try {
      const res = await studentPortalAPI.changePassword(passwords.current, passwords.next);
      if (res.data?.data?.token) localStorage.setItem('token', res.data.data.token);
      showToast('Password changed', 'success');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) { showToast(err.response?.data?.message || 'Failed to change password'); }
    finally { setChanging(false); }
  };

  const initials = (profile.name || user?.name || 'S').split(' ').map((p) => p[0]).join('').slice(0,2).toUpperCase();
  const strength = passwordStrength(passwords.next);
  const strengthLabel = ['Very weak','Weak','Fair','Good','Strong','Excellent'][strength];
  const strengthColor = ['#ef4444','#f97316','#eab308','#22c55e','#16a34a','#15803d'][strength];

  return (
    <div className='premium-page'>
      <ToastComponent />
      <header className='premium-header profile-header'>
        <div className='profile-header-left'>
          <span className='profile-avatar-lg'>{initials}</span>
          <div>
            <span className='eyebrow'>ACCOUNT</span>
            <h2>{loading ? 'Loading…' : (profile.name || 'Student')}</h2>
            <p>{profile.email}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className='skeleton-list'>{Array.from({ length: 4 }).map((_, i) => <div className='skeleton-row' key={i} />)}</div>
      ) : (
        <div className='profile-grid'>
          <section className='panel'>
            <div className='panel-heading'><div><h3>Profile</h3><p>Update your details</p></div></div>
            <form className='premium-form' onSubmit={saveProfile}>
              <div className='form-group'>
                <label>Name</label>
                <div className='input-with-icon'><span>👤</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
              </div>
              <div className='form-group'>
                <label>Email</label>
                <div className='input-with-icon'><span>✉</span><input value={profile.email} disabled /></div>
              </div>
              <div className='form-group'>
                <label>Phone</label>
                <div className='input-with-icon'><span>📞</span><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              </div>
              <div className='form-group'>
                <label>Academy</label>
                <div className='input-with-icon'><span>🏫</span><input value={profile.tuitionName} disabled /></div>
              </div>
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </section>

          <section className='panel'>
            <div className='panel-heading'><div><h3>Security</h3><p>Change your password</p></div></div>
            <form className='premium-form' onSubmit={changePassword}>
              <div className='form-group'>
                <label>Current Password</label>
                <div className='input-with-icon'>
                  <span>🔒</span>
                  <input type={showCurrent ? 'text' : 'password'} value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
                  <button type='button' className='toggle-visibility' onClick={() => setShowCurrent((v) => !v)}>{showCurrent ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className='form-group'>
                <label>New Password</label>
                <div className='input-with-icon'>
                  <span>🔑</span>
                  <input type={showNext ? 'text' : 'password'} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required minLength={8} />
                  <button type='button' className='toggle-visibility' onClick={() => setShowNext((v) => !v)}>{showNext ? 'Hide' : 'Show'}</button>
                </div>
                {passwords.next && (
                  <div className='password-strength'>
                    <div className='strength-bar'><div className='strength-fill' style={{ width: `${(strength / 5) * 100}%`, background: strengthColor }} /></div>
                    <small style={{ color: strengthColor }}>{strengthLabel}</small>
                  </div>
                )}
              </div>
              <div className='form-group'>
                <label>Confirm Password</label>
                <div className='input-with-icon'>
                  <span>✅</span>
                  <input type={showConfirm ? 'text' : 'password'} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required minLength={8} />
                  <button type='button' className='toggle-visibility' onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? 'Hide' : 'Show'}</button>
                </div>
                {passwords.confirm && passwords.next !== passwords.confirm && (
                  <small style={{ color: '#dc2626', fontSize: 12 }}>Passwords do not match</small>
                )}
              </div>
              <div className='form-actions'>
                <button type='submit' className='save-button' disabled={changing}>{changing ? 'Changing…' : 'Change Password'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}