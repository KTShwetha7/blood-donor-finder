import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Activity, ArrowRight, ClipboardList, Droplet, HeartHandshake, Plus, Search, UserRound } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const SUMMARY_ITEMS = [
  { key: 'total_requests', label: 'Total Requests', icon: ClipboardList },
  { key: 'pending_requests', label: 'Pending Requests', icon: Activity },
  { key: 'fulfilled_requests', label: 'Fulfilled Requests', icon: HeartHandshake },
  { key: 'cancelled_requests', label: 'Cancelled Requests', icon: ClipboardList },
];

const QUICK_ACTIONS = [
  { to: '/requests/new', label: 'Create Blood Request', icon: Plus },
  { to: '/requests', label: 'My Blood Requests', icon: ClipboardList },
  { to: '/donors', label: 'Search Donors', icon: Search },
];

function getDashboardError(error) {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status >= 500) return 'We could not load your dashboard right now. Please try again later.';
  return 'Unable to load your dashboard. Please try again.';
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;
    apiRequest('/api/dashboard')
      .then((data) => {
        if (isCurrent) setDashboard(data);
      })
      .catch((error) => {
        if (isCurrent) setErrorMessage(getDashboardError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <section className="container dashboard-page">
      <header className="dashboard-header">
        <span className="badge badge-danger"><Droplet size={13} /> Dashboard</span>
        <h1>Welcome to Blood Donor Finder</h1>
        <p className="form-subtitle">A quick overview of your blood requests and donor profile.</p>
      </header>

      {isLoading && <p className="glass-card dashboard-message" role="status">Loading your dashboard...</p>}

      {!isLoading && errorMessage && (
        <div className="glass-card dashboard-message" role="alert">
          <p>{errorMessage}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsLoading(true);
              setErrorMessage('');
              apiRequest('/api/dashboard')
                .then(setDashboard)
                .catch((error) => setErrorMessage(getDashboardError(error)))
                .finally(() => setIsLoading(false));
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && dashboard && (
        <>
          <div className="dashboard-summary-grid">
            {SUMMARY_ITEMS.map(({ key, label, icon: Icon }) => (
              <article className="glass-card dashboard-summary-card" key={key}>
                <span className="dashboard-summary-icon"><Icon size={20} aria-hidden="true" /></span>
                <p>{label}</p>
                <strong>{dashboard[key]}</strong>
              </article>
            ))}
            <article className="glass-card dashboard-summary-card">
              <span className="dashboard-summary-icon"><UserRound size={20} aria-hidden="true" /></span>
              <p>Donor Profile</p>
              <strong className={dashboard.has_donor_profile ? 'dashboard-profile-registered' : ''}>
                {dashboard.has_donor_profile ? 'Registered' : 'Not Registered'}
              </strong>
            </article>
          </div>

          {dashboard.total_requests === 0 && (
            <p className="dashboard-zero-state" role="status">You have no blood requests yet. Create one when you need help.</p>
          )}

          <section className="dashboard-quick-actions" aria-labelledby="dashboard-actions-heading">
            <h2 id="dashboard-actions-heading">Quick Actions</h2>
            <div className="dashboard-action-grid">
              {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
                <Link to={to} className="glass-card dashboard-action-card" key={to}>
                  <span className="dashboard-summary-icon"><Icon size={19} aria-hidden="true" /></span>
                  <span>{label}</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
              <Link
                to={dashboard.has_donor_profile ? '/donor-profile' : '/register'}
                className="glass-card dashboard-action-card"
                key={dashboard.has_donor_profile ? 'donor-profile' : 'register-donor'}
              >
                <span className="dashboard-summary-icon"><Droplet size={19} aria-hidden="true" /></span>
                <span>{dashboard.has_donor_profile ? 'My Donor Profile' : 'Register as Donor'}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
