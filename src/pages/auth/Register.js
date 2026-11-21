import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useToast from '../../hooks/useToast';
import './Register.css';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tuitionName, setTuitionName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ tuitionName, name, email, phone, password });
      showToast('Registration successful! Please login.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  };

  // Animate form elements on mount
  React.useEffect(() => {
    setShowForm(true);
  }, []);

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
          <label>Tuition Center Name</label>
          <input
            type='text'
            value={tuitionName}
            onChange={(e) => setTuitionName(e.target.value)}
            required
            placeholder="e.g., Bright Future Tutorials"
          />
        </div>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 0.8s'
        }}>
          <label>Your Full Name</label>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your full name"
          />
        </div>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 1.0s'
        }}>
          <label>Email Address</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 1.2s'
        }}>
          <label>Phone Number</label>
          <input
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className='form-group' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 1.4s'
        }}>
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type='password'
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                setPasswordStrength(calculatePasswordStrength(value));
              }}
              required
              minLength='6'
              placeholder="Create a strong password"
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
          <div className='password-strength'>
            <div 
              style={{ width: `${passwordStrength}%` }}
            ></div>
          </div>
          {passwordStrength > 0 && (
            <small style={{ 
              display: 'block', 
              marginTop: '0.5rem', 
              fontSize: '0.85rem',
              color: passwordStrength < 50 ? '#ff6b6b' : 
                     passwordStrength < 75 ? '#ff9a56' : '#4cc9f0'
            }}>
              {passwordStrength < 50 ? 'Weak' : 
               passwordStrength < 75 ? 'Medium' : 'Strong'}
            </small>
          )}
        </div>
        <button type='submit' disabled={loading} className='btn-primary' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 1.6s'
        }}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        <div className='auth-links' style={{ 
          opacity: showForm ? 1 : 0, 
          transform: showForm ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 1.8s'
        }}>
          <p style={{ 
            margin: '0', 
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Already have an account? <a href="/login" style={{ 
              color: '#fff', 
              textDecoration: 'none',
              fontWeight: '600',
              position: 'relative'
            }}>
              Sign in here
            </a>
          </p>
        </div>
      </form>
      <ToastComponent />
    </div>
  );
};

export default RegisterPage;