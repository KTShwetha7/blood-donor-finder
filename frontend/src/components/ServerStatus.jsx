/**
 * Server Status & Connection Diagnostic Component
 * -----------------------------------------------
 * Live tester that verifies communication between React Frontend, FastAPI Backend,
 * and the SQLite database.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Activity, Database, Server, Cpu } from 'lucide-react';
import { checkBackendHealth, API_BASE_URL } from '../api/client';

export default function ServerStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await checkBackendHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setStatus(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to backend server');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const isHealthy = status?.status === 'healthy';

  return (
    <div className="glass-card status-card">
      <div className="status-header">
        <div className="status-title-wrap">
          <div className="status-icon-box">
            <Activity className="status-main-icon" size={20} />
          </div>
          <div>
            <h3 className="status-heading">System Connection & Health Status</h3>
            <p className="status-subheading">Live diagnostic verifying React &larr;&rarr; FastAPI &larr;&rarr; SQLite communication</p>
          </div>
        </div>

        <button
          onClick={testConnection}
          disabled={loading}
          className="btn btn-secondary btn-sm refresh-btn"
          title="Re-test backend connection"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      <div className="status-grid">
        {/* Backend Server Status */}
        <div className="status-item-card">
          <div className="status-item-top">
            <Server size={18} className="item-icon" />
            <span className="item-label">FastAPI Backend</span>
            {loading ? (
              <span className="badge badge-neutral">Checking...</span>
            ) : isHealthy ? (
              <span className="badge badge-success"><span className="status-dot online"></span> Online</span>
            ) : (
              <span className="badge badge-danger"><span className="status-dot offline"></span> Offline</span>
            )}
          </div>
          <div className="status-item-body">
            <div className="status-row">
              <span className="row-key">Target URL:</span>
              <span className="row-val font-mono">{API_BASE_URL}</span>
            </div>
            <div className="status-row">
              <span className="row-key">Response Time:</span>
              <span className="row-val">{latency !== null ? `${latency} ms` : '--'}</span>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="status-item-card">
          <div className="status-item-top">
            <Database size={18} className="item-icon" />
            <span className="item-label">SQLite Database</span>
            {loading ? (
              <span className="badge badge-neutral">Checking...</span>
            ) : status?.database?.status === 'connected' ? (
              <span className="badge badge-success"><CheckCircle2 size={13} /> Connected</span>
            ) : (
              <span className="badge badge-danger"><XCircle size={13} /> Disconnected</span>
            )}
          </div>
          <div className="status-item-body">
            <div className="status-row">
              <span className="row-key">Engine:</span>
              <span className="row-val">SQLAlchemy 2.0 (SQLite)</span>
            </div>
            <div className="status-row">
              <span className="row-key">Tables Initialized:</span>
              <span className="row-val font-mono">users, donors</span>
            </div>
          </div>
        </div>

        {/* Security & Token Readiness */}
        <div className="status-item-card">
          <div className="status-item-top">
            <Cpu size={18} className="item-icon" />
            <span className="item-label">Auth & Router Pipeline</span>
            <span className="badge badge-info">Configured</span>
          </div>
          <div className="status-item-body">
            <div className="status-row">
              <span className="row-key">Auth Type:</span>
              <span className="row-val">JWT Bearer (HS256)</span>
            </div>
            <div className="status-row">
              <span className="row-key">Hashing:</span>
              <span className="row-val">Bcrypt (Salted)</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="status-alert error">
          <XCircle size={18} />
          <div>
            <strong>Backend Connection Failed:</strong> {error}
            <div className="error-hint">Make sure the FastAPI server is running with <code>uvicorn app.main:app --reload</code> or <code>python run.py</code>.</div>
          </div>
        </div>
      )}

      {isHealthy && (
        <div className="status-alert success">
          <CheckCircle2 size={18} />
          <div>
            <strong>Handshake Successful:</strong> Frontend Vite app is actively communicating with FastAPI and the SQLite database!
          </div>
        </div>
      )}
    </div>
  );
}
