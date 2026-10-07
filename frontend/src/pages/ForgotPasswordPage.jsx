import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setDevelopmentResetUrl('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setMessage(result.message);
      setDevelopmentResetUrl(result.development_reset_url || '');
    } catch (requestError) {
      const detail = requestError.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not process the reset request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container login-container">
      <section className="glass-card form-card login-card">
        <header className="form-header">
          <span className="badge badge-danger">Account Recovery</span>
          <h1 className="form-title">Forgot Password?</h1>
          <p className="form-subtitle">Enter your account email to request a password reset.</p>
        </header>

        {error && <div className="form-error-msg login-submit-error" role="alert"><AlertCircle size={14} /> {error}</div>}
        {message && (
          <div className="status-alert success" role="status">
            <CheckCircle2 size={18} />
            <div>
              <p>{message}</p>
              {developmentResetUrl && (
                <p>
                  DEVELOPMENT ONLY: Email delivery is not configured.{' '}
                  <a className="link-login" href={developmentResetUrl}>Open development reset link</a>
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="donor-register-form">
          <div className="form-group">
            <label htmlFor="forgotEmail" className="form-label">Email Address</label>
            <div className="input-wrap">
              <Mail className="input-icon" size={18} />
              <input
                id="forgotEmail"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={255}
                placeholder="you@example.com"
                className="form-input"
                aria-invalid={!!error}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-register" disabled={isSubmitting}>
            <Send size={16} /> {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
          <div className="form-footer-redirect">
            <Link to="/login" className="link-login">Back to Login</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
