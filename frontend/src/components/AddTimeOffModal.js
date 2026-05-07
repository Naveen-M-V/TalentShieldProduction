import React, { useState } from "react";
import axios from "../utils/axiosConfig";
import { useAlert } from "./AlertNotification";
import { buildApiUrl } from '../utils/apiConfig';

export default function AddTimeOffModal({ employee, onClose, onSuccess }) {
  const { success, error: showError } = useAlert();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = startDate && endDate && reason.length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const userId = employee?._id;
      if (!userId) {
        setError('Employee ID is missing');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(buildApiUrl('/leave/employee-hub/annual-leave'), {
        employeeId: userId,
        startDate: startDate,
        endDate: endDate,
        reason: reason
      });
      
      console.log('Time off created:', response.data);
      success('Time off added successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to add time off:', err);
      console.error('Error response:', err.response?.data);
      const isOverlapConflict = err.response?.status === 409 && err.response?.data?.conflictType === 'overlap';
      const errorMessage = isOverlapConflict
        ? err.response?.data?.message || 'An existing leave entry overlaps with the requested dates.'
        : err.response?.data?.message || err.response?.data?.error || "Failed to add time off. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-30" style={{paddingLeft: 100}}>
      <div className="bg-white rounded-lg shadow-xl border border-[#c9d4df] mt-16 w-full max-w-2xl p-10 relative">
        <h2 className="text-[2rem] font-bold text-gray-900 mb-8 text-left">
          Add Time Off
        </h2>
        <p className="text-gray-600 mb-6">
          Create a pre-approved leave record for {employee.name || (employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : "")}
        </p>
        
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-700 text-[16px] mb-2 font-medium">Start Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full h-12 border border-[#c9d4df] rounded-lg pl-3 pr-3 text-[16px] focus:ring-2 focus:ring-blue-200"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-[16px] mb-2 font-medium">End Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full h-12 border border-[#c9d4df] rounded-lg pl-3 pr-3 text-[16px] focus:ring-2 focus:ring-blue-200"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-[16px] mb-2 font-medium">Reason <span className="text-red-500">*</span></label>
            <textarea
              className="w-full min-h-[80px] h-24 border border-[#c9d4df] rounded-lg px-3 py-2 text-[16px] placeholder-gray-400 focus:ring-2 focus:ring-blue-200 resize-none"
              placeholder="Reason for time off (minimum 10 characters)..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/10 characters minimum
            </p>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`h-12 px-8 rounded-lg text-[16px] font-medium transition-colors ${isValid && !loading ? 'bg-[#d0d8df] text-gray-700 hover:bg-[#bfc9d6]' : 'bg-[#e9ecf0] text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? 'Adding...' : 'Add Time Off'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-8 border-2 border-[#e00070] text-[#e00070] rounded-lg font-medium text-[16px] bg-white hover:bg-[#fbeaf3] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
