import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useToast from '../../hooks/useToast';
import './Login.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast, ToastComponent } = useToast();

  // Animate form elements on mount
  React.useEffect(() => {
    setShowForm(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authenticatedUser = await login({ email, password });
      if (!authenticatedUser) throw new Error('Login did not return a user account');
      showToast('Login successful!', 'success');
      navigate(authenticatedUser.role === 'teacher' ? '/teacher' : authenticatedUser.role === 'student' ? '/student' : '/owner', { replace: true });
    } catch (error) {
      showToast(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-page'>
      <form onSubmit={handleSubmit} className='login-form' style={{ 
        opacity: showForm ? 1 : 0, 
        transform: showForm ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease 0.4s'
      }}>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 0.6s'
        }}>
          <label>Email Address</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 0.8s'
        }}>
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            {/* Eye icon for password toggle */}
            <button 
              type='button'
              onClick={(e) => {
                e.preventDefault();
                // This would toggle password visibility in a real implementation
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '1rem'
              }}
            >
              👁️
            </button>
          </div>
        </div>
        <button type='submit' disabled={loading} className='btn-primary' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 1s'
        }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
        <div className='auth-links' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 1.2s'
        }}>
          <p style={{ 
            margin: '0', 
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Don&apos;t have an account? <a href="/register" style={{ 
              color: '#fff', 
              textDecoration: 'none',
              fontWeight: '600',
              position: 'relative'
            }}>
              Register here
            </a>
          </p>
        </div>
      </form>
      <ToastComponent />
    </div>
  );
};

export default LoginPage;

