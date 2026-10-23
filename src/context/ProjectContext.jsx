import React, { createContext, useState, useEffect, useRef } from 'react';
import { projectsData as mockProjects } from '../data/mockProjects';

export const ProjectContext = createContext();

const FALLBACK_CENTER = [28.6139, 77.2090]; // Delhi

// -------------------------------------------------------------------
// DYNAMIC MOCK DATA GENERATION ENGINE
// -------------------------------------------------------------------

const fetchAreaName = async (lat, lng) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return data.locality || data.city || data.principalSubdivision || "Local District";
    }
  } catch {
    // Fallback
  }
  return "Local District";
};

const PROJECT_TYPES = ["Roads", "Hospitals", "Bridges", "Schools", "Drainage"];
const AUTHORITIES = ["PWD", "Municipal Corp", "NHAI", "Ministry of Health", "DDA"];
const STATUSES = ["Ongoing", "Ongoing", "Completed", "Delayed"];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];

const generateProjectName = (category, areaName) => {
  const roadSuffixes = ["Road Upgrade", "Redevelopment Phase 2", "Expressway Expansion", "Resurfacing"];
  const hospSuffixes = ["General Hospital", "Health Center", "Clinic Extension"];
  const bridgeSuffixes = ["Overpass", "Suspension Bridge", "Elevated Walkway"];
  const schoolSuffixes = ["Primary School Renovation", "Smart Classrooms", "Secondary Academy"];
  const drainSuffixes = ["Drainage Fix", "Storm Water Drain", "Sewage Treatment"];

  if (category === "Roads") return `${areaName} ${getRandomItem(roadSuffixes)}`;
  if (category === "Hospitals") return `${areaName} ${getRandomItem(hospSuffixes)}`;
  if (category === "Bridges") return `${areaName} ${getRandomItem(bridgeSuffixes)}`;
  if (category === "Schools") return `${areaName} ${getRandomItem(schoolSuffixes)}`;
  if (category === "Drainage") return `${areaName} ${getRandomItem(drainSuffixes)}`;
  return `${areaName} Infrastructure Work`;
};

export const generateDynamicProjects = async (centerLat, centerLng, gridKm = 1) => {
  const km = Math.max(1, Math.min(5, Number(gridKm) || 1));
  const areaName = await fetchAreaName(centerLat, centerLng);
  // Scale project count with gridKm: 1km -> 8-10, 2km -> 12-15, 3km -> 15-20, 5km -> 22-30
  const minProjects = 6 + (km * 3);
  const maxProjects = 10 + (km * 4);
  const numProjects = getRandomInt(minProjects, maxProjects);
  const projects = [];

  const maxLatOffset = 0.007 * km;
  const maxLngOffset = 0.008 * km;

  for (let i = 0; i < numProjects; i++) {
    const category = getRandomItem(PROJECT_TYPES);
    // Keep offsets tightly inside the active 3x3 grid for the selected km
    const latOffset = (Math.random() * (maxLatOffset * 2)) - maxLatOffset; 
    const lngOffset = (Math.random() * (maxLngOffset * 2)) - maxLngOffset; 
    
    projects.push({
      id: `dyn_${Date.now()}_${i}`,
      name: generateProjectName(category, areaName),
      category: category,
      authority: getRandomItem(AUTHORITIES),
      startDate: getRandomDate(new Date(2022, 0, 1), new Date()),
      endDate: getRandomDate(new Date(), new Date(2026, 11, 31)),
      description: `Comprehensive ${category.toLowerCase()} development assigned to improve local infrastructure efficiency across ${areaName}.`,
      status: getRandomItem(STATUSES),
      progress: getRandomInt(20, 100),
      budget: getRandomInt(10, 500),
      blockId: `B-${km}K-${Math.abs(Math.floor((centerLat + latOffset) * 100))}-${Math.abs(Math.floor((centerLng + lngOffset) * 100))}`,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset
    });
  }
  return { projects, areaName };
};

// IP geolocation fallback helper for desktop browsers without GPS
const fetchLocationByIP = async () => {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || data.region || "Local Area"
        };
      }
    }
  } catch {
    // try secondary
  }
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || data.region || "Local Area"
        };
      }
    }
  } catch {
    // fallback
  }
  return null;
};

// -------------------------------------------------------------------
// CONTEXT PROVIDER LAYER
// -------------------------------------------------------------------

export const ProjectProvider = ({ children }) => {
  const [userLocation, setUserLocation] = useState(FALLBACK_CENTER);
  const [activeExploreCenter, setActiveExploreCenter] = useState(null);
  const [isDefaultLocation, setIsDefaultLocation] = useState(true);
  const [areaName, setAreaName] = useState('Delhi');
  const [gridKm, setGridKm] = useState(1);
  const [projectsData, setProjectsData] = useState(mockProjects);
  const [isLocating, setIsLocating] = useState(false);

  const sanitizeProjects = (projectsArr) => {
    if (!Array.isArray(projectsArr)) return [];
    return projectsArr.map(p => ({
      ...p,
      category: p.category || p.type || 'Roads',
      endDate: p.endDate || p.expectedCompletion || '2024-12-31',
      status: p.status || 'Ongoing',
      name: p.name || 'Unnamed Project'
    }));
  };

  const [customProjects, setCustomProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('projects');
      return stored ? sanitizeProjects(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'projects') {
        try {
          const newData = e.newValue ? sanitizeProjects(JSON.parse(e.newValue)) : [];
          setCustomProjects(newData);
        } catch (err) {
          console.error("Storage sync parse error", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addCustomProject = (project) => {
    const existing = customProjects || [];
    const updated = [project, ...existing];
    setCustomProjects(updated);
    localStorage.setItem('projects', JSON.stringify(updated));
  };

  const deleteCustomProject = (id) => {
    const existing = customProjects || [];
    const updated = existing.filter(p => p.id !== id);
    setCustomProjects(updated);
    localStorage.setItem('projects', JSON.stringify(updated));
  };

  const fetchAndSetProjects = async (lat, lng, isDefault, currentKm = gridKm) => {
    try {
      setIsLocating(true);
      const { projects: freshProjects, areaName: resolvedArea } = await generateDynamicProjects(lat, lng, currentKm);
      setAreaName(resolvedArea || "Local Area");
      
      const distFromDelhi = Math.hypot(lat - FALLBACK_CENTER[0], lng - FALLBACK_CENTER[1]);
      let combined = freshProjects;
      if (distFromDelhi < 0.2) {
        combined = [...mockProjects, ...freshProjects.slice(0, 3)];
      }
      setProjectsData(combined);
      setUserLocation([lat, lng]);
      setIsDefaultLocation(isDefault);
    } catch (err) {
      console.warn("fetchAndSetProjects error:", err);
      setUserLocation([lat, lng]);
      setIsDefaultLocation(isDefault);
    } finally {
      setIsLocating(false);
    }
  };

  const exploreLocation = async (lat, lng, customName = null, currentKm = gridKm) => {
    try {
      setIsLocating(true);
      const { projects: freshProjects, areaName: resolvedArea } = await generateDynamicProjects(lat, lng, currentKm);
      setAreaName(customName || resolvedArea || "Explored Area");
      setProjectsData(freshProjects);
      setActiveExploreCenter([lat, lng]);
    } catch (err) {
      console.warn("exploreLocation error:", err);
    } finally {
      setIsLocating(false);
    }
  };

  const resetToUserLocation = () => {
    setActiveExploreCenter(null);
    if (userLocation) {
      fetchAndSetProjects(userLocation[0], userLocation[1], isDefaultLocation, gridKm);
    }
  };

  const updateGridSize = (newKm) => {
    const km = Math.max(1, Math.min(5, Number(newKm) || 1));
    setGridKm(km);
    const target = activeExploreCenter || userLocation || FALLBACK_CENTER;
    if (activeExploreCenter) {
      exploreLocation(target[0], target[1], areaName, km);
    } else {
      fetchAndSetProjects(target[0], target[1], isDefaultLocation, km);
    }
  };

  const fetchLocation = async () => {
    setIsLocating(true);
    let resolved = false;

    const resolveWith = async (lat, lng, isDefault) => {
      if (resolved) return;
      resolved = true;
      setActiveExploreCenter(null);
      await fetchAndSetProjects(lat, lng, isDefault, gridKm);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          resolveWith(position.coords.latitude, position.coords.longitude, false);
        },
        async (error) => {
          console.warn("Browser GPS unavailable or denied. Falling back to IP Geolocation:", error);
          const ipLoc = await fetchLocationByIP();
          if (ipLoc) {
            resolveWith(ipLoc.lat, ipLoc.lng, false);
          } else {
            resolveWith(FALLBACK_CENTER[0], FALLBACK_CENTER[1], true);
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );

      // Safety timeout in case browser permission prompt is ignored or hangs
      setTimeout(async () => {
        if (!resolved) {
          const ipLoc = await fetchLocationByIP();
          if (ipLoc) {
            resolveWith(ipLoc.lat, ipLoc.lng, false);
          } else {
            resolveWith(FALLBACK_CENTER[0], FALLBACK_CENTER[1], true);
          }
        }
      }, 5500);
    } else {
      const ipLoc = await fetchLocationByIP();
      if (ipLoc) {
        resolveWith(ipLoc.lat, ipLoc.lng, false);
      } else {
        resolveWith(FALLBACK_CENTER[0], FALLBACK_CENTER[1], true);
      }
    }
  };

  const initAttempted = useRef(false);
  useEffect(() => {
    if (!initAttempted.current) {
      initAttempted.current = true;
      fetchLocation();
    }
  }, []);

  const activeProjectsList = [...(customProjects || []), ...projectsData];

  return (
    <ProjectContext.Provider value={{
      userLocation,
      activeExploreCenter,
      isDefaultLocation,
      areaName,
      gridKm,
      setGridKm: updateGridSize,
      projectsData: activeProjectsList,
      customProjects: customProjects || [],
      addCustomProject,
      deleteCustomProject,
      isLocating,
      fetchLocation,
      exploreLocation,
      resetToUserLocation
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

