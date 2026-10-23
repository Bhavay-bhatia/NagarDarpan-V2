import React from 'react';
import { Rectangle } from 'react-leaflet';
import { generateVisibleGridRectangles } from '../utils/gridUtils';

const MapGrid = ({ activeCenter, gridKm = 1 }) => {
  if (!activeCenter) return null;

  const rectangles = generateVisibleGridRectangles(activeCenter[0], activeCenter[1], gridKm);

  return (
    <>
      {/* Seamless viewable 11x11 Grid rendering layering softly over the city map */}
      {rectangles.map(rect => (
        <Rectangle 
          key={rect.id}
          bounds={rect.bounds}
          pathOptions={
            rect.isActive 
                ? { // Subtle active center 3x3 boundaries
                  color: '#4299E1', 
                  weight: 1.5,
                  opacity: 0.6,
                  fillColor: '#EBF8FF',
                  fillOpacity: 0.15,
                  interactive: false,
                  className: 'grid-rect-transition'
                }
              : { // Faded inactive extended area grids
                  color: '#A0AEC0', 
                  weight: 1,
                  opacity: 0.25,
                  fillOpacity: 0,
                  interactive: false,
                  className: 'grid-rect-transition'
                }
          }
        />
      ))}
    </>
  );
};

export default MapGrid;
