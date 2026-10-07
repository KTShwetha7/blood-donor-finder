/**
 * Footer Component
 * ----------------
 * Standard application footer with project tech stack and architecture information.
 */

import React from 'react';
import { Heart, ShieldCheck, Database, Server, Globe } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container footer-content">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-title">
              <Heart size={18} fill="#e63946" stroke="#e63946" /> Blood Donor Finder
            </div>
            <p className="footer-desc">
              A secure, reliable platform built to bridge the gap between urgent blood requirements and willing donors.
            </p>
          </div>

          <div className="footer-tech-stack">
            <h4 className="footer-heading">Architecture Stack</h4>
            <div className="tech-tags">
              <span className="tech-tag"><Globe size={13} /> React + Vite</span>
              <span className="tech-tag"><Server size={13} /> FastAPI Python</span>
              <span className="tech-tag"><Database size={13} /> SQLite + SQLAlchemy</span>
              <span className="tech-tag"><ShieldCheck size={13} /> JWT Auth</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {CURRENT_YEAR} Blood Donor Finder. Built for reliability, safety, and community impact.</p>
        </div>
      </div>
    </footer>
  );
}
