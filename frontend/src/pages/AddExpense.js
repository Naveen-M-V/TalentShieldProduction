import React, { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Receipt, 
  Car, 
  Plus, 
  FileText,
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import ModernDatePicker from '../components/ModernDatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAlert } from '../components/AlertNotification';

const AddExpense = ({ embed = false, initialType = 'receipt', onClose = null, expenseId = null }) => {
  const navigate = useNavigate();
  const { success, error: showError } = useAlert();
  const [claimType, setClaimType] = useState(initialType || 'receipt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common fields
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    currency: 'GBP',
    tax: '',
    totalAmount: 0,
    categorySelection: 'Travel',
    categoryOther: '',
    tags: '',
    notes: '',
    // Receipt-specific
    supplier: '',
    receiptValue: '',
    // Mileage-specific
    mileage: {
      distance: '',
      unit: 'miles',
      ratePerUnit: '0.45',
      destinations: [{ address: '', latitude: null, longitude: null, order: 0 }],
      routePoints: []
    }
  });

  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (!expenseId) return;

    const loadExpenseForEdit = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/expenses/${expenseId}`);
        const expense = response.data;

        if (!expense) {
          setError('Expense not found');
          return;
        }

        if (expense.status !== 'pending') {
          setError('Only pending expense claims can be edited.');
          return;
        }

        const loadedClaimType = expense.claimType || initialType || 'receipt';
        setClaimType(loadedClaimType);

        setFormData((prev) => ({
          ...prev,
          date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : prev.date,
          currency: expense.currency || prev.currency,
          tax: expense.tax !== undefined && expense.tax !== null ? String(expense.tax) : '',
          totalAmount: Number(expense.totalAmount || 0),
          // Preserve known categories; if unknown, treat as 'Other' and store the custom value in categoryOther
          categorySelection: ['Travel','Meals','Accommodation','Equipment','Training','Other','Mileage'].includes(expense.category)
            ? (expense.category || (loadedClaimType === 'mileage' ? 'Mileage' : 'Travel'))
            : 'Other',
          categoryOther: ['Travel','Meals','Accommodation','Equipment','Training','Other','Mileage'].includes(expense.category)
            ? ''
            : (expense.category || ''),
          tags: Array.isArray(expense.tags) ? expense.tags.join(', ') : (expense.tags || ''),
          notes: expense.notes || '',
          supplier: expense.supplier || '',
          receiptValue: expense.receiptValue !== undefined && expense.receiptValue !== null ? String(expense.receiptValue) : '',
          mileage: {
            distance: expense.mileage?.distance !== undefined && expense.mileage?.distance !== null ? String(expense.mileage.distance) : '',
            unit: expense.mileage?.unit || 'miles',
            ratePerUnit: expense.mileage?.ratePerUnit !== undefined && expense.mileage?.ratePerUnit !== null ? String(expense.mileage.ratePerUnit) : '0.45',
            destinations: Array.isArray(expense.mileage?.destinations) && expense.mileage.destinations.length > 0
              ? expense.mileage.destinations
              : [{ address: '', latitude: null, longitude: null, order: 0 }],
            routePoints: Array.isArray(expense.mileage?.routePoints) ? expense.mileage.routePoints : []
          }
        }));
      } catch (err) {
        console.error('Failed to load expense for edit:', err);
        setError(err.response?.data?.message || 'Failed to load expense for editing');
      } finally {
        setLoading(false);
      }
    };

    loadExpenseForEdit();
  }, [expenseId, initialType]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMileageChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      mileage: { ...prev.mileage, [field]: value }
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 5) {
      alert('Maximum 5 attachments allowed per expense claim');
      return;
    }
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toNumber = (value) => {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const calculateMileageTotal = () => {
    const { distance, ratePerUnit } = formData.mileage;
    const subtotal = toNumber(distance) * toNumber(ratePerUnit);
    return subtotal + toNumber(formData.tax);
  };

  const calculateReceiptTotal = () => {
    return toNumber(formData.receiptValue) + toNumber(formData.tax);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Calculate total amount based on claim type
      const totalAmount = claimType === 'mileage' ? calculateMileageTotal() : calculateReceiptTotal();

      // Prepare expense data
      const expenseData = {
        claimType,
        date: formData.date,
        currency: formData.currency,
        tax: toNumber(formData.tax),
        totalAmount,
        category: claimType === 'mileage'
          ? 'Mileage'
          : (formData.categorySelection === 'Other' ? formData.categoryOther : formData.categorySelection),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        notes: formData.notes
      };

      if (claimType === 'receipt') {
        expenseData.supplier = formData.supplier;
        expenseData.receiptValue = toNumber(formData.receiptValue);
      } else {
        expenseData.mileage = {
          distance: toNumber(formData.mileage.distance),
          unit: formData.mileage.unit,
          ratePerUnit: toNumber(formData.mileage.ratePerUnit),
          destinations: formData.mileage.destinations,
          routePoints: formData.mileage.routePoints
        };
      }

      // Create or update expense
      let targetExpenseId = expenseId;
      if (expenseId) {
        await axios.put(`/api/expenses/${expenseId}`, expenseData);
      } else {
        const response = await axios.post('/api/expenses', expenseData);
        targetExpenseId = response.data._id;
      }

      success(expenseId ? 'Expense claim updated successfully.' : 'Expense claim sent successfully for approval.');

      // Upload attachments
      if (attachments.length > 0 && targetExpenseId) {
        for (const file of attachments) {
          const formDataObj = new FormData();
          formDataObj.append('file', file);
          await axios.post(`/api/expenses/${targetExpenseId}/attachments`, formDataObj, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      // If embedded, call onClose so parent can close modal and refresh
      if (embed && typeof onClose === 'function') {
        onClose({ saved: true, id: targetExpenseId, mode: expenseId ? 'edit' : 'create' });
      } else {
        navigate('/user-dashboard?tab=expenses');
      }
    } catch (err) {
      console.error('Error creating expense:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create expense claim';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (!formData.date) return false;
    if (claimType === 'receipt') {
      if (!formData.categorySelection) return false;
      if (formData.categorySelection === 'Other' && !formData.categoryOther) return false;
      return formData.supplier && toNumber(formData.receiptValue) > 0;
    } else {
      return (toNumber(formData.mileage.distance) > 0 || (formData.mileage.routePoints && formData.mileage.routePoints.length >= 2)) && toNumber(formData.mileage.ratePerUnit) > 0;
    }
  };

  const containerClass = embed ? 'bg-white rounded-lg shadow p-6' : 'p-6 bg-gray-50 min-h-screen';

  const handleDatePickerChange = (e) => {
    // ModernDatePicker emits a synthetic event with target.name and target.value
    if (e && e.target) {
      handleInputChange(e.target.name, e.target.value);
    }
  };

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {!embed ? (
            <button
              onClick={() => navigate('/user-dashboard?tab=expenses')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft size={20} />
              Back to Expenses
            </button>
          ) : (
            <button
              onClick={() => onClose && onClose()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft size={20} />
              Close
            </button>
          )}

        </div>

        <div className="flex gap-4">
          {!expenseId && (
          <button
            type="button"
            onClick={() => setClaimType('receipt')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition ${
              claimType === 'receipt'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <Receipt size={20} />
            Receipts
          </button>
          )}
          {!expenseId && (
          <button
            type="button"
            onClick={() => setClaimType('mileage')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition ${
              claimType === 'mileage'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <Car size={20} />
            Mileage
          </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
                <ModernDatePicker
                  name="date"
                  label="Date"
                  value={formData.date}
                  onChange={handleDatePickerChange}
                  required
                />
            </div>

            {/* Category */}
            {claimType === 'receipt' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={String(formData.categorySelection || 'Travel')}
                  onValueChange={(v) => {
                    handleInputChange('categorySelection', v);
                    if (v !== 'Other') handleInputChange('categoryOther', '');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Travel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Meals">Meals</SelectItem>
                    <SelectItem value="Accommodation">Accommodation</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.categorySelection === 'Other' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expense Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.categoryOther}
                      onChange={(e) => handleInputChange('categoryOther', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the expense category"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Receipt-specific fields */}
            {claimType === 'receipt' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <Select
                    value={String(formData.currency || 'GBP')}
                    onValueChange={(v) => handleInputChange('currency', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="GBP (£)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={formData.receiptValue}
                    onChange={(e) => handleInputChange('receiptValue', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={formData.tax}
                    onChange={(e) => handleInputChange('tax', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Value
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {formData.currency} {calculateReceiptTotal().toFixed(2)}
                  </div>
                </div>
              </>
            )}

            {/* Mileage-specific fields */}
            {claimType === 'mileage' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={formData.mileage.distance}
                      onChange={(e) => handleMileageChange('distance', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <div className="w-[140px]">
                      <Select
                        value={String(formData.mileage.unit || 'miles')}
                        onValueChange={(v) => handleMileageChange('unit', v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Miles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="miles">Miles</SelectItem>
                          <SelectItem value="km">KM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate per {formData.mileage.unit === 'miles' ? 'Mile' : 'KM'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={formData.mileage.ratePerUnit}
                    onChange={(e) => handleMileageChange('ratePerUnit', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <Select
                    value={String(formData.currency || 'GBP')}
                    onValueChange={(v) => handleInputChange('currency', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="GBP (£)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={formData.tax}
                    onChange={(e) => handleInputChange('tax', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Value
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {formData.currency} {calculateMileageTotal().toFixed(2)}
                  </div>
                </div>
              </>
            )}

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Comma-separated tags"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Additional information about this expense"
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Attachments ({attachments.length}/5)
          </h3>
          
          {attachments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {attachments.map((file, index) => (
                <div key={index} className="relative border border-gray-300 rounded-lg p-3">
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X size={14} />
                  </button>
                  <FileText size={32} className="text-gray-400 mb-2" />
                  <p className="text-xs text-gray-600 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ))}
            </div>
          )}

          {attachments.length < 5 && (
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer transition">
              <Upload size={20} />
              <span>Attach file</span>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf"
                multiple
              />
            </label>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
              type="button"
              onClick={() => {
                if (embed && typeof onClose === 'function') return onClose({ cancelled: true });
                navigate('/user-dashboard?tab=expenses');
              }}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          <button
            type="submit"
            disabled={!isFormValid() || loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Wallet size={20} />
                {expenseId ? 'Save changes' : 'Submit claim'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
