import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LockKeyhole } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setError('This reset link is invalid or missing its token. Request a new link.');
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Enter and confirm your new password.');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 100) {
      setError('Password must be between 6 and 100 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const result = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      setSuccess(result.message);
    } catch (requestError) {
      const detail = requestError.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not reset the password. The link may be invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container login-container">
      <section className="glass-card form-card login-card">
        <header className="form-header">
          <span className="badge badge-danger">Account Recovery</span>
          <h1 className="form-title">Reset Password</h1>
          <p className="form-subtitle">Choose a new password for your account.</p>
        </header>

        {error && <div className="form-error-msg login-submit-error" role="alert"><AlertCircle size={14} /> {error}</div>}
        {success && (
          <div className="status-alert success" role="status">
            <CheckCircle2 size={18} />
            <div>
              <p>{success}</p>
              <Link to="/login" className="link-login">Continue to Login</Link>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} noValidate className="donor-register-form">
            <div className="form-group">
              <label htmlFor="resetNewPassword" className="form-label">New Password</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} />
                <input
                  id="resetNewPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  className="form-input"
                  aria-invalid={!!error}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="resetConfirmPassword" className="form-label">Confirm Password</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} />
                <input
                  id="resetConfirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={100}
                  className="form-input"
                  aria-invalid={!!error}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-register" disabled={isSubmitting}>
              <LockKeyhole size={16} /> {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="form-footer-redirect">
              <Link to="/login" className="link-login">Back to Login</Link>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
