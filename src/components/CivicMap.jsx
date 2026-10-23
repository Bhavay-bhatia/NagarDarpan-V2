import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import MapGrid from './MapGrid';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function MapController({ center, zoom }) {
  const map = useMap();
  const prevCenterRef = useRef(null);
  
  useEffect(() => {
    if (center && map) {
      const prev = prevCenterRef.current;
      if (!prev || Math.abs(prev[0] - center[0]) > 0.0001 || Math.abs(prev[1] - center[1]) > 0.0001) {
        map.flyTo(center, zoom, { duration: 1.2 });
        prevCenterRef.current = center;
      }
    }
  }, [center, zoom, map]);

  return null;
}

function MapMoveDetector({ onPanChange }) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const c = map.getCenter();
      onPanChange([c.lat, c.lng]);
    }
  });
  return null;
}

const getCustomIcon = (category, isActive = false) => {
  const typeClass = category.toLowerCase();
  const activeClass = isActive ? 'marker-active' : '';
  
  return L.divIcon({
    className: `custom-html-icon ${activeClass}`,
    html: `<div class="marker-pin marker-${typeClass}"></div>`,
    iconSize: isActive ? [32, 32] : [24, 24],
    iconAnchor: isActive ? [16, 16] : [12, 12],
    popupAnchor: [0, -15]
  });
};

const POPULAR_HUBS = [
  { name: 'Noida', lat: 28.5355, lng: 77.3910 },
  { name: 'Greater Noida', lat: 28.4961, lng: 77.5360 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 }
];

const CivicMap = ({ 
  projects, 
  userLocation, 
  activeCenter, 
  activeExploreCenter, 
  activeProject, 
  gridKm = 1, 
  onGridChange, 
  onExploreLocation, 
  onResetLocation, 
  onProjectClick 
}) => {
  const [mount, setMount] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => setMount(true), []);

  const handlePanChange = useCallback((newCenter) => {
    setMapCenter(newCenter);
  }, []);

  if (!mount || !userLocation || !activeCenter) return null;

  const centerToUse = activeProject 
    ? [activeProject.lat, activeProject.lng] 
    : (activeExploreCenter || userLocation);
  const zoomLevel = activeProject ? 15 : (gridKm > 2 ? 12 : 13);

  // Check if map has been panned away from active center
  const isPannedAway = mapCenter && (
    Math.hypot(mapCenter[0] - activeCenter[0], mapCenter[1] - activeCenter[1]) > (0.012 * gridKm)
  );

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const placeName = data[0].display_name.split(',')[0] || searchQuery;
          if (onExploreLocation) {
            onExploreLocation(lat, lng, placeName);
          }
          setSearchQuery('');
        } else {
          setSearchError('Place not found in India. Try another city or sector.');
          setTimeout(() => setSearchError(''), 4000);
        }
      }
    } catch (err) {
      console.warn("Place search failed", err);
      setSearchError('Search network error. Please try again.');
      setTimeout(() => setSearchError(''), 4000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickHub = (hub) => {
    if (onExploreLocation) {
      onExploreLocation(hub.lat, hub.lng, hub.name);
    }
  };

  return (
    <div className="map-view" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Google Maps-style Search Bar & Quick Location Chips */}
      <div className="map-search-overlay" style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '380px',
        width: 'calc(100% - 32px)',
        pointerEvents: 'auto'
      }}>
        <form onSubmit={handleSearch} style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          borderRadius: '8px',
          padding: '6px 12px',
          border: '1px solid #E2E8F0',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '1rem', marginRight: '8px', color: '#718096' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search any city, sector, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              color: '#2D3748',
              fontFamily: 'inherit'
            }}
          />
          <button 
            type="submit" 
            disabled={isSearching}
            style={{
              background: '#2B6CB0',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '6px'
            }}
          >
            {isSearching ? '...' : 'Explore'}
          </button>
        </form>

        {searchError && (
          <div style={{
            background: '#FFF5F5',
            color: '#C53030',
            fontSize: '0.78rem',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #FEB2B2'
          }}>
            {searchError}
          </div>
        )}

        {/* Quick Hub Chips */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}>
          {POPULAR_HUBS.map(hub => (
            <button
              key={hub.name}
              type="button"
              onClick={() => handleQuickHub(hub)}
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid #CBD5E0',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#2D3748',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
              }}
            >
              📍 {hub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Variable Grid Size Selector (1km to 5km) */}
      <div className="map-grid-selector-overlay" style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.98)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        borderRadius: '8px',
        padding: '6px 10px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backdropFilter: 'blur(8px)'
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4A5568' }}>📐 Grid:</span>
        {[1, 2, 3, 5].map(km => (
          <button
            key={km}
            type="button"
            onClick={() => onGridChange && onGridChange(km)}
            style={{
              border: gridKm === km ? '1px solid #2B6CB0' : '1px solid #CBD5E0',
              background: gridKm === km ? '#2B6CB0' : '#EDF2F7',
              color: gridKm === km ? '#FFFFFF' : '#2D3748',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={`Set Ward Grid Sector to ${km} km`}
          >
            {km} km
          </button>
        ))}
      </div>

      {/* Floating 'Explore Infrastructure in this Area' when panned away */}
      {isPannedAway && (
        <div style={{
          position: 'absolute',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}>
          <button
            type="button"
            onClick={() => onExploreLocation && onExploreLocation(mapCenter[0], mapCenter[1])}
            style={{
              background: '#2B6CB0',
              color: '#FFF',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(43, 108, 176, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <span>🔍</span> Explore Infrastructure Here
          </button>
        </div>
      )}

      {/* Floating Return to My Location when viewing another area */}
      {activeExploreCenter && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '20px',
          zIndex: 1000
        }}>
          <button
            type="button"
            onClick={onResetLocation}
            style={{
              background: '#FFFFFF',
              color: '#2B6CB0',
              border: '2px solid #2B6CB0',
              borderRadius: '24px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📍</span> Return to My Location
          </button>
        </div>
      )}

      {/* Core Map Rendering */}
      <MapContainer 
        center={userLocation} 
        zoom={13} 
        minZoom={4}
        maxZoom={20}
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <ZoomControl position="bottomright" />
        
        {/* OpenStreetMap with maxNativeZoom=19 to completely avoid 'Map data not available' */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={20}
          maxNativeZoom={19}
        />

        <MapGrid activeCenter={activeCenter} gridKm={gridKm} />

        <MapController center={centerToUse} zoom={zoomLevel} />
        <MapMoveDetector onPanChange={handlePanChange} />

        {/* User Physical Location (Always present on map) */}
        <Marker 
          position={userLocation} 
          icon={L.divIcon({
            className: 'user-location-icon',
            html: `<div class="user-position-wrapper">
                     <div class="user-position-pulse"></div>
                     <div class="user-position-arrow">
                       <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                         <path d="M12 2L22 20L12 17L2 20L12 2Z" />
                       </svg>
                     </div>
                   </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })}
        >
          <Popup><strong>📍 You are here (My Location)</strong></Popup>
        </Marker>

        {/* Explored Center Marker (if different from user's location) */}
        {activeExploreCenter && (
          <Marker
            position={activeExploreCenter}
            icon={L.divIcon({
              className: 'explored-location-icon',
              html: `<div style="background:#DD6B20; color:#FFF; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #FFF; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-size:14px; font-weight:bold;">🔍</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          >
            <Popup><strong>Explored Location Center ({gridKm}km Ward Grid)</strong></Popup>
          </Marker>
        )}

        {/* Dynamic Infrastructure Projects */}
        {projects.map(project => (
          <Marker 
            key={project.id} 
            position={[project.lat, project.lng]}
            icon={getCustomIcon(project.category, activeProject?.id === project.id)}
            eventHandlers={{ 
              click: () => onProjectClick && onProjectClick(project) 
            }}
          >
            <Popup className="custom-popup">
              <div className="popup-content">
                <span className={`popup-badge badge-${project.category.toLowerCase()}`}>
                  {project.category}
                </span>
                <h3>{project.name}</h3>
                <p className="short-desc">{project.description}</p>
                <div className={`status-badge status-${project.status.toLowerCase()}`}>
                  {project.status}
                </div>
                <Link to={`/project/${project.id}`} className="view-details-btn">
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CivicMap;
