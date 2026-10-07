import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarDays, Droplet, MapPin, Plus, Search, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const REQUEST_STATUSES = ['PENDING', 'FULFILLED', 'CANCELLED'];
const EMPTY_FILTERS = {
  blood_group: '',
  city: '',
  state: '',
  pincode: '',
  urgency: '',
  status: '',
};

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB');
}

function getErrorMessage(error) {
  if (error.status === 401) return 'Your session has expired. Please log in again to view your requests.';
  if (error.status >= 500) return 'We could not load your blood requests right now. Please try again later.';
  if (error.status === 422) return 'One or more filters are invalid. Please review your search.';
  return 'Unable to load your blood requests. Please try again.';
}

async function fetchBloodRequests(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  const query = params.toString();
  const data = await apiRequest(`/api/requests/search${query ? `?${query}` : ''}`);
  if (!Array.isArray(data)) throw new Error('Unexpected blood request response.');
  return data;
}

export default function MyBloodRequestsPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;
    fetchBloodRequests(EMPTY_FILTERS)
      .then((data) => { if (isCurrent) setRequests(data); })
      .catch((error) => {
        if (isCurrent) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const runSearch = async (nextFilters) => {
    setIsLoading(true);
    setLoadError('');
    try {
      setRequests(await fetchBloodRequests(nextFilters));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    runSearch(filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    runSearch(EMPTY_FILTERS);
  };

  return (
    <section className="container blood-requests-page">
      <header className="blood-requests-header">
        <div>
          <span className="badge badge-danger"><Droplet size={13} /> Requests</span>
          <h1>My Blood Requests</h1>
          <p>Review the blood requests you have submitted.</p>
        </div>
        <Link to="/requests/new" className="btn btn-primary">
          <Plus size={17} /> Create Blood Request
        </Link>
      </header>

      {isLoading && <p className="blood-requests-message" role="status">Loading your blood requests...</p>}

      {!isLoading && location.state?.successMessage && (
        <p className="blood-request-action-success" role="status">{location.state.successMessage}</p>
      )}

      <form className="glass-card blood-request-search" onSubmit={applyFilters}>
        <div className="blood-request-search-heading">
          <h2>Search and Filter Blood Requests</h2>
          <p>Filter your requests by blood group, location, urgency, or status.</p>
        </div>
        <div className="blood-request-search-grid">
          <div className="form-group">
            <label htmlFor="filter-blood-group" className="form-label">Blood Group</label>
            <select id="filter-blood-group" name="blood_group" value={filters.blood_group} onChange={updateFilter} className="form-select blood-request-control">
              <option value="">All blood groups</option>
              {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="filter-city" className="form-label">City</label>
            <input id="filter-city" name="city" value={filters.city} onChange={updateFilter} maxLength={100} className="form-input blood-request-control" />
          </div>
          <div className="form-group">
            <label htmlFor="filter-state" className="form-label">State</label>
            <input id="filter-state" name="state" value={filters.state} onChange={updateFilter} maxLength={100} className="form-input blood-request-control" />
          </div>
          <div className="form-group">
            <label htmlFor="filter-pincode" className="form-label">PIN Code</label>
            <input id="filter-pincode" name="pincode" value={filters.pincode} onChange={updateFilter} inputMode="numeric" maxLength={6} className="form-input blood-request-control" />
          </div>
          <div className="form-group">
            <label htmlFor="filter-urgency" className="form-label">Urgency</label>
            <select id="filter-urgency" name="urgency" value={filters.urgency} onChange={updateFilter} className="form-select blood-request-control">
              <option value="">All urgency levels</option>
              {URGENCY_LEVELS.map((urgency) => <option key={urgency} value={urgency}>{urgency}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="filter-status" className="form-label">Status</label>
            <select id="filter-status" name="status" value={filters.status} onChange={updateFilter} className="form-select blood-request-control">
              <option value="">All statuses</option>
              {REQUEST_STATUSES.map((requestStatus) => <option key={requestStatus} value={requestStatus}>{requestStatus}</option>)}
            </select>
          </div>
        </div>
        <div className="blood-request-action-buttons">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Search size={16} /> Apply Filters
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearFilters} disabled={isLoading}>
            <X size={16} /> Clear Filters
          </button>
        </div>
      </form>

      {!isLoading && loadError && (
        <div className="glass-card blood-requests-message" role="alert">
          <p>{loadError}</p>
          {loadError.startsWith('Your session') && (
            <Link to="/login" className="btn btn-secondary">Log in</Link>
          )}
        </div>
      )}

      {!isLoading && !loadError && requests.length === 0 && Object.values(filters).some(Boolean) && (
        <div className="glass-card blood-requests-empty">
          <h2>No blood requests match your filters.</h2>
          <p>Try changing your search criteria or clear the filters.</p>
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            <X size={16} /> Clear Filters
          </button>
        </div>
      )}

      {!isLoading && !loadError && requests.length === 0 && !Object.values(filters).some(Boolean) && (
        <div className="glass-card blood-requests-empty">
          <h2>No blood requests found.</h2>
          <p>Your requests will appear here after you create one.</p>
          <Link to="/requests/new" className="btn btn-primary">
            <Plus size={17} /> Create Blood Request
          </Link>
        </div>
      )}

      {!isLoading && !loadError && requests.length > 0 && (
        <>
          <p className="blood-request-result-count" role="status">
            {requests.length} blood request{requests.length === 1 ? '' : 's'} found.
          </p>
          <div className="blood-request-list">
            {requests.map((request) => (
              <article className="glass-card blood-request-list-card" key={request.id}>
                <div className="blood-request-list-top">
                  <h2>Blood Request #{request.id}</h2>
                  <span className={`blood-request-status status-${String(request.status).toLowerCase()}`}>
                    {request.status}
                  </span>
                </div>
                <div className="blood-request-summary">
                  <p><strong>Blood Group:</strong> {request.blood_group}</p>
                  <p><strong>Units Required:</strong> {request.units_required}</p>
                  <p><strong>Hospital:</strong> {request.hospital_name}</p>
                  <p><MapPin size={16} aria-hidden="true" /> {request.city}, {request.state}</p>
                  <p><CalendarDays size={16} aria-hidden="true" /> Required Date: {formatDate(request.required_date)}</p>
                  <p><strong>Urgency:</strong> {request.urgency}</p>
                </div>
                <Link to={`/requests/${request.id}`} className="btn btn-secondary">
                  View Details <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
