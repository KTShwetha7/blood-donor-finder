/**
 * Main Application Root Component
 * -------------------------------
 * Configures the React Router navigation tree and global Auth Provider.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DonorSearchPage from './pages/DonorSearchPage';
import DonorDetailsPage from './pages/DonorDetailsPage';
import BloodRequestPage from './pages/BloodRequestPage';
import MyBloodRequestsPage from './pages/MyBloodRequestsPage';
import BloodRequestDetailsPage from './pages/BloodRequestDetailsPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import DonorProfilePage from './pages/DonorProfilePage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-shell">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/donor-profile" element={<DonorProfilePage />} />
              <Route path="/donors" element={<DonorSearchPage />} />
              <Route path="/donors/:donorId" element={<DonorDetailsPage />} />
              <Route path="/requests" element={<MyBloodRequestsPage />} />
              <Route path="/requests/new" element={<BloodRequestPage />} />
              <Route path="/requests/:requestId" element={<BloodRequestDetailsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
