import React, { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosConfig';
import { X, Download, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const ExpenseDetailsModal = ({ id, onClose, onUpdated, showActions }) => {
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAdmin = user && (user.role === 'admin' || user.role === 'super-admin');
  const canShowActions = typeof showActions === 'boolean' ? showActions : isAdmin;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/expenses/${id}`);
      setExpense(res.data);
    } catch (err) {
      console.error('Failed to load expense', err);
      setError(err.response?.data?.message || 'Failed to load expense');
    } finally {
      setLoading(false);
    }
  };

  // Initialize or update map when expense and route points are available
  useEffect(() => {
    if (!expense || !expense.mileage || !expense.mileage.routePoints || !mapContainerRef.current) return;
    const points = expense.mileage.routePoints;
    if (!Array.isArray(points) || points.length === 0) return;

    // Convert points to [lng, lat] array for GeoJSON
    const coordinates = points.map(p => {
      if (Array.isArray(p) && p.length >= 2) return [p[1], p[0]]; // [lat, lng] -> [lng, lat]
      if (p.lng !== undefined && p.lat !== undefined) return [p.lng, p.lat];
      if (p.longitude !== undefined && p.latitude !== undefined) return [p.longitude, p.latitude];
      return null;
    }).filter(Boolean);
    if (coordinates.length === 0) return;

    // create map only once
    try {
      if (mapRef.current) {
        // remove existing route layer/source if present
        const map = mapRef.current;
        if (map.getSource('route')) {
          if (map.getLayer('route-line')) map.removeLayer('route-line');
          map.removeSource('route');
        }
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates } } });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 4 }
        });
        const lats = coordinates.map(c => c[1]);
        const lngs = coordinates.map(c => c[0]);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, maxZoom: 16 });
        return;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256
            }
          },
          layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm-tiles' }]
        },
        center: coordinates[0],
        zoom: 12
      });

      map.addControl(new maplibregl.NavigationControl());

      map.on('load', () => {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates } } });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 4 }
        });
        const lats = coordinates.map(c => c[1]);
        const lngs = coordinates.map(c => c[0]);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, maxZoom: 16 });
      });

      mapRef.current = map;

      return () => {
        try { map.remove(); } catch (e) { /* ignore */ }
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Map init error', err);
    }
  }, [expense]);

  const handleApprove = async () => {
    if (!window.confirm('Approve this expense?')) return;
    try {
      await axios.post(`/api/expenses/${id}/approve`);
      onUpdated && onUpdated();
      onClose && onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleDecline = async () => {
    const reason = window.prompt('Reason for declining:');
    if (!reason) return;
    try {
      await axios.post(`/api/expenses/${id}/decline`, { reason });
      onUpdated && onUpdated();
      onClose && onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to decline');
    }
  };

  if (!id) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-3 sm:p-6" style={{ zIndex: 99999 }}>
      <div className="w-full max-w-3xl bg-white rounded-lg shadow max-h-[90vh] flex flex-col" style={{ zIndex: 100000 }}>
        <div className="flex items-center justify-between p-4 border-b flex-none">
          <h3 className="text-lg font-semibold">Expense details</h3>
          <button onClick={() => onClose && onClose()} className="p-2 text-gray-600 hover:text-gray-800">
            <X />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : expense ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Claim type</div>
                  <div className="font-medium">{expense.claimType === 'receipt' ? 'Receipts' : 'Mileage'}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-medium">{expense.category}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="font-medium">{expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : ''}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Submitted by</div>
                  <div className="font-medium">{expense.submittedBy ? `${expense.submittedBy.firstName} ${expense.submittedBy.lastName}` : ''}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Tax</div>
                  <div className="font-medium">{expense.tax || 0}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-medium">{expense.currency || ''} {expense.totalAmount != null ? Number(expense.totalAmount).toFixed(2) : ''}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Notes</div>
                <div className="mt-1 text-gray-800 whitespace-pre-wrap">{expense.notes || '—'}</div>
              </div>

              {expense.claimType === 'receipt' && (
                <div>
                  <div className="text-sm text-gray-500">Supplier</div>
                  <div className="font-medium">{expense.supplier || '—'}</div>
                </div>
              )}

              {expense.claimType === 'mileage' && (
                <div>
                  <div className="text-sm text-gray-500">Distance</div>
                  <div className="font-medium">{expense.mileage && expense.mileage.calculatedDistance ? `${(expense.mileage.calculatedDistance/1000).toFixed(2)} km (${expense.mileage.unit || 'miles'})` : (expense.mileage && expense.mileage.distance ? `${expense.mileage.distance} ${expense.mileage.unit || 'miles'}` : '—')}</div>
                </div>
              )}

              {/* Attachments or route */}
              <div>
                <div className="text-sm text-gray-500">Attachments / Route</div>
                <div className="mt-2 space-y-2">
                  {expense.attachments && expense.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {expense.attachments.map(att => (
                        <a key={att._id} href={`/api/expenses/${expense._id}/attachments/${att._id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                          <Download />
                          <span className="text-sm truncate">{att.fileName}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {expense.claimType === 'mileage' && expense.mileage && (
                    <div className="w-full h-48 bg-gray-100 rounded overflow-hidden">
                      {expense.mileage.routePoints && expense.mileage.routePoints.length > 0 ? (
                        <div ref={mapContainerRef} className="w-full h-48" />
                      ) : process.env.REACT_APP_GOOGLE_MAPS_STATIC_KEY && expense.mileage.overviewPolyline ? (
                        <img alt="route" className="w-full h-full object-cover" src={`https://maps.googleapis.com/maps/api/staticmap?size=600x300&scale=2&path=enc:${encodeURIComponent(expense.mileage.overviewPolyline)}&key=${process.env.REACT_APP_GOOGLE_MAPS_STATIC_KEY}`} />
                      ) : (
                        <div className="flex items-center justify-center h-48 text-sm text-gray-500"><MapPin /> Route available (enable static map key or supply routePoints)</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Info */}
              {expense.employee && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-500">Employee</div>
                  <div className="font-medium">{expense.employee.firstName} {expense.employee.lastName} {expense.employee.employeeId ? `(${expense.employee.employeeId})` : ''}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => onClose && onClose()} className="px-4 py-2 border rounded">Close</button>
                {canShowActions && expense.status === 'pending' && (
                  <>
                    <button onClick={handleDecline} className="px-4 py-2 bg-red-600 text-white rounded">Decline</button>
                    <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded">Approve</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div>No data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailsModal;
