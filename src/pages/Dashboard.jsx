import React, { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CivicMap from '../components/CivicMap';
import { ProjectContext } from '../context/ProjectContext';
import { isProjectInActiveGrid } from '../utils/gridUtils';

function Dashboard() {
  const [filter, setFilter] = useState('All');
  const [activeProject, setActiveProject] = useState(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  const { 
    userLocation, 
    activeExploreCenter,
    isDefaultLocation, 
    areaName,
    gridKm,
    setGridKm,
    projectsData, 
    isLocating, 
    fetchLocation,
    exploreLocation,
    resetToUserLocation
  } = useContext(ProjectContext);

  const [showLoading, setShowLoading] = useState(isLocating);
  const [fadeLoading, setFadeLoading] = useState(false);

  useEffect(() => {
    if (!isLocating && showLoading) {
      setFadeLoading(true);
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 500); // wait for fadeOut animation finish
      return () => clearTimeout(timer);
    } else if (isLocating) {
      setShowLoading(true);
      setFadeLoading(false);
    }
  }, [isLocating, showLoading]);

  // Center on explored location if set, otherwise user's location
  const activeCenter = activeExploreCenter || userLocation; 

  const filteredProjects = useMemo(() => {
    if (!activeCenter) return [];

    // Filter projects within the active ward grid sector of the selected gridKm size
    let filtered = projectsData.filter(p => 
      isProjectInActiveGrid(p.lat, p.lng, activeCenter[0], activeCenter[1], gridKm)
    );

    if (filter !== 'All') {
      filtered = filtered.filter(p => p.category === filter);
    }
    return filtered;
  }, [filter, projectsData, activeCenter, gridKm]);

  const handleFilterClick = useCallback((f) => {
    setFilter(f);
    setActiveProject(null);
  }, []);

  const handleProjectClick = useCallback((project) => {
    setActiveProject(project);
    setIsMobileListOpen(true);
  }, []);

  const resetTargetRegion = () => {
    setActiveProject(null);
  };

  if (showLoading) {
    return (
      <div className={`smart-city-loader ${fadeLoading ? 'fade-out' : ''}`}>
        <div className="geo-grid-animation">
           <div className="grid-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block center-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block"></div>
           <div className="grid-block"></div>
        </div>
        <img src="/nagardarpan-logo.png" className="loader-logo-img" alt="NagarDarpan Official Logo" />
        <div className="loader-brand-text">नगरदर्पण</div>
        <div className="loader-subtitle">आपके आसपास हो रहे विकास को खोज रहे हैं...</div>
        <div className="loader-microcopy">Fetching live civic data...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <Link to="/" className="header-brand-link">
             <img src="/nagardarpan-logo.png" className="brand-logo-img" alt="NagarDarpan" />
             <h1 className="brand-title">NagarDarpan</h1>
          </Link>
          {activeProject ? (
            <span className="region-label" style={{ backgroundColor: '#EDF2F7', color: '#2D3748', border: '1px solid #CBD5E0' }}>
              Viewing: <strong>{activeProject.name}</strong>
            </span>
          ) : activeExploreCenter ? (
            <span className="region-label" style={{ backgroundColor: '#FEEBC8', color: '#7B341E', border: '1px solid #FBD38D', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Explored Ward: <strong>{areaName}</strong> ({gridKm}km Grid)</span>
              <button 
                type="button"
                onClick={resetToUserLocation} 
                style={{ background: '#DD6B20', color: '#FFF', border: 'none', borderRadius: '12px', padding: '2px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                title="Return to your local ward"
              >
                Reset to My Location
              </button>
            </span>
          ) : isDefaultLocation ? (
            <span className="region-label" style={{ backgroundColor: '#fed7d7', color: '#9b2c2c', borderColor: '#feb2b2' }}>
              Using default location ({areaName || 'Delhi'})
            </span>
          ) : (
            <span className="region-label" style={{ backgroundColor: '#c6f6d5', color: '#22543d', borderColor: '#9ae6b4' }}>
              Showing nearby projects ({areaName}) • {gridKm}km Ward
            </span>
          )}
        </div>
        
        <div className="header-right">
          <div className="filters">
            {['All', 'Roads', 'Hospitals', 'Bridges', 'Schools'].map(f => (
              <button 
                key={f} 
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => handleFilterClick(f)}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="header-actions">
            <button 
              className="action-btn location-btn" 
              onClick={() => { resetTargetRegion(); resetToUserLocation(); fetchLocation(); }}
              title="Go to My Location"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            
            <Link 
              to="/profile"
              className="action-btn profile-btn"
              title="Profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="main-content">
        <Sidebar 
          projects={filteredProjects} 
          onProjectClick={handleProjectClick} 
          activeProject={activeProject}
          isMobileOpen={isMobileListOpen}
          toggleMobileOpen={() => setIsMobileListOpen(!isMobileListOpen)}
        />
        <CivicMap 
          projects={filteredProjects} 
          userLocation={userLocation}
          activeCenter={activeCenter}
          activeExploreCenter={activeExploreCenter}
          activeProject={activeProject}
          gridKm={gridKm}
          onGridChange={setGridKm}
          onExploreLocation={exploreLocation}
          onResetLocation={resetToUserLocation}
          onProjectClick={handleProjectClick}
        />
      </div>
    </div>
  );
}

export default Dashboard;
