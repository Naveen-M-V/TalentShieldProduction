import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { buildApiUrl } from '../utils/apiConfig';

export default function StaffDetail() {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaffDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(buildApiUrl(`/employees/${id}`));
        if (response.data.success) {
          const employee = response.data.data;
          setStaff({
            firstname: employee.firstName,
            lastname: employee.lastName,
            email: employee.email,
            company: employee.company || 'N/A',
            jobTitle: employee.jobTitle,
            role: employee.role,
            jobLevel: employee.jobLevel || 'N/A'
          });
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
        setError('Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };
    fetchStaffDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !staff) {
    return <div className="p-6 text-red-600">{error || 'Employee not found'}</div>;
  }

  return (
    <div className="p-6">
      <Link to="/dashboard/sharestaff" className="text-blue-600 underline mb-4 block">
        ← Back to Staff List
      </Link>

      <h1 className="text-2xl font-bold mb-4">
        {staff.firstname} {staff.lastname}
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {/* User Details */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold mb-2">User Details</h2>
          <p><strong>Staff ID:</strong> {id}</p>
          <p><strong>Email:</strong> {staff.email}</p>
          <p><strong>Company:</strong> {staff.company}</p>
        </div>

        {/* Job Details */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Job, Team & Training</h2>
          <p><strong>Role:</strong> {staff.role}</p>
          <p><strong>Job Title:</strong> {staff.jobTitle}</p>
          <p><strong>Job Level:</strong> {staff.jobLevel}</p>
        </div>

        {/* Compliance Summary */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Compliance Summary</h2>
          <p>No applicable compliance matrix found.</p>
        </div>
      </div>

      {/* Training Certificates */}
      <div className="mt-6 p-4 border rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Active Training Certificates</h2>
        <p>No data available in table.</p>
      </div>
    </div>
  );
}
