import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Phone,
  Home,
  Users,
  CreditCard,
  Shield,
  Briefcase,
  FileText,
  Edit
} from 'lucide-react';
import axios from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  ETHNICITY_OPTIONS,
  EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS
} from '../constants/employeeFieldOptions';

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const EMPLOYEE_EDITABLE_FIELDS = new Set([
    'firstName',
    'middleName',
    'lastName',
    'email',
    'phoneNumber',
    'emergencyContactName',
    'emergencyContactRelation',
    'emergencyContactPhone',
    'emergencyContactEmail',
    'addressLine1',
    'addressLine2',
    'addressLine3',
    'city',
    'postalCode',
    'country'
  ]);

  // Section definitions matching AddEmployee flow
  const profileSections = [
    {
      id: 'basic-details',
      title: 'Basic Details',
      description: 'Personal information',
      icon: User,
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'firstName', label: 'First Name', type: 'text', required: true },
        { key: 'middleName', label: 'Middle Name', type: 'text' },
        { key: 'lastName', label: 'Last Name', type: 'text', required: true },
        { key: 'gender', label: 'Gender', type: 'select' },
        { key: 'ethnicity', label: 'Ethnicity', type: 'select', options: ETHNICITY_OPTIONS },
        { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phoneNumber', label: 'Phone Number', type: 'tel', keys: ['phoneNumber', 'phone', 'workPhone'] },
        { key: 'workPhone', label: 'Work Phone', type: 'tel' },
        { key: 'profilePhoto', label: 'Profile Photo', type: 'image' }
      ],
      hasData: (data) => data.firstName || data.lastName || data.email || data.phoneNumber || data.phone
    },
    {
      id: 'address-details',
      title: 'Address Details',
      description: 'Home address',
      icon: Home,
      fields: [
        { key: 'addressLine1', label: 'Address Line 1', type: 'text', keys: ['addressLine1', 'address1'] },
        { key: 'addressLine2', label: 'Address Line 2', type: 'text', keys: ['addressLine2', 'address2'] },
        { key: 'addressLine3', label: 'Address Line 3', type: 'text', keys: ['addressLine3', 'address3'] },
        { key: 'city', label: 'Town/City', type: 'text', keys: ['city', 'townCity'] },
        { key: 'county', label: 'County', type: 'text' },
        { key: 'postalCode', label: 'Postal Code', type: 'text', keys: ['postalCode', 'postcode'] },
        { key: 'country', label: 'Country', type: 'text', keys: ['country', 'county'] }
      ],
      hasData: (data) => data.addressLine1 || data.address1 || data.city || data.townCity || data.postalCode || data.postcode
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact',
      description: 'Emergency contact info',
      icon: Users,
      fields: [
        { key: 'emergencyContactName', label: 'Contact Name', type: 'text' },
        { key: 'emergencyContactRelation', label: 'Relationship', type: 'select', options: EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS },
        { key: 'emergencyContactPhone', label: 'Contact Phone', type: 'tel' },
        { key: 'emergencyContactEmail', label: 'Contact Email', type: 'email' }
      ],
      hasData: (data) => data.emergencyContactName || data.emergencyContactPhone
    },
    {
      id: 'account-pay-details',
      title: 'Account & Pay Details',
      description: 'Salary and bank info',
      icon: CreditCard,
      fields: [
        { key: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { key: 'department', label: 'Department', type: 'text', required: true },
        { key: 'team', label: 'Team', type: 'text' },
        { key: 'salary', label: 'Salary', type: 'text' },
        { key: 'rate', label: 'Rate', type: 'text' },
        { key: 'paymentFrequency', label: 'Payment Frequency', type: 'text' },
        { key: 'payrollNumber', label: 'Payroll Number', type: 'text' },
        { key: 'accountName', label: 'Account Name', type: 'text' },
        { key: 'bankName', label: 'Bank Name', type: 'text' },
        { key: 'bankBranch', label: 'Bank Branch', type: 'text' },
        { key: 'accountNumber', label: 'Account Number', type: 'text' },
        { key: 'sortCode', label: 'Sort Code', type: 'text' }
      ],
      hasData: (data) => data.jobTitle || data.department || data.salary || data.bankName
    },
    {
      id: 'sensitive-details',
      title: 'Sensitive Details',
      description: 'Tax and document info',
      icon: Shield,
      fields: [
        { key: 'taxCode', label: 'Tax Code', type: 'text' },
        { key: 'niNumber', label: 'NI Number', type: 'text', keys: ['niNumber', 'nationalInsuranceNumber'] },
        { key: 'passportNumber', label: 'Passport Number', type: 'text' },
        { key: 'passportCountry', label: 'Passport Country', type: 'text' },
        { key: 'passportExpiryDate', label: 'Passport Expiry', type: 'date' },
        { key: 'licenceNumber', label: 'Driving Licence Number', type: 'text' },
        { key: 'licenceCountry', label: 'Licence Country', type: 'text' },
        { key: 'licenceClass', label: 'Licence Class', type: 'text' },
        { key: 'licenceExpiryDate', label: 'Licence Expiry', type: 'date' },
        { key: 'visaNumber', label: 'Visa Number', type: 'text' },
        { key: 'visaExpiryDate', label: 'Visa Expiry', type: 'date' }
      ],
      hasData: (data) => data.taxCode || data.niNumber || data.passportNumber
    }
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      // Get current user from auth context or localStorage
      const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

      console.log('Current user for profile lookup:', currentUser);

      if (!currentUser || (!currentUser._id && !currentUser.id && !currentUser.email)) {
        console.log('No valid user found, redirecting to login');
        navigate('/login');
        return;
      }

      // Try email first so a missing user-id link doesn't produce a noisy 404.
      let response;
      const userId = currentUser._id || currentUser.id;

      if (currentUser.email) {
        try {
          console.log('Fetching employee by email:', currentUser.email);
          response = await axios.get(`/api/employees/by-email/${currentUser.email}`);
          console.log('Response from email lookup:', response.data);
        } catch (error) {
          console.log('Failed to fetch by email, trying userId lookup:', error.response?.status);
        }
      }

      if (!response && userId) {
        console.log('Trying to fetch employee by userId:', userId);
        response = await axios.get(`/api/employees/by-user-id/${userId}`);
        console.log('Response from userId lookup:', response.data);
      }

      // Handle response properly - check if response has data
      // The backend returns the employee object directly in response.data
      if (response.data) {
        // specific check for success flag if it exists (standard wrapper)
        if (response.data.success && response.data.data) {
          console.log('Employee data found (wrapped):', response.data.data);
          setEmployee(response.data.data);
        } else {
          // Direct object response (current behavior)
          console.log('Employee data found (direct):', response.data);
          setEmployee(response.data);
        }
      } else {
        console.error('Failed to fetch employee data - empty response');
        // Set employee to null to trigger "Profile not found" message
        setEmployee(null);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      console.error('Error response:', error.response?.data);
      // Set employee to null to trigger "Profile not found" message
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'NA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatFieldValue = (value, type) => {
    if (value === undefined || value === null || value === '') return 'Not specified';

    switch (type) {
      case 'date':
        return formatDateDDMMYY(value);
      case 'select':
        return value;
      case 'email':
        return value;
      case 'tel':
        return value;
      case 'image':
        return value ? 'Uploaded' : 'Not uploaded';
      default:
        return String(value);
    }
  };

  const getFieldValue = (source, field) => {
    const keys = field.keys || [field.key];
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return '';
  };

  const isFieldEditable = (field) => EMPLOYEE_EDITABLE_FIELDS.has(field.key);

  const handleEditSection = (sectionId) => {
    const section = profileSections.find((item) => item.id === sectionId);
    if (!section) return;

    const sectionData = {};
    section.fields.forEach((field) => {
      sectionData[field.key] = getFieldValue(employee, field);
    });

    setEditingSection(sectionId);
    setEditData(sectionData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditData({});
    setIsEditing(false);
  };

  const handleInputChange = (key, value) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async () => {
    try {
      if (!editingSection) return;
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      const employeeId = employee._id || employee.id;
      const section = profileSections.find((item) => item.id === editingSection);

      const payload = {};
      (section?.fields || []).forEach((field) => {
        if (isFieldEditable(field)) {
          payload[field.key] = editData[field.key] || '';
        }
      });

      const normalizedPayload = {
        firstName: payload.firstName,
        middleName: payload.middleName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phoneNumber || '',
        workPhone: payload.phoneNumber || '',
        emergencyContactName: payload.emergencyContactName,
        emergencyContactRelation: payload.emergencyContactRelation,
        emergencyContactPhone: payload.emergencyContactPhone,
        emergencyContactEmail: payload.emergencyContactEmail,
        address1: payload.addressLine1,
        address2: payload.addressLine2,
        address3: payload.addressLine3,
        townCity: payload.city,
        postcode: payload.postalCode,
        county: payload.country
      };

      Object.keys(normalizedPayload).forEach((key) => {
        if (normalizedPayload[key] === undefined) {
          delete normalizedPayload[key];
        }
      });
      
      const response = await axios.put(
        `/api/employees/${employeeId}`,
        normalizedPayload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          withCredentials: true
        }
      );

      if (response.data) {
        setEmployee(response.data.data || response.data);
        setEditingSection(null);
        setIsEditing(false);
        console.log('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (section) => {
    const Icon = section.icon;
    const isSectionEditing = editingSection === section.id;
    const sectionHasEditableFields = section.fields.some((field) => isFieldEditable(field));

    return (
      <div key={section.id} className={`bg-white border ${isSectionEditing ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'} rounded-xl shadow-sm transition-all`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            </div>
            {!isSectionEditing && sectionHasEditableFields ? (
              <button 
                onClick={() => handleEditSection(section.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            ) : isSectionEditing ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSection}
                  className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">Read only</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{section.description}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.fields
              .map(field => (
                <div key={field.key} className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {isSectionEditing && isFieldEditable(field) ? (
                    field.type === 'select' ? (
                      <select
                        value={editData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      >
                        <option value="">Select {field.label}</option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={editData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )
                  ) : (
                    <>
                      <div className="text-gray-900 font-medium">
                        {formatFieldValue(isSectionEditing ? editData[field.key] : getFieldValue(employee, field), field.type)}
                      </div>
                      {isSectionEditing && !isFieldEditable(field) && (
                        <div className="text-xs text-gray-500 mt-1">Read only</div>
                      )}
                    </>
                  )}
                </div>
              ))
            }
          </div>
          {isSectionEditing && section.fields.every(f => !editData[f.key]) && (
            <div className="text-center py-4 text-gray-400 text-sm italic">
              No information added yet. Start typing to add details.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-gray-500 mb-4">Profile not found</div>
          <p className="text-sm text-gray-400 mb-4">
            We couldn't find your employee profile. This might be because:
          </p>
          <ul className="text-sm text-gray-400 text-left mb-4">
            <li>• Your account hasn't been linked to an employee profile yet</li>
            <li>• Your email in the system doesn't match your login email</li>
            <li>• Your profile may be inactive or terminated</li>
          </ul>
          <p className="text-sm text-gray-400">
            Please contact your HR administrator for assistance.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white border border-blue-600 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-[160px] h-[160px] rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-blue-50 overflow-hidden">
                {employee.profilePhoto ? (
                  <img
                    src={employee.profilePhoto}
                    alt={employee.fullName || 'Employee'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-4xl font-bold text-white select-none">
                    {employee.initials || getInitials(employee.fullName)}
                  </span>
                )}
              </div>
              {/* Edit Icon */}
              <button
                className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-md border border-gray-200 hover:bg-blue-50 transition-colors"
                title="Edit photo"
              >
                <Edit className="w-5 h-5 text-pink-600" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`}
              </h1>
              <div className="text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{employee.jobTitle || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{employee.email || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phoneNumber || employee.phone || employee.workPhone || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.department || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sections */}
        <div className="space-y-8">
          {profileSections.map(section => renderSection(section))
          }
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
