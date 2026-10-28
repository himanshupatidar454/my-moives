import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USE_MOCKS } from '../utils/env';
import { IconShield, IconChevronLeft } from '../components/common/Icons';

export const Unauthorized = () => {
  const { switchDemoRole } = useAuth();

  return (
    <div className="container py-5 text-center min-vh-75 d-flex flex-column align-items-center justify-content-center">
      <div
        className="d-inline-flex align-items-center justify-content-center p-4 rounded-circle bg-danger bg-opacity-10 text-danger mb-4 shadow"
      >
        <IconShield size={48} />
      </div>
      <h1 className="display-4 fw-extrabold text-white mb-2">Access Restricted</h1>
      <h4 className="fw-bold text-white mb-3">Administrator Privileges Required</h4>
      <p className="text-white-50 fs-6 mb-4" style={{ maxWidth: '480px' }}>
        This management portal is reserved for cinema administrators.
      </p>

      <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
        {USE_MOCKS && switchDemoRole && (
          <button
            type="button"
            onClick={() => switchDemoRole('admin')}
            className="btn btn-cinema px-4 py-2 fw-semibold"
          >
            Switch to Demo Admin
          </button>
        )}
        <Link to="/" className="btn btn-cinema-secondary px-4 py-2 d-inline-flex align-items-center gap-1">
          <IconChevronLeft size={16} />
          Return to Cinema
        </Link>
      </div>
    </div>
  );
};
