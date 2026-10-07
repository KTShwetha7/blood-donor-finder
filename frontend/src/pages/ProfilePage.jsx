import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, Pencil, Phone, Save, UserRound, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

function getProfileError(error) {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 422) return 'Please enter a full name and a valid 10-digit Indian mobile number.';
  if (error.status >= 500) return 'We could not load your profile right now. Please try again later.';
  return 'Unable to load your profile. Please try again.';
}

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({ full_name: '', phone: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const saveInProgress = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;
    apiRequest('/api/profile')
      .then((data) => {
        if (!isCurrent) return;
        setProfile(data);
        setDraft({ full_name: data.full_name, phone: data.phone || '' });
      })
      .catch((error) => {
        if (isCurrent) setErrorMessage(getProfileError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, reloadKey]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isEditing || saveInProgress.current) return;

    saveInProgress.current = true;
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updatedProfile = await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: draft.full_name.trim(),
          phone: draft.phone.trim() || null,
        }),
      });
      setProfile(updatedProfile);
      setDraft({ full_name: updatedProfile.full_name, phone: updatedProfile.phone || '' });
      setIsEditing(false);
      setSuccessMessage('Your profile has been saved.');
    } catch (error) {
      setErrorMessage(getProfileError(error));
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft({ full_name: profile.full_name, phone: profile.phone || '' });
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <section className="container profile-page">
      <header className="dashboard-header">
        <span className="badge badge-danger"><UserRound size={13} /> Profile</span>
        <h1>Your Profile</h1>
        <p className="form-subtitle">View and update the contact information on your account.</p>
      </header>

      {isLoading && <p className="glass-card dashboard-message" role="status">Loading your profile...</p>}

      {!isLoading && errorMessage && !profile && (
        <div className="glass-card dashboard-message" role="alert">
          <p>{errorMessage}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsLoading(true);
              setErrorMessage('');
              setReloadKey((key) => key + 1);
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && profile && (
        <div className="glass-card profile-card">
          {errorMessage && <p className="form-error-msg" role="alert"><AlertCircle size={14} /> {errorMessage}</p>}
          {successMessage && (
            <p className="profile-success" role="status">
              <CheckCircle2 size={17} /> {successMessage}
            </p>
          )}

          {isEditing ? (
            <form className="profile-edit-form" onSubmit={handleSave}>
              <div className="profile-fields">
                <div className="form-group">
                  <label htmlFor="profileFullName" className="form-label">Full Name</label>
                  <div className="input-wrap">
                    <UserRound className="input-icon" size={18} aria-hidden="true" />
                    <input
                      id="profileFullName"
                      name="full_name"
                      type="text"
                      className="form-input"
                      value={draft.full_name}
                      onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))}
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="profileEmail" className="form-label">Email</label>
                  <div className="input-wrap">
                    <Mail className="input-icon" size={18} aria-hidden="true" />
                    <input
                      id="profileEmail"
                      name="email"
                      type="email"
                      className="form-input"
                      value={profile.email}
                      autoComplete="email"
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <span className="field-hint">Email cannot be changed here.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="profilePhone" className="form-label">Phone</label>
                  <div className="input-wrap">
                    <Phone className="input-icon" size={18} aria-hidden="true" />
                    <input
                      id="profilePhone"
                      name="phone"
                      type="tel"
                      className="form-input"
                      value={draft.phone}
                      onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                      autoComplete="tel"
                      maxLength={20}
                      pattern="[6-9][0-9]{9}"
                      title="Enter a valid 10-digit Indian mobile number"
                      disabled={isSaving}
                    />
                  </div>
                  <span className="field-hint">Enter a 10-digit Indian mobile number, or leave blank.</span>
                </div>
              </div>

              <div className="profile-actions">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={isSaving}>
                  <X size={16} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-fields">
                <div>
                  <span className="form-label">Full Name</span>
                  <p>{profile.full_name}</p>
                </div>
                <div>
                  <span className="form-label">Email</span>
                  <p>{profile.email}</p>
                  <span className="field-hint">Email cannot be changed here.</span>
                </div>
                <div>
                  <span className="form-label">Phone</span>
                  <p>{profile.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="profile-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setDraft({ full_name: profile.full_name, phone: profile.phone || '' });
                    setErrorMessage('');
                    setSuccessMessage('');
                    setIsEditing(true);
                  }}
                >
                  <Pencil size={16} /> Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
