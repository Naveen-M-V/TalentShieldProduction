// src/components/AdminCompletionBar.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfileCompleteness } from '../utils/profileCompleteness';
import { buildApiUrl } from '../utils/apiConfig';

export default function AdminCompletionBar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [percent, setPercent] = useState(0);
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const resp = await fetch(buildApiUrl('/my-profile'), {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          throw new Error('Unexpected response');
        }
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Failed to load profile');
        if (!mounted) return;
        const { percent, missing } = getProfileCompleteness(data);
        setPercent(percent);
        setMissing(missing);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const goToDetails = () => {
    navigate('/dashboard/admin-details');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-3 bg-emerald-500 animate-pulse" style={{ width: '50%' }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Loading admin details completeness...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-red-600">Failed to load admin details: {error}</p>
      </div>
    );
  }

  return (
    <button onClick={goToDetails} className="w-full text-left">
      <div className="bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Admin Details Completion</h3>
          <span className="text-sm font-medium text-emerald-700">{percent}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-3 bg-emerald-600" style={{ width: `${percent}%` }}></div>
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-gray-600 mt-2">Missing: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? '…' : ''}</p>
        )}
        <p className="text-xs text-emerald-700 mt-1">Click to complete your details</p>
      </div>
    </button>
  );
}
