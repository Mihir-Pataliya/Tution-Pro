import React, { useCallback, useEffect, useRef, useState } from 'react';
import { settingsAPI } from '../../api/settings';
import { useAuth } from '../../context/AuthContext';
import useToast from '../../hooks/useToast';
import './Settings.css';
import './PremiumOwner.css';

const permissionOptions = [
  ['students', 'Students'], ['batches', 'Batches'], ['attendance', 'Attendance'],
  ['fees', 'Fees & payments'], ['enquiries', 'Enquiries'], ['settings', 'Settings'],
];
const initialSettings = {
  profile: { academyName: '', ownerName: '', email: '', phone: '', address: '', website: '', logo: '' },
  notifications: { enquiries: true, followUps: true, fees: true, attendance: true },
  permissions: { admin: [], teacher: [] },
  subscription: { plan: 'starter', expiresAt: '', limits: { students: 50, batches: 5, teachers: 0 } },
};
const dateValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function Settings() {
  const { updateUserProfile, replaceSessionToken } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const profileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await settingsAPI.get();
      const data = response.data?.data || {};
      setSettings({
        profile: { ...initialSettings.profile, ...(data.profile || {}) },
        notifications: { ...initialSettings.notifications, ...(data.notifications || {}) },
        permissions: { ...initialSettings.permissions, ...(data.permissions || {}) },
        subscription: {
          ...initialSettings.subscription,
          ...(data.subscription || {}),
          expiresAt: dateValue(data.subscription?.expiresAt),
          limits: { ...initialSettings.subscription.limits, ...(data.subscription?.limits || {}) },
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (action, data, successText, onSuccess) => {
    setSaving(true);
    try {
      await action(data);
      if (onSuccess) onSuccess();
      showToast(successText, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const profile = settings.profile;
    if (!profile.academyName.trim() || !profile.ownerName.trim() || !profile.email.trim() || !profile.phone.trim()) {
      showToast('Academy name, owner name, email, and phone are required.');
      return;
    }
    save(settingsAPI.updateProfile, profile, 'Academy profile saved.', () => updateUserProfile(profile));
  };

  const saveNotifications = () => save(settingsAPI.updateNotifications, settings.notifications, 'Notification preferences saved.');
  const savePermissions = () => save(settingsAPI.updatePermissions, settings.permissions, 'Role permissions saved.');
  const saveSubscription = (event) => {
    event.preventDefault();
    save(settingsAPI.updateSubscription, {
      ...settings.subscription,
      expiresAt: settings.subscription.expiresAt || null,
      limits: Object.fromEntries(Object.entries(settings.subscription.limits).map(([key, value]) => [key, Number(value)])),
    }, 'Subscription settings saved.');
  };

  const chooseLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showToast('Choose a PNG, JPEG, or WebP logo under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSettings((current) => ({ ...current, profile: { ...current.profile, logo: reader.result } }));
    reader.onerror = () => showToast('The selected logo could not be read.');
    reader.readAsDataURL(file);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const response = await settingsAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      const token = response.data?.data?.token;
      if (token) replaceSessionToken(token);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (role, permission) => setSettings((current) => {
    const currentSet = new Set(current.permissions[role] || []);
    currentSet.has(permission) ? currentSet.delete(permission) : currentSet.add(permission);
    return { ...current, permissions: { ...current.permissions, [role]: [...currentSet] } };
  });

  const toggleNotification = (key) => setSettings((current) => ({
    ...current,
    notifications: { ...current.notifications, [key]: !current.notifications[key] },
  }));

  const profile = settings.profile;
  const subscription = settings.subscription;
  const expired = subscription.expiresAt && new Date(`${subscription.expiresAt}T23:59:59`) < new Date();

  const scrollToProfile = () => {
    profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className='settings-page premium-page'>
      <ToastComponent />
      <header className='page-header premium-header'>
        <div>
          <span className='eyebrow'>OWNER WORKSPACE</span>
          <h2>Settings & Subscription</h2>
          <p>Manage academy details, access preferences, and your plan.</p>
        </div>
        <button className='btn-secondary' type='button' onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      {error && <div className='error-banner'>{error}<button type='button' onClick={load}>Retry</button></div>}

      <section className='settings-banner'>
        <div className='settings-banner-copy'>
          <span className='eyebrow'>ACADEMY SETTINGS</span>
          <h3>Shape your academy experience</h3>
          <p>Update your academy identity, notification preferences, security, and subscription from one premium workspace.</p>
        </div>
        <div className='settings-banner-art' aria-hidden='true'>
          <svg viewBox='0 0 220 150' role='img'>
            <rect x='24' y='34' width='172' height='92' rx='18' fill='rgba(255,255,255,0.16)' />
            <path d='M48 104V62l62-34 62 34v42' fill='rgba(255,255,255,0.28)' />
            <path d='M76 104V76h32v28M112 104V70h32v34' fill='rgba(255,255,255,0.42)' />
            <circle cx='110' cy='24' r='10' fill='#fbbf24' />
          </svg>
        </div>
      </section>
      <nav className='settings-tabs premium-tabs' aria-label='Settings sections'>
        {[['profile', 'Academy Profile'], ['access', 'Security & Access'], ['subscription', 'Subscription']].map(([id, label]) => (
          <button key={id} type='button' className={activeTab === id ? 'selected' : ''} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </nav>

      {loading ? (
        <div className='skeleton-cards'>{Array.from({ length: 3 }).map((_, i) => <div className='skeleton-card' key={i} />)}</div>
      ) : (
        <>
          {activeTab === 'profile' && (
            <div className='settings-grid'>
              <div className='settings-left-stack'><form className='settings-card' ref={profileRef} onSubmit={saveProfile}>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>ACADEMY PROFILE</span>
                    <h3>Academy Profile</h3>
                  </div>
                </div>
                <div className='form-grid premium-form-grid'>
                  <div className='form-group'>
                    <label>Academy name</label>
                    <input required maxLength={100} value={profile.academyName} onChange={(e) => setSettings({ ...settings, profile: { ...profile, academyName: e.target.value } })} />
                  </div>
                  <div className='form-group'>
                    <label>Owner name</label>
                    <input required maxLength={100} value={profile.ownerName} onChange={(e) => setSettings({ ...settings, profile: { ...profile, ownerName: e.target.value } })} />
                  </div>
                  <div className='form-group'>
                    <label>Email address</label>
                    <input required type='email' value={profile.email} onChange={(e) => setSettings({ ...settings, profile: { ...profile, email: e.target.value } })} />
                  </div>
                  <div className='form-group'>
                    <label>Contact phone</label>
                    <input required type='tel' maxLength={100} value={profile.phone} onChange={(e) => setSettings({ ...settings, profile: { ...profile, phone: e.target.value } })} />
                  </div>
                  <div className='form-group'>
                    <label>Website</label>
                    <input type='url' placeholder='https://example.com' value={profile.website} onChange={(e) => setSettings({ ...settings, profile: { ...profile, website: e.target.value } })} />
                  </div>
                  <div className='form-group'>
                    <label>Academy address</label>
                    <input maxLength={300} value={profile.address} onChange={(e) => setSettings({ ...settings, profile: { ...profile, address: e.target.value } })} />
                  </div>
                </div>
                <div className='logo-row'>
                  <div className='logo-preview'>{profile.logo ? <img src={profile.logo} alt='Academy logo preview' /> : <span>{profile.academyName?.slice(0, 1)?.toUpperCase() || 'T'}</span>}</div>
                  <div>
                    <strong>Academy logo</strong>
                    <p>PNG, JPEG, or WebP · Maximum 2 MB</p>
                    <div className='inline-actions'>
                      <label className='btn-secondary' style={{ cursor: 'pointer' }}>Choose image<input type='file' accept='image/png,image/jpeg,image/webp' onChange={chooseLogo} hidden /></label>
                      {profile.logo && <button className='text-button' type='button' onClick={() => setSettings({ ...settings, profile: { ...profile, logo: '' } })}>Remove logo</button>}
                    </div>
                  </div>
                </div>
                <div className='settings-actions'>
                  <button className='btn-primary' type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>

              <section className='settings-card academy-info-card'>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>ACADEMY INFORMATION</span>
                    <h3>Academy Details</h3>
                  </div>
                  <button className='btn-secondary' type='button' onClick={scrollToProfile}>Edit</button>
                </div>
                <div className='info-grid'>
                  <div><span>Academy</span><strong>{profile.academyName || 'Not set'}</strong></div>
                  <div><span>Owner</span><strong>{profile.ownerName || 'Not set'}</strong></div>
                  <div><span>Email</span><strong>{profile.email || 'Not set'}</strong></div>
                  <div><span>Phone</span><strong>{profile.phone || 'Not set'}</strong></div>
                  <div><span>Website</span><strong>{profile.website || 'Not set'}</strong></div>
                  <div><span>Address</span><strong>{profile.address || 'Not set'}</strong></div>
                </div>
              </section>
            </div>

            <div className='settings-side-stack'>
              <section className='settings-card'>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>NOTIFICATIONS</span>
                    <h3>Notification Preferences</h3>
                  </div>
                </div>
                  <div className='toggle-list'>
                    {[
                      ['enquiries', 'New enquiries', 'When a prospective student is added'],
                      ['followUps', 'Follow-up reminders', 'Upcoming enquiry follow-ups'],
                      ['fees', 'Fee updates', 'Payment and overdue fee activity'],
                      ['attendance', 'Attendance updates', 'Daily class attendance activity'],
                    ].map(([key, title, description]) => (
                      <label className='toggle-row' key={key}>
                        <span>
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                        <input type='checkbox' checked={!!settings.notifications[key]} onChange={() => toggleNotification(key)} />
                      </label>
                    ))}
                  </div>
                  <div className='settings-actions'>
                    <button className='btn-primary' type='button' onClick={saveNotifications} disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</button>
                  </div>
                </section>

                <section className='settings-card subscription-dark-card'>
                  <div className='modal-header'>
                    <div>
                      <span className='eyebrow'>SUBSCRIPTION PLAN</span>
                      <h3>Current Plan</h3>
                    </div>
                    <span className={`status-badge ${expired ? 'overdue' : 'paid'}`}>{expired ? 'Expired' : 'Active'}</span>
                  </div>
                  <div className='crown-row'>
                    <span className='crown-icon'>👑</span>
                    <div>
                      <strong>{subscription.plan?.charAt(0).toUpperCase() + subscription.plan?.slice(1)}</strong>
                      <small>TuitionPro subscription</small>
                    </div>
                  </div>
                  <div className='plan-limit-row'><span>Expiry</span><strong>{subscription.expiresAt ? new Date(`${subscription.expiresAt}T00:00:00`).toLocaleDateString() : 'No expiry'}</strong></div>
                  <div className='feature-checklist'>
                    <div>✓ Up to {subscription.limits.students} students</div>
                    <div>✓ Up to {subscription.limits.batches} batches</div>
                    <div>✓ Up to {subscription.limits.teachers} teachers</div>
                    <div>{expired ? '✕ Plan expired' : '✓ Account active'}</div>
                  </div>
                  <div className='settings-actions' style={{ borderTop: 0, paddingTop: 12 }}>
                    <button className='btn-primary' type='button' onClick={() => document.getElementById('subscription-form')?.scrollIntoView({ behavior: 'smooth' })}>Manage Subscription</button>
                    <button className='btn-secondary' type='button' onClick={() => showToast('Billing history is not available yet.')}>View Billing History</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className='settings-grid single-column'>
              <section className='settings-card'>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>SECURITY</span>
                    <h3>Change Password</h3>
                  </div>
                </div>
                <form className='premium-form' onSubmit={changePassword}>
                  <div className='form-grid premium-form-grid'>
                    <div className='form-group'>
                      <label>Current password</label>
                      <input type='password' required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
                    </div>
                    <div className='form-group'>
                      <label>New password</label>
                      <input type='password' required minLength={8} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                    </div>
                    <div className='form-group'>
                      <label>Confirm new password</label>
                      <input type='password' required minLength={8} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                    </div>
                  </div>
                  <div className='settings-actions'>
                    <button className='btn-primary' type='submit' disabled={saving}>{saving ? 'Updating...' : 'Change Password'}</button>
                  </div>
                </form>
              </section>

              <section className='settings-card'>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>PERMISSIONS</span>
                    <h3>Role Permissions</h3>
                  </div>
                </div>
                {['admin', 'teacher'].map((role) => (
                  <div className='permission-role' key={role}>
                    <div>
                      <strong>{role === 'admin' ? 'Administrator' : 'Teacher'}</strong>
                      <small>Allow this role to access:</small>
                    </div>
                    <div className='permission-options'>
                      {permissionOptions.map(([key, title]) => (
                        <label key={key}>
                          <input type='checkbox' checked={settings.permissions[role]?.includes(key) || false} onChange={() => togglePermission(role, key)} />
                          {title}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <p className='settings-note'>Permissions are saved by role and applied to staff access.</p>
                <div className='settings-actions'>
                  <button className='btn-primary' type='button' onClick={savePermissions} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className='settings-grid single-column'>
              <section className='settings-card subscription-summary-card'>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>CURRENT PLAN</span>
                    <h3>Subscription Plan</h3>
                  </div>
                  <span className={`status-badge ${expired ? 'overdue' : 'paid'}`}>{expired ? 'Expired' : 'Active'}</span>
                </div>
                <div className='plan-summary-title'>
                  <strong>{subscription.plan?.charAt(0).toUpperCase() + subscription.plan?.slice(1)}</strong>
                  <span>TuitionPro</span>
                </div>
                <div className='plan-limit-row'><span>Students</span><strong>{subscription.limits.students}</strong></div>
                <div className='plan-limit-row'><span>Batches</span><strong>{subscription.limits.batches}</strong></div>
                <div className='plan-limit-row'><span>Teachers</span><strong>{subscription.limits.teachers}</strong></div>
                <div className='plan-expiry'>{subscription.expiresAt ? `Expires ${new Date(`${subscription.expiresAt}T00:00:00`).toLocaleDateString()}` : 'No expiry date set'}</div>
                <div className='settings-actions'>
                  <button className='btn-primary' type='button' onClick={() => document.getElementById('subscription-form')?.scrollIntoView({ behavior: 'smooth' })}>Manage Subscription</button>
                </div>
              </section>

              <form id='subscription-form' className='settings-card' onSubmit={saveSubscription}>
                <div className='modal-header'>
                  <div>
                    <span className='eyebrow'>MANAGE SUBSCRIPTION</span>
                    <h3>Subscription Settings</h3>
                  </div>
                </div>
                <div className='form-grid premium-form-grid'>
                  <div className='form-group'>
                    <label>Plan</label>
                    <select value={subscription.plan} onChange={(e) => setSettings({ ...settings, subscription: { ...subscription, plan: e.target.value } })}>
                      <option value='free'>Free</option>
                      <option value='starter'>Starter</option>
                      <option value='growth'>Growth</option>
                      <option value='pro'>Pro</option>
                    </select>
                  </div>
                  <div className='form-group'>
                    <label>Expiry date</label>
                    <input type='date' value={subscription.expiresAt || ''} onChange={(e) => setSettings({ ...settings, subscription: { ...subscription, expiresAt: e.target.value } })} />
                    <small>Leave empty for no expiry date.</small>
                  </div>
                </div>
                <h4 className='settings-subheading'>Plan limits</h4>
                <div className='form-grid premium-form-grid'>
                  <div className='form-group'>
                    <label>Maximum students</label>
                    <input type='number' min='0' max='100000' step='1' value={subscription.limits.students} onChange={(e) => setSettings({ ...settings, subscription: { ...subscription, limits: { ...subscription.limits, students: e.target.value } } })} />
                  </div>
                  <div className='form-group'>
                    <label>Maximum batches</label>
                    <input type='number' min='0' max='100000' step='1' value={subscription.limits.batches} onChange={(e) => setSettings({ ...settings, subscription: { ...subscription, limits: { ...subscription.limits, batches: e.target.value } } })} />
                  </div>
                  <div className='form-group'>
                    <label>Maximum teachers</label>
                    <input type='number' min='0' max='100000' step='1' value={subscription.limits.teachers} onChange={(e) => setSettings({ ...settings, subscription: { ...subscription, limits: { ...subscription.limits, teachers: e.target.value } } })} />
                  </div>
                </div>
                <p className='settings-note'>Student and batch limits are enforced when creating records. Teacher limits are stored for future staff accounts.</p>
                <div className='settings-actions'>
                  <button className='btn-primary' type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save Subscription'}</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
      <section className='support-banner'>
        <div>
          <h3>Need help with your academy?</h3>
          <p>Our support team can help with billing, setup, and account questions.</p>
        </div>
        <button className='btn-secondary' type='button' onClick={() => (window.location.href = 'mailto:support@tuitionpro.local?subject=TuitionPro%20Support')}>Contact Support</button>
      </section>
    </div>
  );
}

