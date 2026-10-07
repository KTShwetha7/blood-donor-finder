import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, Droplet, MapPin, Phone, RotateCcw, Search } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const EMPTY_FILTERS = { bloodGroup: '', city: '', state: '', pincode: '', availableOnly: false };

export default function DonorSearchPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const firstDonorRef = useRef(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [donors, setDonors] = useState(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (donors?.length) {
      firstDonorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [donors]);

  const updateFilter = (event) => {
    const { name, value, checked, type } = event.target;
    setFilters((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    const pincode = filters.pincode.trim();
    if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) {
      setError('Enter a valid 6-digit Indian PIN code.');
      return;
    }

    const params = new URLSearchParams();
    if (filters.bloodGroup) params.set('blood_group', filters.bloodGroup);
    if (filters.city.trim()) params.set('city', filters.city.trim());
    if (filters.state.trim()) params.set('state', filters.state.trim());
    if (pincode) params.set('pincode', pincode);
    if (filters.availableOnly) params.set('is_available', 'true');

    setIsSearching(true);
    try {
      const query = params.toString();
      const data = await apiRequest(`/api/donors${query ? `?${query}` : ''}`);
      setDonors(data);
    } catch (requestError) {
      const detail = requestError.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Donor search failed. Please try again.');
      setDonors(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setDonors(null);
    setError('');
  };

  return (
    <div className="container donor-search-page">
      <header className="donor-search-header">
        <span className="badge badge-danger">Donor Network</span>
        <h1 className="form-title">Find Blood Donors</h1>
        <p className="form-subtitle">Filter active donor profiles by blood group and manually entered location.</p>
      </header>

      {!isAuthenticated ? (
        <section className="glass-card">
          <p>Log in to search donor profiles.</p>
          <Link to="/login" className="btn btn-primary"><Search size={16} /> Log In</Link>
        </section>
      ) : (
        <>
          <form onSubmit={handleSearch} className="glass-card donor-search-filters">
            <div className="form-group">
              <label htmlFor="searchBloodGroup" className="form-label">Blood Group</label>
              <select id="searchBloodGroup" name="bloodGroup" value={filters.bloodGroup} onChange={updateFilter} className="form-select">
                <option value="">Any blood group</option>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="searchCity" className="form-label">City</label>
              <input id="searchCity" name="city" value={filters.city} onChange={updateFilter} className="form-input" type="text" maxLength={100} placeholder="Enter city" />
            </div>
            <div className="form-group">
              <label htmlFor="searchState" className="form-label">State</label>
              <input id="searchState" name="state" value={filters.state} onChange={updateFilter} className="form-input" type="text" maxLength={100} placeholder="Enter state" />
            </div>
            <div className="form-group">
              <label htmlFor="searchPincode" className="form-label">PIN Code</label>
              <input id="searchPincode" name="pincode" value={filters.pincode} onChange={updateFilter} className="form-input" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="6-digit PIN" />
            </div>
            <label className="donor-search-checkbox">
              <input type="checkbox" name="availableOnly" checked={filters.availableOnly} onChange={updateFilter} />
              Available only
            </label>
            <div className="donor-search-actions">
              <button type="submit" className="btn btn-primary" disabled={isSearching}>
                <Search size={16} /> {isSearching ? 'Searching...' : 'Search'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={isSearching}>
                <RotateCcw size={15} /> Clear
              </button>
            </div>
          </form>

          {error && <div className="form-error-msg" role="alert"><AlertCircle size={14} /> {error}</div>}

          {donors !== null && (donors.length === 0 ? (
            <p className="donor-search-empty" role="status">No donors found. Try different filters.</p>
          ) : (
            <section className="donor-search-results" aria-label="Matching donors" aria-live="polite">
              {donors.map((donor, index) => (
                <article className="glass-card donor-result" key={donor.id} ref={index === 0 ? firstDonorRef : undefined}>
                  <div>
                    <div className="donor-result-title">
                      <h2>{donor.donor_name}</h2>
                      <span className="blood-pill">{donor.blood_group}</span>
                    </div>
                    <div className="donor-result-meta">
                      <div><MapPin size={14} /> {donor.address ? `${donor.address}, ` : ''}{donor.city}, {donor.state}{donor.pincode ? ` ${donor.pincode}` : ''}</div>
                      {donor.phone && <div><Phone size={14} /> {donor.phone}</div>}
                      {donor.last_donation_date && <div><CalendarDays size={14} /> Last donation: {donor.last_donation_date}</div>}
                    </div>
                  </div>
                  <div className="donor-result-actions">
                    <span className={`badge ${donor.is_available ? 'badge-success' : 'badge-neutral'} donor-availability`}>
                      <Droplet size={13} /> {donor.is_available ? 'Available' : 'Unavailable'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary donor-details-link"
                      onClick={() => navigate(`/donors/${donor.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}