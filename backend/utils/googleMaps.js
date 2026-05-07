const axios = require('axios');
const polyline = require('@mapbox/polyline');

async function getRouteInfoFromDestinations(destinations = [], apiKey) {
  if (!apiKey) throw new Error('Google Maps API key required');
  if (!Array.isArray(destinations) || destinations.length < 2) {
    throw new Error('At least two destinations required to calculate route');
  }

  // Build origin, destination and waypoints
  const origin = encodeURIComponent(destinations[0].address || `${destinations[0].latitude},${destinations[0].longitude}`);
  const destination = encodeURIComponent(destinations[destinations.length - 1].address || `${destinations[destinations.length - 1].latitude},${destinations[destinations.length - 1].longitude}`);

  let waypoints = '';
  if (destinations.length > 2) {
    const mids = destinations.slice(1, -1).map(d => encodeURIComponent(d.address || `${d.latitude},${d.longitude}`));
    waypoints = mids.join('|');
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&key=${apiKey}`;

  const resp = await axios.get(url, { timeout: 10000 });
  if (!resp || !resp.data) throw new Error('No response from Directions API');

  const data = resp.data;
  if (data.status !== 'OK') {
    const msg = data.error_message || data.status;
    const error = new Error(`Directions API failed: ${msg}`);
    error.details = data;
    throw error;
  }

  // Sum distances across legs
  let totalMeters = 0;
  const route = data.routes && data.routes[0];
  if (!route) throw new Error('No route found');

  (route.legs || []).forEach(leg => {
    if (leg.distance && leg.distance.value) totalMeters += leg.distance.value;
  });

  const overviewPolyline = route.overview_polyline ? route.overview_polyline.points : null;
  const decoded = overviewPolyline ? polyline.decode(overviewPolyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng })) : [];

  return {
    totalMeters,
    overviewPolyline,
    decoded
  };
}

module.exports = { getRouteInfoFromDestinations };
