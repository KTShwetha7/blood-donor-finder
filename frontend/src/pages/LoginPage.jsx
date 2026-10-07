import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, LogIn, Mail } from 'lucide-react';
import { API_BASE_URL, apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      login(result.access_token, result.user);
      navigate('/', { replace: true });
    } catch (error) {
      const detail = error.data?.detail;
      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else if (!error.status) {
        setSubmitError(`Cannot reach the backend at ${API_BASE_URL}. Make sure the FastAPI server is running.`);
      } else {
        setSubmitError('Unable to log in. Check your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container login-container">
      <section className="glass-card form-card login-card">
        <div className="form-header">
          <span className="badge badge-danger">Welcome Back</span>
          <h1 className="form-title">Log In</h1>
          <p className="form-subtitle">Access your Blood Donor Finder account.</p>
        </div>

        {submitError && (
          <div className="form-error-msg login-submit-error" role="alert">
            <AlertCircle size={14} /> {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="donor-register-form">
          <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="loginEmail" className="form-label">Email Address</label>
            <div className="input-wrap">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                id="loginEmail"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmail((value) => value.trim())}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={255}
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                aria-invalid={!!errors.email}
                required
              />
            </div>
            {errors.email && <div className="form-error-msg" role="alert"><AlertCircle size={14} /> {errors.email}</div>}
          </div>

          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="loginPassword" className="form-label">Password</label>
            <div className="input-wrap">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                id="loginPassword"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                aria-invalid={!!errors.password}
                required
              />
            </div>
            {errors.password && <div className="form-error-msg" role="alert"><AlertCircle size={14} /> {errors.password}</div>}
          </div>

          <div className="login-forgot-password">
            <Link to="/forgot-password" className="link-login">Forgot Password?</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-register" disabled={isSubmitting}>
            <LogIn size={17} /> {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>

          <div className="form-footer-redirect">
            <span>New to Blood Donor Finder?</span>
            <Link to="/register" className="link-login">Create an account</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
