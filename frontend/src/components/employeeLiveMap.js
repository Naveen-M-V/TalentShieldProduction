import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const EmployeeMap = ({ latitude, longitude }) => {
  const mapContainer = useRef(null);
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !latitude || !longitude) return;

    setMapError(false);
    setMapLoaded(false);

    try {
      // Use a reliable OSM style that doesn't require API keys
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles'
            }
          ]
        },
        center: [longitude, latitude],
        zoom: 15,
        pitch: 0,
        bearing: 0,
      });

      // Add navigation control
      map.addControl(new maplibregl.NavigationControl());

      // Add marker for employee location
      const marker = new maplibregl.Marker({ 
        color: "#dc2626",
        scale: 1.2
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      // Add popup for the marker
      const popup = new maplibregl.Popup({ 
        offset: 30,
        closeButton: false
      }).setHTML(`
        <div style="padding: 8px; font-family: system-ui;">
          <strong>Employee Location</strong><br/>
          Lat: ${latitude.toFixed(6)}<br/>
          Lng: ${longitude.toFixed(6)}
        </div>
      `);
      
      marker.setPopup(popup);

      // Handle map load error
      map.on('error', (e) => {
        console.error('MapLibre GL error:', e);
        setMapError(true);
      });

      // Ensure map loads properly
      map.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });

      return () => {
        map.remove();
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [latitude, longitude]);

  if (!latitude || !longitude) {
    return (
      <div 
        style={{ 
          width: "100%", 
          height: "400px", 
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
          color: "#6b7280",
          fontSize: "14px"
        }}
      >
        Location data not available
      </div>
    );
  }

  if (mapError) {
    return (
      <div 
        style={{ 
          width: "100%", 
          height: "400px", 
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fef2f2",
          color: "#dc2626",
          fontSize: "14px",
          padding: "20px",
          textAlign: "center"
        }}
      >
        <div style={{ marginBottom: "10px" }}>🗺️</div>
        <div><strong>Map Loading Error</strong></div>
        <div style={{ marginTop: "5px", fontSize: "12px" }}>
          Unable to load map tiles. Please check your internet connection.
        </div>
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280" }}>
          Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "400px" }}>
      {!mapLoaded && (
        <div 
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            color: "#6b7280",
            fontSize: "14px",
            zIndex: 1,
            borderRadius: "10px"
          }}
        >
          Loading map...
        </div>
      )}
      <div
        ref={mapContainer}
        style={{ width: "100%", height: "400px", borderRadius: "10px" }}
      />
    </div>
  );
};

export default EmployeeMap;
