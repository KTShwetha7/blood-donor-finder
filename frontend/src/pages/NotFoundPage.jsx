/**
 * 404 Not Found Page
 * ------------------
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="container notfound-container">
      <div className="glass-card notfound-card">
        <AlertCircle size={48} className="text-danger" />
        <h2>404 - Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Return to Home
        </Link>
      </div>
    </div>
  );
}
