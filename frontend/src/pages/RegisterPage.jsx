/**
 * User Registration Page Component (SCRUM-27)
 * --------------------------------------------
 * A clean, modern, and accessible registration form for blood donors and seekers.
 * Captures user information, donor medical eligibility, location, and credentials.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Droplet,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Heart,
  Scale,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

// Format local date YYYY-MM-DD
const getTodayLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RegisterPage() {
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    bloodGroup: '',
    city: '',
    state: '',
    pincode: '',
    weightConfirmed: false,
    lastDonationDate: '',
  });

  // UI state for password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation error state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Submission state
  const [submittedData, setSubmittedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Blood group choices
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  // Validate single field or whole form
  const validateField = (name, value, allValues = formData) => {
    let error = '';

    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) {
          error = 'Full name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          error = 'Name must be 100 characters or fewer';
        }
        break;

      case 'email':
        if (!value || !value.trim()) {
          error = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'phone':
        if (!value || !value.trim()) {
          error = 'Contact number is required';
        } else if (!/^[6-9][0-9]{9}$/.test(value)) {
          error = 'Enter a valid 10-digit Indian mobile number';
        }
        break;

      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters long';
        } else if (value.length > 100) {
          error = 'Password must be 100 characters or fewer';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== allValues.password) {
          error = 'Passwords do not match';
        }
        break;

      case 'bloodGroup':
        if (!value) {
          error = 'Please select a blood group';
        }
        break;

      case 'address':
        if (!value || !value.trim()) {
          error = 'Full address is required';
        } else if (value.trim().length < 10) {
          error = 'Please enter your complete address';
        } else if (value.trim().length > 1000) {
          error = 'Address must be 1000 characters or fewer';
        }
        break;

      case 'city':
        if (!value || !value.trim()) {
          error = 'City/Location is required';
        } else if (value.trim().length < 2) {
          error = 'City name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          error = 'City must be 100 characters or fewer';
        }
        break;

      case 'state':
        if (!value || !value.trim()) {
          error = 'State is required';
        } else if (value.trim().length < 2) {
          error = 'State must be at least 2 characters';
        } else if (value.trim().length > 100) {
          error = 'State must be 100 characters or fewer';
        }
        break;

      case 'pincode':
        if (!value || !value.trim()) {
          error = 'PIN code is required';
        } else if (!/^[1-9][0-9]{5}$/.test(value)) {
          error = 'Enter a valid 6-digit Indian PIN code';
        }
        break;

      case 'weightConfirmed':
        if (!value) {
          error = 'You must confirm that your weight is 50 kg or above';
        }
        break;

      case 'lastDonationDate':
        if (value) {
          const todayString = getTodayLocalDateString();
          if (value > todayString) {
            error = 'Last donation date cannot be in the future';
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    const updatedFormData = {
      ...formData,
      [name]: fieldValue,
    };

    setFormData(updatedFormData);

    // If field was already touched, validate in real time
    if (touched[name]) {
      const fieldError = validateField(name, fieldValue, updatedFormData);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    }

    // Also re-validate confirmPassword if password changed
    if (name === 'password' && touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', formData.confirmPassword, updatedFormData);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmErr,
      }));
    }
  };

  // Handle Blur
  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setTouched((prev) => ({ ...prev, [name]: true }));

    const fieldError = validateField(name, fieldValue, formData);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate all fields
    const formErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key], formData);
      if (err) formErrors[key] = err;
    });

    setErrors(formErrors);

    // If there are validation errors, scroll to first error
    if (Object.keys(formErrors).length > 0) {
      const firstErrorField = document.querySelector('.input-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode,
          is_donor: true,
        }),
      });
      setSubmittedData(true);
    } catch (error) {
      const detail = error.data?.detail;
      if (Array.isArray(detail)) {
        const fieldNames = { full_name: 'fullName', confirm_password: 'confirmPassword' };
        const fieldErrors = {};
        const globalErrors = [];
        detail.forEach((item) => {
          const fieldName = fieldNames[item.loc?.[item.loc.length - 1]] || item.loc?.[item.loc.length - 1];
          const message = item.msg.replace(/^Value error,\s*/, '');
          if (Object.hasOwn(formData, fieldName)) {
            fieldErrors[fieldName] = message;
          } else {
            globalErrors.push(message);
          }
        });
        setErrors((previous) => ({ ...previous, ...fieldErrors }));
        setTouched((previous) => ({
          ...previous,
          ...Object.fromEntries(Object.keys(fieldErrors).map((fieldName) => [fieldName, true])),
        }));
        setSubmitError(globalErrors.join(' ') || 'Please correct the highlighted fields.');
      } else {
        setSubmitError(typeof detail === 'string' ? detail : 'Registration could not be completed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      address: '',
      bloodGroup: '',
      city: '',
      state: '',
      pincode: '',
      weightConfirmed: false,
      lastDonationDate: '',
    });
    setErrors({});
    setTouched({});
    setSubmittedData(null);
    setSubmitError('');
  };

  const maxDate = getTodayLocalDateString();

  return (
    <div className="register-page-wrapper">
      <div className="container register-container">
        
        {/* Left Side: Donor Guidelines & Information Banner */}
        <div className="register-info-panel">
          <div className="glass-card info-card">
            <div className="info-icon-badge">
              <Droplet size={28} fill="#e63946" stroke="#e63946" />
            </div>

            <h2 className="info-title">Become a Life Saver</h2>
            <p className="info-desc">
              Every drop counts. By registering as a donor, you can save up to three lives with a single donation.
            </p>

            <div className="eligibility-box">
              <h4 className="eligibility-title">
                <ShieldCheck size={18} className="text-primary-red" />
                Donor Eligibility Guidelines
              </h4>
              <ul className="eligibility-list">
                <li>
                  <Scale size={16} className="text-primary-red" />
                  <span><strong>Weight:</strong> Minimum 50 kg body weight.</span>
                </li>
                <li>
                  <User size={16} className="text-primary-red" />
                  <span><strong>Age:</strong> Between 18 and 65 years.</span>
                </li>
                <li>
                  <Calendar size={16} className="text-primary-red" />
                  <span><strong>Interval:</strong> At least 90 days (3 months) since last blood donation.</span>
                </li>
                <li>
                  <Heart size={16} className="text-primary-red" />
                  <span><strong>Health:</strong> Free from active fever, infection, or major medication.</span>
                </li>
              </ul>
            </div>

            <div className="info-footer-note">
              <Sparkles size={16} className="text-amber" />
              <span>Your contact details are encrypted and only accessible for genuine blood donation requests.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form Card */}
        <div className="register-form-panel">
          <div className="glass-card form-card">
            <div className="form-header">
              <span className="badge badge-danger">Join the Network</span>
              <h2 className="form-title">Donor Registration</h2>
              <p className="form-subtitle">
                Fill in the details below to create your donor profile. Fields marked with <span className="req-star">*</span> are mandatory.
              </p>
            </div>

            {submitError && (
              <div className="form-error-msg" role="alert">
                <AlertCircle size={14} /> {submitError}
              </div>
            )}

            {submittedData ? (
              <div className="submission-success-card">
                <div className="success-header">
                  <CheckCircle2 size={36} className="success-icon" />
                  <div>
                    <h3 className="success-title">Account created successfully</h3>
                    <p className="success-desc">
                      Your account is registered. Donor profile details can be completed separately.
                    </p>
                  </div>
                </div>

                <div className="success-actions">
                  <button onClick={handleReset} className="btn btn-secondary">
                    <RotateCcw size={15} /> Fill Form Again
                  </button>
                  <Link to="/login" className="btn btn-primary">
                    Continue to Log In <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="donor-register-form">
                
                {/* 1. Full Name Field */}
                <div className={`form-group ${errors.fullName && touched.fullName ? 'has-error' : ''}`}>
                  <label htmlFor="fullName" className="form-label">
                    Full Name <span className="req-star">*</span>
                  </label>
                  <div className="input-wrap">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. John Doe"
                      className={`form-input ${errors.fullName && touched.fullName ? 'input-error' : ''}`}
                      autoComplete="name"
                      maxLength={100}
                      required
                    />
                  </div>
                  {errors.fullName && touched.fullName && (
                    <div className="form-error-msg">
                      <AlertCircle size={14} /> {errors.fullName}
                    </div>
                  )}
                </div>

                {/* 2. Email Address & 3. Contact Number (2-Column Grid) */}
                <div className="form-row">
                  {/* Email */}
                  <div className={`form-group ${errors.email && touched.email ? 'has-error' : ''}`}>
                    <label htmlFor="email" className="form-label">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <Mail className="input-icon" size={18} />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="john@example.com"
                        className={`form-input ${errors.email && touched.email ? 'input-error' : ''}`}
                        autoComplete="email"
                        maxLength={255}
                        required
                      />
                    </div>
                    {errors.email && touched.email && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.email}
                      </div>
                    )}
                  </div>

                  {/* Contact Number */}
                  <div className={`form-group ${errors.phone && touched.phone ? 'has-error' : ''}`}>
                    <label htmlFor="phone" className="form-label">
                      Contact Number <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <Phone className="input-icon" size={18} />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 9876543210"
                        className={`form-input ${errors.phone && touched.phone ? 'input-error' : ''}`}
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                      />
                    </div>
                    {errors.phone && touched.phone && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Password & 5. Confirm Password (2-Column Grid) */}
                <div className="form-row">
                  {/* Password */}
                  <div className={`form-group ${errors.password && touched.password ? 'has-error' : ''}`}>
                    <label htmlFor="password" className="form-label">
                      Password <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <Lock className="input-icon" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="At least 6 characters"
                        className={`form-input ${errors.password && touched.password ? 'input-error' : ''}`}
                        autoComplete="new-password"
                        maxLength={100}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="btn-toggle-pw"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && touched.password && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.password}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className={`form-group ${errors.confirmPassword && touched.confirmPassword ? 'has-error' : ''}`}>
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm Password <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <Lock className="input-icon" size={18} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Re-enter your password"
                        className={`form-input ${errors.confirmPassword && touched.confirmPassword ? 'input-error' : ''}`}
                        autoComplete="new-password"
                        maxLength={100}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="btn-toggle-pw"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        tabIndex="-1"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Manually entered address */}
                <div className={`form-group ${errors.address && touched.address ? 'has-error' : ''}`}>
                  <label htmlFor="address" className="form-label">
                    Full Address <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your complete address"
                    className={`form-input address-textarea ${errors.address && touched.address ? 'input-error' : ''}`}
                    autoComplete="street-address"
                    maxLength={1000}
                    rows={3}
                    required
                  />
                  {errors.address && touched.address && (
                    <div className="form-error-msg">
                      <AlertCircle size={14} /> {errors.address}
                    </div>
                  )}
                </div>

                {/* 7. Blood group and manually entered city */}
                <div className="form-row">
                  {/* Blood Group Dropdown */}
                  <div className={`form-group ${errors.bloodGroup && touched.bloodGroup ? 'has-error' : ''}`}>
                    <label htmlFor="bloodGroup" className="form-label">
                      Blood Group <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <Droplet className="input-icon" size={18} />
                      <select
                        id="bloodGroup"
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`form-select ${errors.bloodGroup && touched.bloodGroup ? 'input-error' : ''}`}
                        required
                      >
                        <option value="">-- Select Blood Group --</option>
                        {bloodGroups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.bloodGroup && touched.bloodGroup && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.bloodGroup}
                      </div>
                    )}
                  </div>

                  {/* City Field */}
                  <div className={`form-group ${errors.city && touched.city ? 'has-error' : ''}`}>
                    <label htmlFor="city" className="form-label">
                      City <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <MapPin className="input-icon" size={18} />
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your city"
                        className={`form-input ${errors.city && touched.city ? 'input-error' : ''}`}
                        autoComplete="address-level2"
                        maxLength={100}
                        required
                      />
                    </div>
                    {errors.city && touched.city && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.city}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className={`form-group ${errors.state && touched.state ? 'has-error' : ''}`}>
                    <label htmlFor="state" className="form-label">
                      State <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <MapPin className="input-icon" size={18} />
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your state"
                        className={`form-input ${errors.state && touched.state ? 'input-error' : ''}`}
                        autoComplete="address-level1"
                        maxLength={100}
                        required
                      />
                    </div>
                    {errors.state && touched.state && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.state}
                      </div>
                    )}
                  </div>

                  <div className={`form-group ${errors.pincode && touched.pincode ? 'has-error' : ''}`}>
                    <label htmlFor="pincode" className="form-label">
                      PIN Code <span className="req-star">*</span>
                    </label>
                    <div className="input-wrap">
                      <MapPin className="input-icon" size={18} />
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="6-digit PIN code"
                        className={`form-input ${errors.pincode && touched.pincode ? 'input-error' : ''}`}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={6}
                        required
                      />
                    </div>
                    {errors.pincode && touched.pincode && (
                      <div className="form-error-msg">
                        <AlertCircle size={14} /> {errors.pincode}
                      </div>
                    )}
                  </div>
                </div>

                {/* 9. Last Donation Date (Optional) */}
                <div className={`form-group ${errors.lastDonationDate && touched.lastDonationDate ? 'has-error' : ''}`}>
                  <label htmlFor="lastDonationDate" className="form-label">
                    Last Donation Date <span className="optional-tag">(Optional)</span>
                  </label>
                  <div className="input-wrap">
                    <Calendar className="input-icon" size={18} />
                    <input
                      type="date"
                      id="lastDonationDate"
                      name="lastDonationDate"
                      max={maxDate}
                      value={formData.lastDonationDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`form-input ${errors.lastDonationDate && touched.lastDonationDate ? 'input-error' : ''}`}
                    />
                  </div>
                  <span className="field-hint">Leave blank if this is your first time donating blood.</span>
                  {errors.lastDonationDate && touched.lastDonationDate && (
                    <div className="form-error-msg">
                      <AlertCircle size={14} /> {errors.lastDonationDate}
                    </div>
                  )}
                </div>

                {/* 8. Weight Confirmation Checkbox */}
                <div className={`form-group checkbox-group ${errors.weightConfirmed && touched.weightConfirmed ? 'has-error' : ''}`}>
                  <label className="checkbox-label" htmlFor="weightConfirmed">
                    <input
                      type="checkbox"
                      id="weightConfirmed"
                      name="weightConfirmed"
                      checked={formData.weightConfirmed}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="form-checkbox"
                      required
                    />
                    <span className="checkbox-text">
                      I confirm that my body weight is <strong>50 kg or above</strong> and I am physically fit for blood donation. <span className="req-star">*</span>
                    </span>
                  </label>
                  {errors.weightConfirmed && touched.weightConfirmed && (
                    <div className="form-error-msg">
                      <AlertCircle size={14} /> {errors.weightConfirmed}
                    </div>
                  )}
                </div>

                {/* 10. Register Submit Button */}
                <div className="form-submit-wrap">
                  <button type="submit" className="btn btn-primary btn-block btn-register" disabled={isSubmitting}>
                    <Droplet size={18} fill="#ffffff" stroke="#ffffff" />
                    {isSubmitting ? 'Creating account...' : 'Register as Blood Donor'}
                  </button>
                </div>

                {/* Login Redirect Footer */}
                <div className="form-footer-redirect">
                  <span>Already have an account?</span>
                  <Link to="/login" className="link-login">
                    Log In
                  </Link>
                </div>

              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
