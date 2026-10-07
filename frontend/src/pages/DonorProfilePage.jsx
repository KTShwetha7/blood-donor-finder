import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Droplet, MapPin, Pencil, Phone, Save, UserRound, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY_DRAFT = {
  full_name: '',
  phone: '',
  blood_group: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  is_available: true,
  additional_notes: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

function getDonorProfileError(error) {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 404) return 'You are not registered as a donor.';
  if (error.status === 422) return 'Please correct the donor profile details and try again.';
  if (error.status >= 500) return 'We could not load your donor profile right now. Please try again later.';
  return 'Unable to load your donor profile. Please try again.';
}

export default function DonorProfilePage() {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isCurrentUserDonor = Boolean(user?.is_donor);

  const hasProfile = useMemo(() => Boolean(profile), [profile]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    apiRequest('/api/donors/me')
      .then((data) => {
        if (!isCurrent) return;
        setProfile(data);
        setDraft({
          full_name: data.full_name || '',
          phone: data.phone || '',
          blood_group: data.blood_group || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          is_available: Boolean(data.is_available),
          additional_notes: data.additional_notes || '',
        });
      })
      .catch((error) => {
        if (!isCurrent) return;
        if (error.status === 404) {
          setProfile(null);
          setDraft(EMPTY_DRAFT);
          return;
        }
        setErrorMessage(getDonorProfileError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const resetToOriginal = () => {
    if (!profile) return;
    setDraft({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      blood_group: profile.blood_group || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      pincode: profile.pincode || '',
      is_available: Boolean(profile.is_available),
      additional_notes: profile.additional_notes || '',
    });
  };

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDraft((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (isSaving || !profile) return;

    const trimmedFullName = draft.full_name.trim();
    const trimmedPhone = draft.phone.trim();
    const trimmedAddress = draft.address.trim();
    const trimmedCity = draft.city.trim();
    const trimmedState = draft.state.trim();
    const trimmedPincode = draft.pincode.trim();
    const trimmedNotes = draft.additional_notes.trim();

    if (!trimmedFullName || trimmedFullName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }
    if (trimmedPhone && !/^[6-9][0-9]{9}$/.test(trimmedPhone)) {
      setErrorMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!draft.blood_group) {
      setErrorMessage('Please select a blood group.');
      return;
    }
    if (!trimmedAddress || trimmedAddress.length < 10) {
      setErrorMessage('Please enter a complete address.');
      return;
    }
    if (!trimmedCity || trimmedCity.length < 2) {
      setErrorMessage('City is required.');
      return;
    }
    if (!trimmedState || trimmedState.length < 2) {
      setErrorMessage('State is required.');
      return;
    }
    if (trimmedPincode && !/^[1-9][0-9]{5}$/.test(trimmedPincode)) {
      setErrorMessage('Enter a valid 6-digit Indian PIN code.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updated = await apiRequest('/api/donors/me', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: trimmedFullName,
          phone: trimmedPhone || null,
          blood_group: draft.blood_group,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedState,
          pincode: trimmedPincode || null,
          is_available: draft.is_available,
          additional_notes: trimmedNotes || null,
        }),
      });

      setProfile(updated);
      setDraft({
        full_name: updated.full_name || '',
        phone: updated.phone || '',
        blood_group: updated.blood_group || '',
        address: updated.address || '',
        city: updated.city || '',
        state: updated.state || '',
        pincode: updated.pincode || '',
        is_available: Boolean(updated.is_available),
        additional_notes: updated.additional_notes || '',
      });
      setIsEditing(false);
      setSuccessMessage('Your donor profile has been saved.');
    } catch (error) {
      const detail = error.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => item.msg || item.detail || 'Please check the highlighted fields.')
          .join(' ');
        setErrorMessage(messages || 'Please correct the highlighted donor profile fields.');
      } else {
        setErrorMessage(typeof detail === 'string' ? detail : getDonorProfileError(error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <section className="container donor-profile-page">
        <div className="glass-card donor-profile-card">
          <p className="dashboard-message" role="status">Loading your donor profile...</p>
        </div>
      </section>
    );
  }

  if (!hasProfile && !isCurrentUserDonor) {
    return (
      <section className="container donor-profile-page">
        <div className="glass-card donor-profile-card donor-profile-empty">
          <div className="empty-state-icon"><Droplet size={28} /></div>
          <h1>You are not registered as a donor.</h1>
          <p>Register as a donor to start receiving compatible blood request matches.</p>
          <Link to="/register" className="btn btn-primary">
            Register as Donor
          </Link>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="container donor-profile-page">
        <div className="glass-card donor-profile-card">
          <p role="alert" className="form-error-msg"><AlertCircle size={14} /> You are not registered as a donor.</p>
          <Link to="/register" className="btn btn-primary">Register as Donor</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container donor-profile-page">
      <header className="donor-profile-header">
        <span className="badge badge-danger"><Droplet size={13} /> Donor Profile</span>
        <h1>My Donor Profile</h1>
        <p className="form-subtitle">View and manage the donor details associated with your account.</p>
      </header>

      <div className="glass-card donor-profile-card">
        {errorMessage && (
          <p className="form-error-msg" role="alert">
            <AlertCircle size={14} /> {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="profile-success" role="status">
            <CheckCircle2 size={17} /> {successMessage}
          </p>
        )}

        {isEditing ? (
          <form className="donor-profile-form" onSubmit={handleSave}>
            <div className="donor-profile-grid">
              <div className="form-group">
                <label htmlFor="donorFullName" className="form-label">Full Name</label>
                <input id="donorFullName" name="full_name" className="form-input" value={draft.full_name} onChange={handleFieldChange} disabled={isSaving} />
              </div>

              <div className="form-group">
                <label htmlFor="donorPhone" className="form-label">Phone</label>
                <input id="donorPhone" name="phone" className="form-input" value={draft.phone} onChange={handleFieldChange} disabled={isSaving} />
              </div>

              <div className="form-group">
                <label htmlFor="donorBloodGroup" className="form-label">Blood Group</label>
                <select id="donorBloodGroup" name="blood_group" className="form-select" value={draft.blood_group} onChange={handleFieldChange} disabled={isSaving}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="donorAvailability" className="form-label">Availability</label>
                <label className="checkbox-row">
                  <input id="donorAvailability" name="is_available" type="checkbox" checked={draft.is_available} onChange={handleFieldChange} disabled={isSaving} />
                  Available to donate
                </label>
              </div>

              <div className="form-group donor-profile-wide">
                <label htmlFor="donorAddress" className="form-label">Address</label>
                <textarea id="donorAddress" name="address" className="form-input form-textarea" value={draft.address} onChange={handleFieldChange} disabled={isSaving} rows={3} />
              </div>

              <div className="form-group">
                <label htmlFor="donorCity" className="form-label">City</label>
                <input id="donorCity" name="city" className="form-input" value={draft.city} onChange={handleFieldChange} disabled={isSaving} />
              </div>

              <div className="form-group">
                <label htmlFor="donorState" className="form-label">State</label>
                <input id="donorState" name="state" className="form-input" value={draft.state} onChange={handleFieldChange} disabled={isSaving} />
              </div>

              <div className="form-group">
                <label htmlFor="donorPincode" className="form-label">PIN Code</label>
                <input id="donorPincode" name="pincode" className="form-input" value={draft.pincode} onChange={handleFieldChange} disabled={isSaving} maxLength={6} />
              </div>

              <div className="form-group donor-profile-wide">
                <label htmlFor="donorNotes" className="form-label">Additional Notes</label>
                <textarea id="donorNotes" name="additional_notes" className="form-input form-textarea" value={draft.additional_notes} onChange={handleFieldChange} disabled={isSaving} rows={3} />
              </div>
            </div>

            <div className="profile-actions">
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { resetToOriginal(); setIsEditing(false); setErrorMessage(''); setSuccessMessage(''); }} disabled={isSaving}>
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="donor-profile-grid donor-profile-readonly">
              <div className="donor-profile-item">
                <span className="form-label">Full Name</span>
                <p>{profile.full_name}</p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">Phone</span>
                <p>{profile.phone || 'Not provided'}</p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">Blood Group</span>
                <p><span className="blood-pill">{profile.blood_group}</span></p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">Availability</span>
                <p className={`status-pill ${profile.is_available ? 'available' : 'unavailable'}`}>
                  {profile.is_available ? 'Available' : 'Unavailable'}
                </p>
              </div>
              <div className="donor-profile-item donor-profile-wide">
                <span className="form-label">Address</span>
                <p>{profile.address}</p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">City</span>
                <p>{profile.city}</p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">State</span>
                <p>{profile.state}</p>
              </div>
              <div className="donor-profile-item">
                <span className="form-label">PIN Code</span>
                <p>{profile.pincode || 'Not provided'}</p>
              </div>
              <div className="donor-profile-item donor-profile-wide">
                <span className="form-label">Additional Notes</span>
                <p>{profile.additional_notes || 'No additional notes.'}</p>
              </div>
            </div>

            <div className="profile-actions">
              <button type="button" className="btn btn-primary" onClick={() => { resetToOriginal(); setErrorMessage(''); setSuccessMessage(''); setIsEditing(true); }}>
                <Pencil size={16} /> Edit
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
