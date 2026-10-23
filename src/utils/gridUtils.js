export const BASE_LAT_STEP = 0.009; // roughly 1km
export const BASE_LNG_STEP = 0.01;

export const getGridSteps = (gridKm = 1) => {
  const km = Math.max(1, Math.min(5, Number(gridKm) || 1));
  return {
    latStep: BASE_LAT_STEP * km,
    lngStep: BASE_LNG_STEP * km
  };
};

export const getBlockIndices = (lat, lng, gridKm = 1) => {
  const { latStep, lngStep } = getGridSteps(gridKm);
  return [Math.floor(lat / latStep), Math.floor(lng / lngStep)];
};

export const getBlockBounds = (lat, lng, gridKm = 1) => {
  const { latStep, lngStep } = getGridSteps(gridKm);
  const [latIdx, lngIdx] = getBlockIndices(lat, lng, gridKm);
  const minLat = latIdx * latStep;
  const maxLat = (latIdx + 1) * latStep;
  const minLng = lngIdx * lngStep;
  const maxLng = (lngIdx + 1) * lngStep;
  return [[minLat, minLng], [maxLat, maxLng]];
};

export const getBlockCenter = (lat, lng, gridKm = 1) => {
  const [[minLat, minLng], [maxLat, maxLng]] = getBlockBounds(lat, lng, gridKm);
  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
};

export const getBlockId = (lat, lng, gridKm = 1) => {
  const [latIdx, lngIdx] = getBlockIndices(lat, lng, gridKm);
  return `B-${gridKm}KM-${Math.abs(latIdx)}-${Math.abs(lngIdx)}`;
};

export const getActiveGridBounds = (centerLat, centerLng, gridKm = 1) => {
  const { latStep, lngStep } = getGridSteps(gridKm);
  const [cLatIdx, cLngIdx] = getBlockIndices(centerLat, centerLng, gridKm);
  
  const minLat = (cLatIdx - 1) * latStep;
  const maxLat = (cLatIdx + 2) * latStep; 
  const minLng = (cLngIdx - 1) * lngStep;
  const maxLng = (cLngIdx + 2) * lngStep;

  return { minLat, maxLat, minLng, maxLng };
};

export const isProjectInActiveGrid = (lat, lng, centerLat, centerLng, gridKm = 1) => {
  const [pLatIdx, pLngIdx] = getBlockIndices(lat, lng, gridKm);
  const [cLatIdx, cLngIdx] = getBlockIndices(centerLat, centerLng, gridKm);

  return Math.abs(pLatIdx - cLatIdx) <= 1 && Math.abs(pLngIdx - cLngIdx) <= 1;
};

export const generateVisibleGridRectangles = (centerLat, centerLng, gridKm = 1) => {
  const { latStep, lngStep } = getGridSteps(gridKm);
  const [cLatIdx, cLngIdx] = getBlockIndices(centerLat, centerLng, gridKm);
  const rectangles = [];
  
  // Grid array to cover the viewport seamlessly
  for (let latOffset = -4; latOffset <= 4; latOffset++) {
    for (let lngOffset = -4; lngOffset <= 4; lngOffset++) {
      const latGridIdx = cLatIdx + latOffset;
      const lngGridIdx = cLngIdx + lngOffset;
      
      const minLat = latGridIdx * latStep;
      const maxLat = (latGridIdx + 1) * latStep;
      const minLng = lngGridIdx * lngStep;
      const maxLng = (lngGridIdx + 1) * lngStep;
      
      rectangles.push({
        id: `grid-${gridKm}k-${latGridIdx}-${lngGridIdx}`,
        bounds: [[minLat, minLng], [maxLat, maxLng]],
        isActive: Math.abs(latOffset) <= 1 && Math.abs(lngOffset) <= 1 // Center 3x3 block is active
      });
    }
  }
  return rectangles;
};
