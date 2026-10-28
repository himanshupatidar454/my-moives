import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconFilm,
  IconEye,
  IconEyeOff,
  IconShield
} from '../components/common/Icons';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res?.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="container py-5 d-flex align-items-center justify-content-center min-vh-75">
      <div
        className="p-4 p-md-5 rounded-4 shadow-2xl mx-auto"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)'
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-2 mb-3 text-decoration-none">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 shadow"
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #FF2E3B 0%, #E50914 100%)',
                color: '#ffffff'
              }}
            >
              <IconFilm size={24} />
            </div>
            <span className="fw-bold fs-3 text-white">IMovies</span>
          </Link>
          <h4 className="fw-bold text-white mb-1">Welcome Back</h4>
          <p className="text-white-50 small mb-0">Sign in to your cinema account to manage bookings & favorites</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="cinema-label">Email Address:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex@imovies.com"
              className="cinema-input form-control text-white"
              required
            />
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="cinema-label mb-0">Password:</label>
              <Link to="/forgot-password" className="text-danger small text-decoration-none">
                Forgot password?
              </Link>
            </div>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="cinema-input form-control text-white pe-5"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn position-absolute top-50 end-0 translate-middle-y me-2 text-white-50 border-0 p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="form-check">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="form-check-input bg-dark border-secondary"
              />
              <label htmlFor="rememberMe" className="form-check-label text-white-50 small">
                Keep me signed in
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-cinema w-100 py-3 fw-bold mb-3 d-flex align-items-center justify-content-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Signing in to IMovies...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center">
            <span className="text-white-50 small">
              New to IMovies?{' '}
              <Link to="/register" className="text-danger fw-semibold text-decoration-none hover-underline">
                Create an account
              </Link>
            </span>
          </div>
        </form>

        {/* Security Assurance */}
        <div className="border-top border-secondary border-opacity-25 mt-4 pt-3 text-center">
          <small className="text-white-50 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
            <IconShield size={13} className="text-success" />
            256-Bit SSL Encrypted Cinema Booking Network
          </small>
        </div>
      </div>
    </div>
  );
};
