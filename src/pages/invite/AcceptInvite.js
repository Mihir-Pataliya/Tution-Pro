import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teacherInviteAPI } from '../../api/teacherInvites';
import { studentInviteAPI } from '../../api/studentInvites';
import useToast from '../../hooks/useToast';
import '../auth/Login.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [invite, setInvite] = useState(null);
  const [inviteType, setInviteType] = useState('teacher');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let res;
        try {
          res = await teacherInviteAPI.getPublic(token);
          setInviteType('teacher');
        } catch (e) {
          res = await studentInviteAPI.getPublic(token);
          setInviteType('student');
        }
        if (!active) return;
        setInvite(res.data?.data || null);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'This invitation link is invalid or has expired.');
      } finally {
        if (active) setLoading(false);
      }
    };
    if (token) load();
    return () => { active = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { showToast('Choose a password of at least 8 characters.'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const res = inviteType === 'teacher' ? await teacherInviteAPI.acceptPublic(token, { password, phone: phone.trim() }) : await studentInviteAPI.acceptPublic(token, { password, phone: phone.trim() });
      showToast(inviteType === 'student' ? 'Student login created. Redirecting...' : (res.data?.message || 'Teacher login created. Please sign in.'), 'success');
      setTimeout(() => navigate(inviteType === 'student' ? '/student' : '/login', { replace: true }), 900);
      setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not accept this invitation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={submit} className="login-form">
        <h2 style={{ marginTop: 0, color: '#fff' }}>Teacher invitation</h2>
        {loading && <p style={{ color: 'rgba(255,255,255,.85)' }}>Checking your invitation…</p>}
        {!loading && error && (
          <>
            <p style={{ color: '#ffd7d7' }}>{error}</p>
            <div className="auth-links"><p style={{ margin: 0 }}><Link to="/login" style={{ color: '#fff', fontWeight: 600 }}>Go to sign in</Link></p></div>
          </>
        )}
        {!loading && !error && invite && (
          <>
            <p style={{ color: 'rgba(255,255,255,.9)', marginTop: 0 }}>
              <strong>{invite.academy}</strong> invited <strong>{invite.name}</strong> ({invite.email}) to join
              {invite.subject ? ` for ${invite.subject}` : ' as Teacher'}.
            </p>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: '.85rem' }}>
              Link expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : 'soon'}.
              {invite.batches?.length ? ` Batches: ${invite.batches.map((b) => b.name).join(', ')}.` : ''}
            </p>
            <div className="form-group">
              <label>Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
            </div>
            <div className="form-group">
              <label>Create password (min 8 characters)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Create a strong password" />
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating login…' : 'Accept & create login'}</button>
            <div className="auth-links"><p style={{ margin: 0, fontSize: '.9rem', color: 'rgba(255,255,255,.8)' }}>Already have an account? <Link to="/login" style={{ color: '#fff', fontWeight: 600 }}>Sign in</Link></p></div>
          </>
        )}
      </form>
      <ToastComponent />
    </div>
  );
}
