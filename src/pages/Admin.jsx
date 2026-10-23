import React, { useContext, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl, Rectangle, Tooltip, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { getBlockBounds, getBlockCenter, getBlockId, generateVisibleGridRectangles } from '../utils/gridUtils';

// Extracted out to prevent catastrophic React unmount/remount cycles during keystrokes
function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      // Project locations must snap strictly to structural Block Centroids
      const [snapLat, snapLng] = getBlockCenter(e.latlng.lat, e.latlng.lng);
      onLocationChange(snapLat, snapLng);
    }
  });
  return null;
}

function AdminMapController({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Interactive Map Picker Component
const LocationPicker = React.memo(function LocationPicker({ lat, lng, onLocationChange, allProjects }) {
  const activeBounds = getBlockBounds(lat, lng);
  const backgroundGrid = generateVisibleGridRectangles(lat, lng);
  const selectedBlockId = getBlockId(lat, lng);
  
  // Natively trace existing infrastructure deployed inside this exact bounding grid
  const projectsInBlock = allProjects.filter(p => getBlockId(p.lat, p.lng) === selectedBlockId).length;

  return (
    <div className="map-picker-container" style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={[lat, lng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer 
          attribution='&copy; Esri, OpenStreetMap contributors'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" 
        />
        
        {/* Render structural grid lines */}
        {backgroundGrid.map(rect => (
          <Rectangle 
            key={rect.id} 
            bounds={rect.bounds} 
            pathOptions={{ color: '#A0AEC0', weight: 1, fillOpacity: 0.02, interactive: false }} 
          />
        ))}

        {/* Selected Urban Block Bounding Box */}
        <Rectangle 
          bounds={activeBounds} 
          pathOptions={{ color: '#DD6B20', weight: 3, fillColor: '#DD6B20', fillOpacity: 0.15 }} 
        >
          <Tooltip permanent direction="top" className="block-tooltip" opacity={1}>
            <div className="tooltip-block-content">
              <strong>📍 {selectedBlockId}</strong>
              <span>{projectsInBlock} Projects inside</span>
            </div>
          </Tooltip>
        </Rectangle>

        {/* Existing Projects Map Array */}
        {allProjects.map(p => (
           <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={3} pathOptions={{ color: 'white', fillColor: '#3182CE', fillOpacity: 0.8, weight: 1 }} />
        ))}

        <AdminMapController center={[lat, lng]} zoom={15} />
        <MapClickHandler onLocationChange={onLocationChange} />
        <ZoomControl position="bottomright" />
      </MapContainer>
      <div className="map-picker-overlay">Select a structural block to assign project location</div>
    </div>
  );
});

function Admin() {
  const navigate = useNavigate();
  const { customProjects, projectsData, addCustomProject, deleteCustomProject, userLocation } = useContext(ProjectContext);

  const allProjects = useMemo(() => [...customProjects, ...projectsData], [customProjects, projectsData]);

  // Make sure to snap the initial initialization bounds into the Grid System
  const initialLat = userLocation ? userLocation[0] : 28.6139;
  const initialLng = userLocation ? userLocation[1] : 77.2090;
  const [initLat, initLng] = getBlockCenter(initialLat, initialLng);

  const [formData, setFormData] = useState({
    name: 'Sector Road Upgrade',
    category: 'Roads',
    authority: 'PWD',
    status: 'Ongoing',
    progress: 45,
    budget: 12,
    description: 'Crucial infrastructural repair targeting high-traffic corridor.',
    lat: initLat,
    lng: initLng,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [toastMessage, setToastMessage] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');

  const fetchAdminLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMsg("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsFetchingLocation(true);
    setLocationMsg("Detecting precise location...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const [snapLat, snapLng] = getBlockCenter(lat, lng);
        setFormData(prev => ({ ...prev, lat: snapLat, lng: snapLng }));
        setLocationMsg("✓ Live coordinates secured and snapped to structural grid.");
        setIsFetchingLocation(false);
        setTimeout(() => setLocationMsg(''), 4000);
      },
      (error) => {
        console.warn("Location error:", error);
        setLocationMsg("Location access denied or unavailable. Using default centralized zone.");
        setIsFetchingLocation(false);
        // Fallback to Delhi
        const [snapLat, snapLng] = getBlockCenter(28.6139, 77.2090);
        setFormData(prev => ({ ...prev, lat: snapLat, lng: snapLng }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Fetch on initial component mount to fulfill user requirement
  React.useEffect(() => {
    fetchAdminLocation();
  }, [fetchAdminLocation]);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [approvalState, setApprovalState] = useState('Submitted');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = useCallback((lat, lng) => {
    setFormData(prev => ({ ...prev, lat, lng }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (approvalState !== 'Approved') return alert("Project must be approved by absolute authority before deployment.");
    if (!formData.name || !formData.authority) return alert("Please fill necessary core details.");
    
    addCustomProject({
      ...formData,
      id: `custom_${Date.now()}`,
      progress: parseInt(formData.progress),
      budget: parseFloat(formData.budget) || 0,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      blockId: getBlockId(parseFloat(formData.lat), parseFloat(formData.lng))
    });
    
    // Reset wizard gracefully
    setApprovalState('Submitted');
    setFormData(prev => ({ ...prev, name: '' }));
    
    setToastMessage('Project added successfully');
    setTimeout(() => {
      setToastMessage('');
      navigate('/');
    }, 2000);
  };

  // Stats & States Generators
  const totalProjects = projectsData.length;
  const ongoing = projectsData.filter(p => p.status === 'Ongoing').length;
  const completed = projectsData.filter(p => p.status === 'Completed').length;
  
  const approvalProgress = approvalState === 'Submitted' ? 30 : approvalState === 'Under Review' ? 60 : 100;

  return (
    <div className="admin-dashboard-page">
      {/* 1. TOP NAVBAR */}
      <header className="admin-top-nav">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <img src="/nagardarpan-logo.png" alt="NagarDarpan" className="admin-logo-img" />
          <div className="nav-brand-text">
            <h1>Smart City Admin</h1>
            <span>Managing your city, one project at a time</span>
          </div>
        </div>
        <div className="nav-profile">
          <div className="profile-info">
            <strong>Admin Authority</strong>
            <span>City Command Center</span>
          </div>
          <div className="profile-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>
      </header>

      <div className="admin-dashboard-layout">
        {toastMessage && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#38A169', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            ✓ {toastMessage}
          </div>
        )}
        
        {/* 2. DASHBOARD OVERVIEW */}
        <div className="admin-stats-row">
          <div className="stat-glass-card">
            <div className="stat-icon-wrapper blue">📋</div>
            <div className="stat-data">
              <h3>{totalProjects}</h3>
              <p>Total Projects Monitored</p>
            </div>
          </div>
          <div className="stat-glass-card">
            <div className="stat-icon-wrapper saffron">🏗️</div>
            <div className="stat-data">
              <h3>{ongoing}</h3>
              <p>Active & Ongoing</p>
            </div>
          </div>
          <div className="stat-glass-card">
            <div className="stat-icon-wrapper green">✅</div>
            <div className="stat-data">
              <h3>{completed}</h3>
              <p>Completed Initiatives</p>
            </div>
          </div>
        </div>

        <div className="admin-core-grid">
          
          {/* LEFT: ADD PROJECT WIZARD */}
          <div className="admin-wizard-panel glass-panel">
            <div className="panel-header">
              <h2>Deploy New Civic Project</h2>
              <p>Inject real-world structural data securely into the public tracking grid.</p>
            </div>

            <form className="wizard-form" onSubmit={handleSubmit}>
              
              {/* LOCATION BLOCK */}
              <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>📍 Geolocation coordinates</h3>
                  <button 
                    type="button" 
                    onClick={fetchAdminLocation} 
                    disabled={isFetchingLocation}
                    className="action-btn-small"
                    style={{ background: '#EBF8FF', color: '#3182CE', border: '1px solid #BEE3F8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', outline: 'none' }}
                  >
                    {isFetchingLocation ? '⏳ Locating...' : '🎯 Use My Location'}
                  </button>
                </div>
                <p className="section-instruction">Select the 1km structural block anchoring the physical build.</p>
                
                {locationMsg && (
                  <div style={{ padding: '10px 14px', marginBottom: '16px', background: locationMsg.includes('denied') || locationMsg.includes('unavailable') ? '#FED7D7' : '#C6F6D5', color: locationMsg.includes('denied') || locationMsg.includes('unavailable') ? '#9B2C2C' : '#22543D', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {locationMsg.includes('denied') ? '⚠️' : '✨'} {locationMsg}
                  </div>
                )}
                
                <div className="location-picker-wrapper">
                  <LocationPicker lat={formData.lat} lng={formData.lng} onLocationChange={handleLocationChange} allProjects={allProjects} />
                </div>
                <div className="lat-lng-display">
                  <span className="block-id-badge">{getBlockId(formData.lat, formData.lng)}</span>
                  <span>Lat: {formData.lat.toFixed(4)}</span>
                  <span>Lng: {formData.lng.toFixed(4)}</span>
                  <span className="snap-notice">✓ Snapped</span>
                </div>
                <p className="micro-helper">Projects are organized block-wise for geographic clarity and structural indexing.</p>
              </div>

              {/* DETAILS BLOCK */}
              <div className="form-section">
                <h3>🧱 Core Nomenclature</h3>
                <div className="input-group">
                  <label>Official Project Title</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Central Node Redevelopment" className="modern-input" required />
                </div>
                
                <div className="input-row">
                  <div className="input-group">
                    <label>Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="modern-input">
                      <option value="Roads">🚗 Roads & Highways</option>
                      <option value="Hospitals">🏥 Healthcare</option>
                      <option value="Bridges">🌉 Bridges & Tunnels</option>
                      <option value="Schools">📚 Education</option>
                      <option value="Drainage">💧 Drainage & Sanitation</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Assigned Authority</label>
                    <input type="text" name="authority" value={formData.authority} onChange={handleChange} placeholder="e.g., PWD, NHAI" className="modern-input" required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Executive Summary (Public Facing)</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="modern-input" />
                </div>
              </div>

              {/* TIMELINE & STATUS BLOCK */}
              <div className="form-section">
                <h3>⏳ Timeline & Fiscal Metrics</h3>
                
                <div className="input-group">
                  <label>Current Deployment Factor ({formData.progress}%)</label>
                  <input type="range" name="progress" min="0" max="100" value={formData.progress} onChange={handleChange} className="modern-range" />
                </div>

                <div className="status-chips">
                  {['Ongoing', 'Delayed', 'Completed'].map(stat => (
                    <button 
                      key={stat} type="button" 
                      className={`status-chip ${formData.status === stat ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, status: stat }))}
                    >
                      {stat === 'Ongoing' ? '⏳' : stat === 'Delayed' ? '⚠️' : '✅'} {stat}
                    </button>
                  ))}
                </div>

                <div className="input-row" style={{ marginTop: '1rem' }}>
                  <div className="input-group">
                    <label>Capital Allocated (in Crores)</label>
                    <input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="e.g., 25" className="modern-input" />
                  </div>
                  <div className="input-group">
                    <label>Expected Completion</label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="modern-input" />
                  </div>
                </div>
              </div>

              {/* DOCUMENTS & MEDIA BLOCK */}
              <div className="form-section">
                <h3>📎 Official Documentation</h3>
                <div className="mock-upload-zone">
                  <div className="upload-icon">📄</div>
                  <p>Drag & Drop verified DPRs, Tenders, or Approval PDFs</p>
                  <button type="button" className="upload-trigger-btn">Browse Local Storage</button>
                </div>
              </div>

              {/* APPROVAL WORKFLOW SECTION */}
              <div className="form-section approval-workflow-section">
                <div className="approval-header">
                  <h3>🏛️ Government Approval Pipeline</h3>
                  <div className="approval-override">
                    <span className="override-label">Demo Authority Override:</span>
                    <select value={approvalState} onChange={(e) => setApprovalState(e.target.value)} className="modern-input approval-override-select">
                      <option value="Submitted">Submitted 📨</option>
                      <option value="Under Review">Under Review 🏛️</option>
                      <option value="Approved">Approved ✅</option>
                    </select>
                  </div>
                </div>
                
                <div className="approval-stages">
                  <div className={`stage-step ${approvalProgress >= 30 ? 'active' : ''}`}>
                    <div className="stage-icon">📨</div>
                    <span>Submitted</span>
                  </div>
                  <div className={`stage-step ${approvalProgress >= 60 ? 'active' : ''}`}>
                    <div className="stage-icon">🏛️</div>
                    <span>Under Review</span>
                  </div>
                  <div className={`stage-step ${approvalProgress >= 100 ? 'active' : ''}`}>
                    <div className="stage-icon">✅</div>
                    <span>Approved</span>
                  </div>
                </div>

                <div className="approval-progress-track">
                  <div className="approval-progress-fill" style={{ width: `${approvalProgress}%` }}></div>
                </div>
                
                <p className={`approval-microcopy ${approvalState === 'Approved' ? 'success' : ''}`}>
                  {approvalState === 'Approved' 
                    ? '✨ Official parameters verified. Ready for public civic release.' 
                    : '⏳ Central mainframe locking deployment pending higher authority structural approvals.'}
                </p>
              </div>

              <div className="wizard-footer">
                <button type="submit" disabled={approvalState !== 'Approved'} className={`deploy-btn ${approvalState === 'Approved' ? 'ready ripple glow-effect' : 'locked'}`}>
                  {approvalState === 'Approved' ? 'Deploy to Live Server 🚀' : 'Deployment Locked 🔒'}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: PREVIEW & MANAGEMENT */}
          <div className="admin-aux-column">
            
            {/* LIVE PREVIEW PORTAL */}
            <div className="glass-panel preview-panel">
              <div className="panel-header">
                <h2>📱 Live Application Preview</h2>
                <div className="pulse-indicator"></div>
              </div>
              
              <div className="preview-mobile-frame">
                <div className="preview-card-capsule">
                   <div className="preview-top">
                     <span className={`preview-badge badge-${formData.category.split(' ')[0].toLowerCase()}`}>{formData.category}</span>
                     <span className={`preview-status stat-${formData.status.toLowerCase()}`}>{formData.status}</span>
                   </div>
                   <h3>{formData.name || 'Project Name'}</h3>
                   <p className="preview-authority">By {formData.authority || 'Assigned Authority'}</p>
                   
                   <div className="preview-progress">
                     <div className="prog-bar-bg">
                       <div className="prog-bar-fill" style={{ width: `${formData.progress}%` }}></div>
                     </div>
                     <span>{formData.progress}% Complete</span>
                   </div>
                   
                   <p className="preview-desc">{formData.description}</p>
                </div>
              </div>
            </div>

            {/* MANAGEMENT LIST */}
            <div className="glass-panel management-panel">
              <div className="panel-header">
                <h2>📋 Injected Coordinates Control</h2>
                <span className="count-badge">{customProjects.length} Active</span>
              </div>
              
              <div className="management-list">
                {customProjects.length === 0 ? (
                  <div className="management-empty">
                    <p>No external overrides deployed.</p>
                  </div>
                ) : (
                  customProjects.map(proj => (
                    <div className="management-card" key={proj.id}>
                      <div className="mc-left">
                        <h4>{proj.name}</h4>
                        <span className="mc-meta">{proj.category} • ₹{proj.budget} Crore</span>
                      </div>
                      <div className="mc-actions">
                        <button className="icon-btn edit">✏️</button>
                        <button className="icon-btn delete" onClick={() => deleteCustomProject(proj.id)}>🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Admin;
