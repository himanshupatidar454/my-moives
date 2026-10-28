import { useAuth } from '../../context/AuthContext';
import { USE_MOCKS } from '../../utils/env';
import { IconMenu, IconUser, IconLogOut } from '../common/Icons';

export const AdminNavbar = ({ onToggleSidebar }) => {
  const { user, logout, switchDemoRole } = useAuth();

  return (
    <header className="py-2 px-3 px-lg-4 d-flex align-items-center justify-content-between border-bottom" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-lg-none text-white p-1"
          onClick={onToggleSidebar}
          aria-label="Toggle admin sidebar"
        >
          <IconMenu size={22} />
        </button>
        <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1 small fw-semibold">
          Admin Control Center
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        {USE_MOCKS && (
          <button
            type="button"
            onClick={() => switchDemoRole && switchDemoRole('user')}
            className="btn btn-sm btn-outline-light py-1 px-2 d-none d-sm-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.8rem' }}
          >
            <IconUser size={14} />
            Switch to Customer
          </button>
        )}

        <div className="d-flex align-items-center gap-2">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"}
            alt={user?.name}
            className="rounded-circle"
            width="32"
            height="32"
          />
          <div className="d-none d-md-block text-start">
            <div className="fw-bold text-white small">{user?.name}</div>
            <div className="text-white-50 small" style={{ fontSize: '0.7rem' }}>Administrator</div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="btn btn-sm text-danger p-1"
          title="Sign Out"
        >
          <IconLogOut size={18} />
        </button>
      </div>
    </header>
  );
};
