import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserCircleIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const ManagerTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [membersRes, summaryRes] = await Promise.all([
        axios.get('/api/manager/team/members?includeIndirect=true'),
        axios.get('/api/manager/team/summary')
      ]);

      setMembers(Array.isArray(membersRes?.data?.data) ? membersRes.data.data : []);
      setSummary(summaryRes?.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;

    const q = searchTerm.toLowerCase();
    return members.filter((member) => {
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q)
        || String(member.email || '').toLowerCase().includes(q)
        || String(member.department || '').toLowerCase().includes(q)
        || String(member.role || '').toLowerCase().includes(q)
      );
    });
  }, [members, searchTerm]);

  const totalMembers = summary?.teamSize ?? members.length;
  const activeMembers = summary?.activeMembers ?? members.filter((m) => m.isActive !== false).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-sm text-gray-600 mt-1">Team members visible in your reporting hierarchy</p>
        </div>
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalMembers}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
              <UsersIcon className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeMembers}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-2">
              <CheckCircleIcon className="h-5 w-5 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Departments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(members.map((m) => m.department).filter(Boolean)).size}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-2">
              <BuildingOffice2Icon className="h-5 w-5 text-violet-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, department, role..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-tight text-gray-500">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-tight text-gray-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-tight text-gray-500">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-tight text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-tight text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-tight text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No team members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div>{member.firstName} {member.lastName}</div>
                          <div className="text-xs text-gray-500">{member.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                        {member.jobTitle || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.role || 'employee'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold border ${member.isActive === false ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {member.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/manager/employee/${member._id}`)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerTeam;
