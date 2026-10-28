import { useAuth } from '../../context/AuthContext';
import { USE_MOCKS } from '../../utils/env';
import { IconShield, IconUser, IconSparkles } from './Icons';

export const DemoBanner = () => {
  const { role, switchDemoRole } = useAuth();

  if (!USE_MOCKS) {
    return null;
  }

  return (
    <aside aria-label="Demo mode status" className="py-1 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2 text-white-50" style={{ backgroundColor: '#13131B', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
      <div className="d-flex align-items-center gap-2">
        <span className="badge rounded-pill bg-danger d-inline-flex align-items-center gap-1 px-2 py-1">
          <IconSparkles size={12} />
          DEMO MODE
        </span>
        <span className="d-none d-sm-inline">
          Connected to local mock adapter. Ready for Express REST API (`VITE_API_BASE_URL`).
        </span>
      </div>

      <div className="d-flex align-items-center gap-2">
        <span>Current Role: <strong className="text-white text-capitalize">{role}</strong></span>
        {role === 'admin' ? (
          <button
            onClick={() => switchDemoRole('user')}
            className="btn btn-sm btn-outline-light py-0 px-2 d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.75rem' }}
          >
            <IconUser size={12} />
            Switch to Customer
          </button>
        ) : (
          <button
            onClick={() => switchDemoRole('admin')}
            className="btn btn-sm btn-outline-danger py-0 px-2 d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.75rem' }}
          >
            <IconShield size={12} />
            Switch to Admin
          </button>
        )}
      </div>
    </aside>
  );
};
