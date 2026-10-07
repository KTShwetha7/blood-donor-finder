import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Droplet } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const displayValue = (value) => value || 'Not provided';

export default function DonorDetailsPage() {
  const { donorId } = useParams();
  const { isAuthenticated } = useAuth();
  const [donor, setDonor] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return undefined;
    }

    let isCurrent = true;
    setIsLoading(true);
    setError(null);
    setDonor(null);

    apiRequest(`/api/donors/${donorId}`)
      .then((data) => {
        if (isCurrent) setDonor(data);
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError({
            status: requestError.status,
            message: requestError.message || 'Unable to load donor details. Please try again.',
          });
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [donorId, isAuthenticated]);

  return (
    <div className="container donor-details-page">
      <Link to="/donors" className="btn btn-secondary donor-details-back">
        <ArrowLeft size={16} /> Back to Search
      </Link>

      {isLoading ? (
        <p className="donor-details-state" role="status">Loading donor details...</p>
      ) : !isAuthenticated ? (
        <section className="glass-card donor-details-state">
          <p>Log in to view donor details.</p>
          <Link to="/login" className="btn btn-primary">Log In</Link>
        </section>
      ) : error?.status === 404 ? (
        <section className="glass-card donor-details-state" role="alert">
          <AlertCircle size={22} />
          <h1>Donor not found</h1>
          <p>This donor profile may no longer be available.</p>
        </section>
      ) : error?.status === 401 ? (
        <section className="glass-card donor-details-state" role="alert">
          <AlertCircle size={22} />
          <p>Your session has expired. Please log in again to continue.</p>
          <Link to="/login" className="btn btn-primary">Log In</Link>
        </section>
      ) : error ? (
        <section className="glass-card donor-details-state" role="alert">
          <AlertCircle size={22} />
          <h1>Could not load donor details</h1>
          <p>{error.message}</p>
        </section>
      ) : donor ? (
        <>
          <header className="donor-details-header">
            <span className="badge badge-danger">Donor Profile</span>
          </header>
          <section className="glass-card donor-details-card">
            <div className="donor-details-title">
              <h1>{donor.full_name}</h1>
              <span className="blood-pill">{donor.blood_group}</span>
              <span className={`badge ${donor.is_available ? 'badge-success' : 'badge-neutral'}`}>
                <Droplet size={13} /> {donor.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <dl className="donor-details-grid">
              <div className="donor-details-item"><dt>Email</dt><dd>{displayValue(donor.email)}</dd></div>
              <div className="donor-details-item"><dt>Phone</dt><dd>{displayValue(donor.phone)}</dd></div>
              <div className="donor-details-item"><dt>Address</dt><dd>{displayValue(donor.address)}</dd></div>
              <div className="donor-details-item"><dt>City</dt><dd>{displayValue(donor.city)}</dd></div>
              <div className="donor-details-item"><dt>State</dt><dd>{displayValue(donor.state)}</dd></div>
              <div className="donor-details-item"><dt>PIN Code</dt><dd>{displayValue(donor.pincode)}</dd></div>
              <div className="donor-details-item"><dt>Last Donation</dt><dd>{displayValue(donor.last_donation_date)}</dd></div>
              <div className="donor-details-item"><dt>Profile Created</dt><dd>{donor.created_at ? new Date(donor.created_at).toLocaleString() : 'Not provided'}</dd></div>
              <div className="donor-details-item donor-details-notes"><dt>Additional Notes</dt><dd>{displayValue(donor.additional_notes)}</dd></div>
            </dl>
          </section>
        </>
      ) : null}
    </div>
  );
}
