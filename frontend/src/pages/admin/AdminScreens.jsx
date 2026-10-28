import { useState, useEffect } from 'react';
import { theatreService } from '../../services/theatreService';
import { toast } from 'react-toastify';
import {
  IconTv,
  IconEdit,
  IconTrash,
  IconX
} from '../../components/common/Icons';

export const AdminScreens = () => {
  const [theatres, setTheatres] = useState([]);
  const [selectedTheatreId, setSelectedTheatreId] = useState('');
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [formData, setFormData] = useState({
    theatreId: '',
    name: '',
    capacity: 96,
    rows: 'A - H',
    technology: 'IMAX 3D Laser',
    sound: 'Dolby Atmos'
  });

  // Load theatres
  useEffect(() => {
    const fetchTheatres = async () => {
      try {
        const res = await theatreService.getTheatres();
        const list = res.theatres || [];
        setTheatres(list);
        if (list.length > 0) {
          const firstId = list[0].id || list[0]._id;
          setSelectedTheatreId(firstId);
        }
      } catch (err) {
        console.error('Failed loading theatres for screens view', err);
      }
    };
    fetchTheatres();
  }, []);

  // Load screens for selected theatre
  const fetchScreens = async (theatreId) => {
    if (!theatreId) return;
    setLoading(true);
    try {
      const res = await theatreService.getTheatreScreens(theatreId);
      setScreens(res.screens || []);
    } catch (err) {
      console.error('Failed fetching theatre screens', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTheatreId) {
      fetchScreens(selectedTheatreId);
    }
  }, [selectedTheatreId]);

  const handleOpenCreate = () => {
    setEditingScreen(null);
    setFormData({
      theatreId: selectedTheatreId || (theatres[0]?.id || theatres[0]?._id || ''),
      name: '',
      capacity: 96,
      rows: 'A - H',
      technology: 'IMAX 3D Laser',
      sound: 'Dolby Atmos'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (scr) => {
    setEditingScreen(scr);
    setFormData({
      theatreId: scr.theatre || selectedTheatreId,
      name: scr.name,
      capacity: scr.capacity || 96,
      rows: scr.rows || 'A - H',
      technology: scr.screenType || scr.technology || 'IMAX 3D Laser',
      sound: scr.sound || 'Dolby Atmos'
    });
    setModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const th = theatres.find((t) => (t.id === formData.theatreId || t._id === formData.theatreId));
    const theatreName = th ? th.name : 'Cinema Theatre';

    if (editingScreen) {
      setScreens(screens.map((s) => (s.id === editingScreen.id || s._id === editingScreen._id) ? { ...s, ...formData, theatreName } : s));
      toast.success(`Updated screen "${formData.name}".`);
    } else {
      const newScreen = {
        id: `scr-${Date.now().toString().slice(-3)}`,
        _id: `scr-${Date.now().toString().slice(-3)}`,
        ...formData,
        theatreName
      };
      setScreens([newScreen, ...screens]);
      toast.success(`Created screen "${formData.name}".`);
    }
    setModalOpen(false);
  };

  const handleDelete = (scrId) => {
    setScreens(screens.filter((s) => s.id !== scrId && s._id !== scrId));
    toast.info('Screen removed from auditorium configuration.');
  };

  const currentTheatreName = theatres.find((t) => (t.id === selectedTheatreId || t._id === selectedTheatreId))?.name || 'Selected Theatre';

  return (
    <div className="admin-screens-page">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Auditorium Screens & Layouts</h2>
          <p className="text-white-50 small mb-0">Configure auditorium screen capacities, projection formats, and seating layouts.</p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-cinema d-flex align-items-center gap-2">
          <IconTv size={18} />
          Add Auditorium Screen
        </button>
      </div>

      {/* Theatre Selector Bar */}
      <div className="p-3 rounded-4 mb-4 d-flex align-items-center gap-3 flex-wrap" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <label className="text-white-50 small mb-0 fw-bold">Select Cinema Location:</label>
        <select
          value={selectedTheatreId}
          onChange={(e) => setSelectedTheatreId(e.target.value)}
          className="cinema-select form-select form-select-sm"
          style={{ maxWidth: '320px' }}
        >
          {theatres.map((th) => (
            <option key={th.id || th._id} value={th.id || th._id}>
              {th.name} ({th.city})
            </option>
          ))}
        </select>
        <span className="badge bg-danger rounded-pill px-3 py-1 ms-auto">
          {screens.length} Screens Configured
        </span>
      </div>

      <div className="p-4 rounded-4 shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="table-responsive">
          <table className="table table-cinema mb-0">
            <thead>
              <tr>
                <th>Screen Identifier</th>
                <th>Assigned Theatre</th>
                <th>Capacity</th>
                <th>Row Range</th>
                <th>Projection Type</th>
                <th>Sound System</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-white-50">
                    <div className="spinner-border spinner-border-sm text-danger me-2" role="status" />
                    Loading auditorium screens...
                  </td>
                </tr>
              ) : screens.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-white-50">
                    No screens found for {currentTheatreName}. Click "Add Auditorium Screen" to create one.
                  </td>
                </tr>
              ) : (
                screens.map((scr) => (
                  <tr key={scr.id || scr._id}>
                    <td>
                      <div className="fw-bold text-white d-flex align-items-center gap-2">
                        <IconTv size={16} className="text-danger" />
                        {scr.name}
                      </div>
                      <small className="text-white-50 font-monospace">{scr.id || scr._id}</small>
                    </td>
                    <td className="text-white">{scr.theatreName || currentTheatreName}</td>
                    <td>
                      <span className="badge bg-danger rounded-pill px-2 py-1">
                        {scr.capacity || 108} Seats
                      </span>
                    </td>
                    <td className="text-white-50">{scr.rows || 'A - J'}</td>
                    <td><span className="badge bg-dark border border-secondary text-white">{scr.screenType || scr.technology || 'Standard'}</span></td>
                    <td className="text-white-50 small">{scr.sound || 'Dolby Atmos'}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(scr)}
                          className="btn btn-sm btn-outline-secondary text-white p-1"
                          title="Edit Screen"
                        >
                          <IconEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(scr.id || scr._id)}
                          className="btn btn-sm btn-outline-danger p-1"
                          title="Delete Screen"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1060 }}
        >
          <div
            className="cinema-modal rounded-4 shadow-2xl p-4 overflow-y-auto"
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--bg-modal)',
              border: '1px solid var(--border-strong)'
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom border-secondary border-opacity-25">
              <h5 className="fw-bold text-white mb-0">
                {editingScreen ? `Edit: ${editingScreen.name}` : 'Configure New Screen'}
              </h5>
              <button onClick={() => setModalOpen(false)} className="btn text-white-50 p-1">
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="cinema-label">Assigned Cinema Theatre:</label>
                <select
                  value={formData.theatreId}
                  onChange={(e) => setFormData({ ...formData, theatreId: e.target.value })}
                  className="cinema-select form-select"
                >
                  {theatres.map((th) => (
                    <option key={th.id || th._id} value={th.id || th._id}>{th.name} ({th.city})</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="cinema-label">Screen Name / Hall Identifier:</label>
                <input
                  type="text"
                  placeholder="e.g. Screen 1 - IMAX Laser"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="cinema-input form-control text-white"
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Auditorium Capacity:</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Seating Row Range:</label>
                  <input
                    type="text"
                    placeholder="e.g. A - J"
                    value={formData.rows}
                    onChange={(e) => setFormData({ ...formData, rows: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Projection Format:</label>
                  <select
                    value={formData.technology}
                    onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                    className="cinema-select form-select"
                  >
                    <option value="IMAX 3D Laser">IMAX 3D Laser</option>
                    <option value="Dolby Vision 4K">Dolby Vision 4K</option>
                    <option value="Barco Laser 4K">Barco Laser 4K</option>
                    <option value="Standard 2D Digital">Standard 2D Digital</option>
                    <option value="ScreenX 270°">ScreenX 270°</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Sound Architecture:</label>
                  <select
                    value={formData.sound}
                    onChange={(e) => setFormData({ ...formData, sound: e.target.value })}
                    className="cinema-select form-select"
                  >
                    <option value="Dolby Atmos 64-Ch">Dolby Atmos 64-Ch</option>
                    <option value="12-Channel Immersive">12-Channel Immersive</option>
                    <option value="Dolby 7.1 Surround">Dolby 7.1 Surround</option>
                    <option value="THX Certified Studio">THX Certified Studio</option>
                  </select>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-cinema-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-cinema">
                  Save Screen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
