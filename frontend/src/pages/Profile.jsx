import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { IconCheck } from '../components/common/Icons';

export const Profile = () => {
  const { user, isAdmin, updateProfile, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState('personal');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [preferredCity, setPreferredCity] = useState(user?.preferences?.preferredCity || 'New York');
  const [preferredFormat, setPreferredFormat] = useState(user?.preferences?.preferredFormat || 'IMAX 3D');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleUpdatePersonal = async (e) => {
    e.preventDefault();
    await updateProfile({
      name,
      phone,
      preferences: { preferredCity, preferredFormat }
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.warning('Please enter your current password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    const res = await changePassword(currentPassword, newPassword);
    if (res?.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  return (
    <div className="container py-5">
      <div className="row g-4 justify-content-center">
        {/* Profile Sidebar */}
        <div className="col-12 col-md-4 col-lg-3">
          <div
            className="p-4 rounded-4 text-center mb-4 shadow"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="position-relative d-inline-block mb-3">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                alt={user?.name}
                className="rounded-circle object-fit-cover shadow-lg border border-2 border-danger"
                width="96"
                height="96"
              />
              <span
                className="position-absolute bottom-0 end-0 badge rounded-pill bg-danger border border-dark p-1"
                title="Active Account"
              >
                <IconCheck size={12} />
              </span>
            </div>

            <h5 className="fw-bold text-white mb-1">{user?.name}</h5>
            <small className="text-white-50 d-block mb-2">{user?.email}</small>

            <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-secondary'} rounded-pill px-3 py-1 mb-3`}>
              {isAdmin ? 'Administrator' : 'Cinema VIP Member'}
            </span>

            <div className="border-top border-secondary border-opacity-25 pt-3 text-start small text-white-50">
              <div>Member Since: <strong className="text-white">{user?.memberSince || '2024'}</strong></div>
              <div>Status: <span className="text-success fw-bold">Active</span></div>
            </div>
          </div>

          {/* Quick Tab Links */}
          <div className="list-group rounded-4 shadow overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`list-group-item list-group-item-action border-0 py-3 text-white ${
                activeTab === 'personal' ? 'bg-danger fw-bold' : 'bg-transparent text-white-50 hover-text-white'
              }`}
            >
              Personal Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`list-group-item list-group-item-action border-0 py-3 text-white ${
                activeTab === 'security' ? 'bg-danger fw-bold' : 'bg-transparent text-white-50 hover-text-white'
              }`}
            >
              Password & Security
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`list-group-item list-group-item-action border-0 py-3 text-white ${
                activeTab === 'preferences' ? 'bg-danger fw-bold' : 'bg-transparent text-white-50 hover-text-white'
              }`}
            >
              Cinema Preferences
            </button>
          </div>
        </div>

        {/* Profile Content Column */}
        <div className="col-12 col-md-8 col-lg-8">
          <div
            className="p-4 p-md-5 rounded-4 shadow-lg"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {/* Tab 1: Personal Details */}
            {activeTab === 'personal' && (
              <div>
                <h4 className="fw-bold text-white mb-2">Personal Information</h4>
                <p className="text-white-50 small mb-4">
                  Manage your personal details and contact numbers.
                </p>

                <form onSubmit={handleUpdatePersonal}>
                  <div className="mb-3">
                    <label className="cinema-label">Full Name:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="cinema-input form-control text-white"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="cinema-label">Email Address (Read-only):</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="cinema-input form-control text-white-50 opacity-75"
                    />
                    <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                      To change email, contact security verification.
                    </small>
                  </div>

                  <div className="mb-4">
                    <label className="cinema-label">Phone Number:</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="cinema-input form-control text-white"
                    />
                  </div>

                  <button type="submit" className="btn btn-cinema px-4 py-2">
                    Save Profile Changes
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Security & Password */}
            {activeTab === 'security' && (
              <div>
                <h4 className="fw-bold text-white mb-2">Change Password</h4>
                <p className="text-white-50 small mb-4">
                  Ensure your account has a secure and unique password.
                </p>

                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label className="cinema-label">Current Password:</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="cinema-input form-control text-white"
                      required
                    />
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6">
                      <label className="cinema-label">New Password:</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="cinema-input form-control text-white"
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="cinema-label">Confirm New Password:</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="cinema-input form-control text-white"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-cinema px-4 py-2">
                    Update Password
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Cinema Preferences */}
            {activeTab === 'preferences' && (
              <div>
                <h4 className="fw-bold text-white mb-2">Cinema Preferences</h4>
                <p className="text-white-50 small mb-4">
                  Customize your default location and favorite viewing formats.
                </p>

                <form onSubmit={handleUpdatePersonal}>
                  <div className="mb-3">
                    <label className="cinema-label">Default Cinema City:</label>
                    <select
                      value={preferredCity}
                      onChange={(e) => setPreferredCity(e.target.value)}
                      className="cinema-select form-select"
                    >
                      <option value="New York">New York</option>
                      <option value="Los Angeles">Los Angeles</option>
                      <option value="Chicago">Chicago</option>
                      <option value="London">London</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="cinema-label">Favorite Format:</label>
                    <select
                      value={preferredFormat}
                      onChange={(e) => setPreferredFormat(e.target.value)}
                      className="cinema-select form-select"
                    >
                      <option value="IMAX 3D">IMAX 3D Laser</option>
                      <option value="Dolby Cinema">Dolby Cinema Atmos</option>
                      <option value="4DX Motion">4DX Motion & Effects</option>
                      <option value="2D 4K">Standard 2D 4K</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-cinema px-4 py-2">
                    Save Preferences
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
