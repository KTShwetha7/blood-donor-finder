/**
 * Navigation Bar Component
 * ------------------------
 * Top-level application header with branding, navigation links, and auth state indicators.
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Droplet, HeartHandshake, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo">
          <div className="logo-icon-wrap">
            <Droplet className="logo-icon" fill="#e63946" stroke="#e63946" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Blood Donor</span>
            <span className="brand-subtitle">Finder</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Overview
          </Link>
          <Link
            to="/donors"
            className={`nav-link ${location.pathname === '/donors' ? 'active' : ''}`}
          >
            Find Donors
          </Link>
          <Link
            to="/requests/new"
            className={`nav-link ${location.pathname === '/requests/new' ? 'active' : ''}`}
          >
            Blood Requests
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to={user?.is_donor ? '/donor-profile' : '/register'}
                className={`nav-link ${location.pathname === '/donor-profile' || location.pathname === '/register' ? 'active' : ''}`}
              >
                {user?.is_donor ? 'My Donor Profile' : 'Register as Donor'}
              </Link>
              <Link
                to="/profile"
                className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                Profile
              </Link>
              <Link
                to="/requests"
                className={`nav-link ${location.pathname === '/requests' || /^\/requests\/\d+$/.test(location.pathname) ? 'active' : ''}`}
              >
                My Blood Requests
              </Link>
            </>
          )}
          <Link
            to="/register"
            className={`nav-link ${location.pathname === '/register' ? 'active' : ''}`}
          >
            Donate Blood
          </Link>
        </nav>

        {/* Auth CTA Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">{user?.full_name || 'User'}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="btn btn-secondary btn-sm">
                <LogIn size={15} /> Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <HeartHandshake size={15} /> Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
