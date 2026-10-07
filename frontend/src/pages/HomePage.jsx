/**
 * Home Page Component
 * -------------------
 * Landing overview showing project setup status, architecture pipeline,
 * and live system diagnostics.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet,
  ShieldCheck,
  Search,
  UserCheck,
  Activity,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import ServerStatus from '../components/ServerStatus';

export default function HomePage() {
  return (
    <div className="homepage-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-badge">
            <span className="badge-pulse"></span>
            <span>Phase 1 Architecture Foundation Initialized</span>
          </div>

          <h1 className="hero-title">
            Find Blood Donors. <span className="text-gradient">Save Lives.</span>
          </h1>

          <p className="hero-description">
            A fast, modern, and reliable platform connecting voluntary blood donors with individuals and hospitals in critical need.
          </p>

          <div className="hero-cta-wrap">
            <Link to="/register" className="btn btn-primary btn-lg">
              <Droplet size={18} fill="#ffffff" stroke="#ffffff" />
              <span>Register as Blood Donor</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Quick Metrics / Highlights */}
          <div className="hero-features-strip">
            <div className="strip-item">
              <ShieldCheck className="strip-icon" size={20} />
              <span>JWT & Hashed Security</span>
            </div>
            <div className="strip-item">
              <Search className="strip-icon" size={20} />
              <span>Fast Location & Blood Search</span>
            </div>
            <div className="strip-item">
              <UserCheck className="strip-icon" size={20} />
              <span>Live Availability Status</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="diagnostics-section">
        <div className="container">
          {/* Live System Diagnostics */}
          <ServerStatus />

          {/* Architecture & Flow Cards */}
          <div className="architecture-grid">
            {/* Frontend Card */}
            <div className="glass-card arch-card">
              <div className="arch-card-header">
                <div className="arch-icon-box react-box">
                  <Layers size={22} />
                </div>
                <div>
                  <h4 className="arch-card-title">Frontend Layer</h4>
                  <span className="arch-card-subtitle">React 19 + Vite + Router</span>
                </div>
              </div>
              <ul className="arch-list">
                <li><CheckCircle2 size={15} className="text-success" /> Component-based UI with Vanilla CSS</li>
                <li><CheckCircle2 size={15} className="text-success" /> Centralized API client with JWT interception</li>
                <li><CheckCircle2 size={15} className="text-success" /> Global Auth Context state management</li>
                <li><CheckCircle2 size={15} className="text-success" /> Responsive layouts with mobile-first design</li>
              </ul>
            </div>

            {/* Backend Card */}
            <div className="glass-card arch-card">
              <div className="arch-card-header">
                <div className="arch-icon-box fastapi-box">
                  <Activity size={22} />
                </div>
                <div>
                  <h4 className="arch-card-title">Backend API Layer</h4>
                  <span className="arch-card-subtitle">FastAPI + Pydantic</span>
                </div>
              </div>
              <ul className="arch-list">
                <li><CheckCircle2 size={15} className="text-success" /> Asynchronous RESTful routing architecture</li>
                <li><CheckCircle2 size={15} className="text-success" /> Strict request & response schemas (Pydantic)</li>
                <li><CheckCircle2 size={15} className="text-success" /> Configurable CORS middleware for security</li>
                <li><CheckCircle2 size={15} className="text-success" /> Environment secrets isolation (.env)</li>
              </ul>
            </div>

            {/* Database & Security Card */}
            <div className="glass-card arch-card">
              <div className="arch-card-header">
                <div className="arch-icon-box db-box">
                  <Database size={22} />
                </div>
                <div>
                  <h4 className="arch-card-title">Database & Auth</h4>
                  <span className="arch-card-subtitle">SQLite + SQLAlchemy + JWT</span>
                </div>
              </div>
              <ul className="arch-list">
                <li><CheckCircle2 size={15} className="text-success" /> Relational User & Donor data models</li>
                <li><CheckCircle2 size={15} className="text-success" /> Automatic table initialization & indexing</li>
                <li><CheckCircle2 size={15} className="text-success" /> Bcrypt salted password hashing</li>
                <li><CheckCircle2 size={15} className="text-success" /> Stateless JSON Web Token authentication</li>
              </ul>
            </div>
          </div>

          {/* Next Steps Roadmap */}
          <div className="glass-card roadmap-card">
            <div className="roadmap-header">
              <div className="roadmap-badge"><Sparkles size={16} /> Roadmap</div>
              <h3 className="roadmap-title">Ready for Step-by-Step Implementation</h3>
              <p className="roadmap-desc">With the foundation, API client, and SQLite database fully verified, we will build each feature step-by-step.</p>
            </div>

            <div className="steps-container">
              <div className="step-box current">
                <div className="step-number">1</div>
                <div className="step-info">
                  <h5>Architecture Setup</h5>
                  <p>FastAPI + React + SQLite verified</p>
                  <span className="badge badge-success">Completed</span>
                </div>
              </div>

              <div className="step-box pending">
                <div className="step-number">2</div>
                <div className="step-info">
                  <h5>User Registration & Hashing</h5>
                  <p>Bcrypt password hashing & validation</p>
                  <span className="badge badge-neutral">Next</span>
                </div>
              </div>

              <div className="step-box pending">
                <div className="step-number">3</div>
                <div className="step-info">
                  <h5>User Login & JWT Auth</h5>
                  <p>Token generation & protected routes</p>
                  <span className="badge badge-neutral">Upcoming</span>
                </div>
              </div>

              <div className="step-box pending">
                <div className="step-number">4</div>
                <div className="step-info">
                  <h5>Donor Profile & Availability</h5>
                  <p>Blood group, location & toggle switch</p>
                  <span className="badge badge-neutral">Upcoming</span>
                </div>
              </div>

              <div className="step-box pending">
                <div className="step-number">5</div>
                <div className="step-info">
                  <h5>Donor Search & Filters</h5>
                  <p>Real-time city & blood group search</p>
                  <span className="badge badge-neutral">Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
