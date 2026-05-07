import React, { useState } from "react";
import axios from "../utils/axiosConfig";
import { buildApiUrl } from '../utils/apiConfig';

export default function AddLeaveModal({ employee, onClose, onSuccess }) {
  const [entitlementDays, setEntitlementDays] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentBalance, setCurrentBalance] = useState(null);

  React.useEffect(() => {
    fetchCurrentBalance();
  }, []);

  const fetchCurrentBalance = async () => {
    try {
      const userId = employee?._id;
      if (!userId) {
        console.error('AddLeaveModal: missing employee._id');
        return;
      }
      const response = await axios.get(buildApiUrl(`/leave/balances/current/${userId}`));
      if (response.data.success && response.data.data) {
        setCurrentBalance(response.data.data);
        setEntitlementDays(response.data.data.entitlementDays || 28);
      } else {
        setEntitlementDays(28);
      }
    } catch (err) {
      console.error('Failed to fetch current balance:', err);
      setEntitlementDays(28);
    }
  };

  const isValid = entitlementDays && Number(entitlementDays) > 0;

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
      
      const response = await axios.put(buildApiUrl(`/leave/admin/balance/${userId}`), {
        entitlementDays: Number(entitlementDays),
        carryOverDays: currentBalance?.carryOverDays || 0,
        reason: reason || `Annual leave entitlement updated to ${entitlementDays} days`
      });
      
      console.log('Annual leave entitlement updated:', response.data);
      alert('Annual leave entitlement updated successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update annual leave entitlement:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to update annual leave. Please try again.";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
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
          Update Annual Leave Entitlement
        </h2>
        <p className="text-gray-600 mb-6">
          Modify the total annual leave entitlement for {employee.name || (employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : "")}
        </p>
        
        {currentBalance && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Leave Balance</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Current Entitlement</p>
                <p className="font-semibold text-gray-900">{currentBalance.entitlementDays} days</p>
              </div>
              <div>
                <p className="text-gray-600">Used</p>
                <p className="font-semibold text-gray-900">{currentBalance.usedDays || 0} days</p>
              </div>
              <div>
                <p className="text-gray-600">Remaining</p>
                <p className="font-semibold text-gray-900">{(currentBalance.entitlementDays + (currentBalance.carryOverDays || 0) - (currentBalance.usedDays || 0))} days</p>
              </div>
            </div>
          </div>
        )}
        
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-700 text-[16px] mb-2 font-medium">Annual Leave Entitlement (Days per Year)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="50"
                className="w-full h-12 border border-[#c9d4df] rounded-lg pl-3 pr-10 text-[16px] placeholder-gray-400 focus:ring-2 focus:ring-blue-200"
                placeholder="e.g., 28"
                value={entitlementDays}
                onChange={e => setEntitlementDays(e.target.value)}
                autoComplete="off"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">days</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">UK standard is 28 days including bank holidays</p>
          </div>
          <div>
            <label className="block text-gray-700 text-[16px] mb-2 font-medium">Reason for Change (Optional)</label>
            <textarea
              className="w-full min-h-[80px] h-24 border border-[#c9d4df] rounded-lg px-3 py-2 text-[16px] placeholder-gray-400 focus:ring-2 focus:ring-blue-200 resize-none"
              placeholder="Reason for updating annual leave entitlement..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`h-12 px-8 rounded-lg text-[16px] font-medium transition-colors ${isValid && !loading ? 'bg-[#d0d8df] text-gray-700 hover:bg-[#bfc9d6]' : 'bg-[#e9ecf0] text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? 'Updating...' : 'Update Entitlement'}
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
