import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Droplet } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const INITIAL_FORM = {
  blood_group: '',
  units_required: '',
  hospital_name: '',
  hospital_address: '',
  city: '',
  state: '',
  pincode: '',
  required_date: '',
  urgency: '',
  additional_notes: '',
};

const REQUIRED_FIELDS = {
  blood_group: 'Select a blood group.',
  units_required: 'Enter a positive whole number of units.',
  hospital_name: 'Hospital name is required.',
  hospital_address: 'Hospital address is required.',
  city: 'City is required.',
  state: 'State is required.',
  pincode: 'Enter a valid 6-digit Indian PIN code.',
  required_date: 'Required date is required.',
  urgency: 'Select an urgency level.',
};

function validateForm(form) {
  const errors = {};
  Object.entries(REQUIRED_FIELDS).forEach(([field, message]) => {
    if (!String(form[field]).trim()) errors[field] = message;
  });

  const units = Number(form.units_required);
  if (form.units_required && (!Number.isInteger(units) || units <= 0)) {
    errors.units_required = 'Units must be a positive whole number.';
  }
  if (form.pincode.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit Indian PIN code.';
  }
  return errors;
}

export default function BloodRequestPage() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [createdRequest, setCreatedRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setSubmitError('');
    setCreatedRequest(null);
    if (Object.keys(validationErrors).length) return;

    setIsSubmitting(true);
    try {
      const request = await apiRequest('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          units_required: Number(form.units_required),
          pincode: form.pincode.trim(),
          hospital_name: form.hospital_name.trim(),
          hospital_address: form.hospital_address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          additional_notes: form.additional_notes.trim() || null,
        }),
      });
      setCreatedRequest(request);
    } catch (error) {
      if (error.status === 401) {
        setSubmitError('Your session has expired. Please log in again to create a blood request.');
      } else if (error.status === 422) {
        const validationDetails = error.data?.detail;
        if (Array.isArray(validationDetails)) {
          const fieldErrors = {};
          validationDetails.forEach((issue) => {
            const field = issue.loc?.[issue.loc.length - 1];
            if (field && REQUIRED_FIELDS[field]) fieldErrors[field] = REQUIRED_FIELDS[field];
          });
          setErrors(fieldErrors);
        }
        setSubmitError('Please review the request details and correct any highlighted fields.');
      } else if (error.status >= 500) {
        setSubmitError('We could not save your request right now. Please try again.');
      } else {
        setSubmitError('Unable to create the blood request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container blood-request-container">
      <section className="glass-card form-card blood-request-card">
        <header className="form-header">
          <span className="badge badge-danger"><Droplet size={13} /> Blood Request</span>
          <h1 className="form-title">Create a Blood Request</h1>
          <p className="form-subtitle">Share the details so the request can be followed up.</p>
        </header>

        {submitError && (
          <div className="form-error-msg blood-request-submit-error" role="alert">
            <AlertCircle size={15} /> {submitError}
            {submitError.startsWith('Your session has expired') && (
              <Link to="/login">Log in</Link>
            )}
          </div>
        )}

        {createdRequest && (
          <div className="blood-request-success" role="status" aria-live="polite">
            <div className="blood-request-success-title">
              <CheckCircle2 size={19} />
              <strong>Blood request created successfully.</strong>
            </div>
            <p>
              Request #{createdRequest.id}: {createdRequest.units_required} unit(s) of{' '}
              {createdRequest.blood_group} at {createdRequest.hospital_name}, {createdRequest.city}.
            </p>
            <p>Status: {createdRequest.status}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="donor-register-form">
          <div className="blood-request-grid">
            <div className="form-group">
              <label htmlFor="requestBloodGroup" className="form-label">Blood Group</label>
              <select id="requestBloodGroup" name="blood_group" value={form.blood_group} onChange={updateField} className={`form-select blood-request-control ${errors.blood_group ? 'input-error' : ''}`} required aria-invalid={!!errors.blood_group}>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
              {errors.blood_group && <span className="form-error-msg">{errors.blood_group}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestUnits" className="form-label">Units Required</label>
              <input id="requestUnits" name="units_required" value={form.units_required} onChange={updateField} className={`form-input blood-request-control ${errors.units_required ? 'input-error' : ''}`} type="number" min="1" step="1" required aria-invalid={!!errors.units_required} />
              {errors.units_required && <span className="form-error-msg">{errors.units_required}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestHospital" className="form-label">Hospital Name</label>
              <input id="requestHospital" name="hospital_name" value={form.hospital_name} onChange={updateField} className={`form-input blood-request-control ${errors.hospital_name ? 'input-error' : ''}`} type="text" maxLength={200} required aria-invalid={!!errors.hospital_name} />
              {errors.hospital_name && <span className="form-error-msg">{errors.hospital_name}</span>}
            </div>

            <div className="form-group blood-request-wide">
              <label htmlFor="requestHospitalAddress" className="form-label">Hospital Address</label>
              <textarea id="requestHospitalAddress" name="hospital_address" value={form.hospital_address} onChange={updateField} className={`form-input address-textarea blood-request-control ${errors.hospital_address ? 'input-error' : ''}`} maxLength={1000} required aria-invalid={!!errors.hospital_address} />
              {errors.hospital_address && <span className="form-error-msg">{errors.hospital_address}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestCity" className="form-label">City</label>
              <input id="requestCity" name="city" value={form.city} onChange={updateField} className={`form-input blood-request-control ${errors.city ? 'input-error' : ''}`} type="text" maxLength={100} required aria-invalid={!!errors.city} />
              {errors.city && <span className="form-error-msg">{errors.city}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestState" className="form-label">State</label>
              <input id="requestState" name="state" value={form.state} onChange={updateField} className={`form-input blood-request-control ${errors.state ? 'input-error' : ''}`} type="text" maxLength={100} required aria-invalid={!!errors.state} />
              {errors.state && <span className="form-error-msg">{errors.state}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestPincode" className="form-label">PIN Code</label>
              <input id="requestPincode" name="pincode" value={form.pincode} onChange={updateField} className={`form-input blood-request-control ${errors.pincode ? 'input-error' : ''}`} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={6} required aria-invalid={!!errors.pincode} />
              {errors.pincode && <span className="form-error-msg">{errors.pincode}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestDate" className="form-label">Required Date</label>
              <input id="requestDate" name="required_date" value={form.required_date} onChange={updateField} className={`form-input blood-request-control ${errors.required_date ? 'input-error' : ''}`} type="date" required aria-invalid={!!errors.required_date} />
              {errors.required_date && <span className="form-error-msg">{errors.required_date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="requestUrgency" className="form-label">Urgency</label>
              <select id="requestUrgency" name="urgency" value={form.urgency} onChange={updateField} className={`form-select blood-request-control ${errors.urgency ? 'input-error' : ''}`} required aria-invalid={!!errors.urgency}>
                <option value="">Select urgency</option>
                {URGENCY_LEVELS.map((urgency) => <option key={urgency} value={urgency}>{urgency}</option>)}
              </select>
              {errors.urgency && <span className="form-error-msg">{errors.urgency}</span>}
            </div>

            <div className="form-group blood-request-wide">
              <label htmlFor="requestNotes" className="form-label">Additional Notes <span className="optional-tag">(optional)</span></label>
              <textarea id="requestNotes" name="additional_notes" value={form.additional_notes} onChange={updateField} className="form-input address-textarea blood-request-control" maxLength={2000} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-register" disabled={isSubmitting}>
            {isSubmitting ? 'Creating request...' : 'Create Blood Request'}
          </button>
        </form>
      </section>
    </div>
  );
}
