import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EDITABLE_FIELDS = [
  ['blood_group', 'Blood Group', 'select'],
  ['units_required', 'Units Required', 'number'],
  ['hospital_name', 'Hospital Name', 'text'],
  ['hospital_address', 'Hospital Address', 'text'],
  ['city', 'City', 'text'],
  ['state', 'State', 'text'],
  ['pincode', 'PIN Code', 'text'],
  ['required_date', 'Required Date', 'date'],
  ['urgency', 'Urgency', 'urgency'],
  ['additional_notes', 'Additional Notes', 'textarea'],
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB');
}

function getFormValues(request) {
  return {
    blood_group: request.blood_group,
    units_required: String(request.units_required),
    hospital_name: request.hospital_name,
    hospital_address: request.hospital_address,
    city: request.city,
    state: request.state,
    pincode: request.pincode,
    required_date: request.required_date,
    urgency: request.urgency,
    additional_notes: request.additional_notes || '',
  };
}

function getErrorMessage(error, action) {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 404) return 'Blood request not found.';
  if (error.status === 409) return error.message;
  if (error.status >= 500) return `We could not ${action} this blood request right now. Please try again later.`;
  return `Unable to ${action} this blood request. Please try again.`;
}

function normalizeRequestBody(form) {
  return {
    ...form,
    units_required: Number(form.units_required),
    hospital_name: form.hospital_name.trim(),
    hospital_address: form.hospital_address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    additional_notes: form.additional_notes.trim() || null,
  };
}

export default function BloodRequestDetailsPage() {
  const { requestId } = useParams();
  const { isAuthenticated } = useAuth();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [matches, setMatches] = useState(null);
  const [matchesRequestId, setMatchesRequestId] = useState(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}`)
      .then((data) => {
        if (isCurrent) {
          setRequest(data);
          setForm(getFormValues(data));
        }
      })
      .catch((error) => {
        if (!isCurrent) return;
        if (error.status === 401) {
          setLoadError('Your session has expired. Please log in again to view this request.');
        } else if (error.status === 404) {
          setLoadError('Blood request not found.');
        } else if (error.status >= 500) {
          setLoadError('We could not load this blood request right now. Please try again later.');
        } else {
          setLoadError('Unable to load this blood request. Please try again.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, requestId]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setActionError('');
  };

  const saveChanges = async (event) => {
    event.preventDefault();
    const errors = {};
    EDITABLE_FIELDS.forEach(([field, label]) => {
      if (field !== 'additional_notes' && !String(form[field]).trim()) {
        errors[field] = `${label} is required.`;
      }
    });
    if (!Number.isInteger(Number(form.units_required)) || Number(form.units_required) <= 0) {
      errors.units_required = 'Units must be a positive whole number.';
    }
    if (form.pincode.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit Indian PIN code.';
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setActionError('Please review the request details and correct any highlighted fields.');
      return;
    }

    setIsSaving(true);
    setActionError('');
    setSuccessMessage('');
    try {
      const updated = await apiRequest(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: 'PUT',
        body: JSON.stringify(normalizeRequestBody(form)),
      });
      setRequest(updated);
      setForm(getFormValues(updated));
      setIsEditing(false);
      setSuccessMessage('Blood request updated successfully.');
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.data?.detail)) {
        const errorsFromApi = {};
        error.data.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          if (EDITABLE_FIELDS.some(([name]) => name === field)) errorsFromApi[field] = issue.msg;
        });
        setFieldErrors(errorsFromApi);
        setActionError('Please review the request details and correct any highlighted fields.');
      } else {
        setActionError(getErrorMessage(error, 'update'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const changeRequestStatus = async (status) => {
    const confirmation = status === 'FULFILLED'
      ? 'Are you sure you want to mark this blood request as fulfilled?'
      : 'Are you sure you want to cancel this blood request?';
    if (!window.confirm(confirmation)) return;

    setIsUpdatingStatus(true);
    setActionError('');
    setSuccessMessage('');
    try {
      const updated = await apiRequest(`/api/requests/${encodeURIComponent(requestId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setRequest(updated);
      setSuccessMessage(
        status === 'FULFILLED'
          ? 'Blood request marked as fulfilled.'
          : 'Blood request cancelled successfully.',
      );
      setMatches(null);
      setMatchesRequestId(null);
    } catch (error) {
      setActionError(getErrorMessage(error, status === 'FULFILLED' ? 'update' : 'cancel'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const findMatchingDonors = async () => {
    setMatchesRequestId(requestId);
    setIsLoadingMatches(true);
    setMatchesError('');
    try {
      const results = await apiRequest(`/api/requests/${encodeURIComponent(requestId)}/matches`);
      if (!Array.isArray(results)) throw new Error('Unexpected donor match response.');
      setMatches(results);
    } catch (error) {
      if (error.status === 401) {
        setMatchesError('Your session has expired. Please log in again to find matching donors.');
      } else if (error.status === 404) {
        setMatchesError('Blood request not found.');
      } else if (error.status >= 500) {
        setMatchesError('We could not find matching donors right now. Please try again later.');
      } else {
        setMatchesError('Unable to find matching donors. Please try again.');
      }
      setMatches(null);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  return (
    <section className="container blood-request-details-page">
      <Link to="/requests" className="btn btn-secondary blood-request-back">
        <ArrowLeft size={16} /> Back to My Blood Requests
      </Link>

      {isLoading && <p className="blood-requests-message" role="status">Loading blood request...</p>}

      {!isLoading && loadError && (
        <div className="glass-card blood-requests-message" role="alert">
          <p>{loadError}</p>
          {loadError.startsWith('Your session') && (
            <Link to="/login" className="btn btn-secondary">Log in</Link>
          )}
        </div>
      )}

      {!isLoading && !loadError && request && (
        <article className="glass-card blood-request-details-card">
          <div className="blood-request-list-top">
            <div>
              <span className="badge badge-danger">Blood Request</span>
              <h1>Blood Request #{request.id}</h1>
            </div>
            <span className={`blood-request-status status-${String(request.status).toLowerCase()}`}>
              {request.status}
            </span>
          </div>
          {successMessage && <p className="blood-request-action-success" role="status">{successMessage}</p>}
          {actionError && <p className="form-error-msg blood-request-submit-error" role="alert">{actionError}</p>}

          {!isEditing && request.status === 'PENDING' && (
            <section className="blood-request-matches" aria-labelledby="matching-donors-heading">
              <div className="blood-request-matches-heading">
                <h2 id="matching-donors-heading">Matching Donors</h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={findMatchingDonors}
                  disabled={isLoadingMatches}
                >
                  {isLoadingMatches ? 'Finding Donors...' : 'Find Matching Donors'}
                </button>
              </div>
              {isLoadingMatches && <p role="status">Searching for compatible available donors...</p>}
              {matchesRequestId === requestId && matchesError && <p className="form-error-msg" role="alert">{matchesError}</p>}
              {!isLoadingMatches && matchesRequestId === requestId && !matchesError && matches && matches.length === 0 && (
                <div className="blood-request-matches-empty" role="status">
                  No compatible available donors were found for this request.
                </div>
              )}
              {!isLoadingMatches && matchesRequestId === requestId && !matchesError && matches?.length > 0 && (
                <div className="blood-request-matches-list">
                  {matches.map((donor) => (
                    <article
                      className={`glass-card blood-request-match-card ${donor.same_city ? 'same-city-match' : 'other-location-match'}`}
                      key={donor.id}
                    >
                      <div className="blood-request-list-top">
                        <h3>{donor.full_name}</h3>
                        <span className={`blood-request-match-location ${donor.same_city ? 'same-city' : ''}`}>
                          {donor.same_city ? 'Same City' : 'Other Location'}
                        </span>
                      </div>
                      <dl className="blood-request-match-grid">
                        <div><dt>Blood Group</dt><dd>{donor.blood_group}</dd></div>
                        <div><dt>Phone</dt><dd>{donor.phone || 'Not provided'}</dd></div>
                        <div><dt>Email</dt><dd>{donor.email}</dd></div>
                        <div><dt>City</dt><dd>{donor.city}</dd></div>
                        <div><dt>State</dt><dd>{donor.state}</dd></div>
                        <div><dt>PIN Code</dt><dd>{donor.pincode || 'Not provided'}</dd></div>
                        <div><dt>Availability</dt><dd>{donor.is_available ? 'Available' : 'Unavailable'}</dd></div>
                        <div><dt>Last Donation</dt><dd>{donor.last_donation_date ? formatDate(donor.last_donation_date) : 'Not provided'}</dd></div>
                        {donor.additional_notes && (
                          <div className="blood-request-match-notes"><dt>Additional Notes</dt><dd>{donor.additional_notes}</dd></div>
                        )}
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {isEditing ? (
            <form className="blood-request-edit-form" onSubmit={saveChanges} noValidate>
              <div className="blood-request-grid">
                {EDITABLE_FIELDS.map(([field, label, type]) => (
                  <div className={`form-group ${type === 'textarea' ? 'blood-request-notes-field' : ''}`} key={field}>
                    <label htmlFor={`edit-${field}`} className="form-label">{label}</label>
                    {type === 'select' || type === 'urgency' ? (
                      <select
                        id={`edit-${field}`}
                        name={field}
                        value={form[field]}
                        onChange={updateField}
                        className={`form-select blood-request-control ${fieldErrors[field] ? 'input-error' : ''}`}
                        aria-invalid={!!fieldErrors[field]}
                      >
                        <option value="">Select {label.toLowerCase()}</option>
                        {(type === 'select' ? BLOOD_GROUPS : URGENCY_LEVELS).map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    ) : type === 'textarea' ? (
                      <textarea
                        id={`edit-${field}`}
                        name={field}
                        value={form[field]}
                        onChange={updateField}
                        maxLength={2000}
                        className="form-input blood-request-control"
                      />
                    ) : (
                      <input
                        id={`edit-${field}`}
                        name={field}
                        type={type}
                        value={form[field]}
                        onChange={updateField}
                        min={type === 'number' ? 1 : undefined}
                        step={type === 'number' ? 1 : undefined}
                        maxLength={field === 'hospital_name' ? 200 : undefined}
                        className={`form-input blood-request-control ${fieldErrors[field] ? 'input-error' : ''}`}
                        aria-invalid={!!fieldErrors[field]}
                      />
                    )}
                    {fieldErrors[field] && <span className="form-error-msg">{fieldErrors[field]}</span>}
                  </div>
                ))}
              </div>
              <div className="blood-request-action-buttons">
                <button className="btn btn-primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setForm(getFormValues(request));
                    setFieldErrors({});
                    setActionError('');
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  Cancel Edit
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="blood-request-detail-grid">
                <div><dt>Blood Group</dt><dd>{request.blood_group}</dd></div>
                <div><dt>Units Required</dt><dd>{request.units_required}</dd></div>
                <div><dt>Hospital</dt><dd>{request.hospital_name}</dd></div>
                <div><dt>Hospital Address</dt><dd>{request.hospital_address}</dd></div>
                <div><dt>Location</dt><dd><MapPin size={16} aria-hidden="true" /> {request.city}, {request.state} {request.pincode}</dd></div>
                <div><dt>Required Date</dt><dd><CalendarDays size={16} aria-hidden="true" /> {formatDate(request.required_date)}</dd></div>
                <div><dt>Urgency</dt><dd>{request.urgency}</dd></div>
                <div><dt>Created</dt><dd>{new Date(request.created_at).toLocaleString()}</dd></div>
                <div><dt>Last Updated</dt><dd>{new Date(request.updated_at).toLocaleString()}</dd></div>
                <div className="blood-request-detail-notes">
                  <dt>Additional Notes</dt>
                  <dd>{request.additional_notes || 'None provided.'}</dd>
                </div>
              </dl>
              {request.status !== 'CANCELLED' && (
                <div className="blood-request-action-buttons">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setForm(getFormValues(request));
                      setSuccessMessage('');
                      setActionError('');
                      setIsEditing(true);
                    }}
                    disabled={isUpdatingStatus}
                  >
                    Edit Request
                  </button>
                  {request.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => changeRequestStatus('FULFILLED')}
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? 'Updating...' : 'Mark as Fulfilled'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => changeRequestStatus('CANCELLED')}
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? 'Updating...' : 'Cancel Request'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </article>
      )}
    </section>
  );
}
