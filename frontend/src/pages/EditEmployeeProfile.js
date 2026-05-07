import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../components/AlertNotification";
import { useAuth } from "../context/AuthContext";
import { DatePicker } from '../components/ui/date-picker';
import axios from '../utils/axiosConfig';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ETHNICITY_OPTIONS,
  EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS
} from '../constants/employeeFieldOptions';

export default function EditEmployeeProfile() {
  const { success, error } = useAlert();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Basic Info");
  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [managers, setManagers] = useState([]);
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState(28);
  const [employeeUserId, setEmployeeUserId] = useState("");
  const [formData, setFormData] = useState({
    // Basic Info
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    mobileNumber: "",
    dateOfBirth: "",
    gender: "",
    ethnicity: "",
    employeeId: "",
    // Employment
    jobTitle: "",
    department: "",
    team: "",
    officeLocation: "",
    workLocation: "",
    managerId: "",
    status: "Active",
    startDate: "",
    probationEndDate: "",
    employmentType: "Full-time",
    role: "employee",
    // Pay Details
    salary: "",
    rate: "",
    paymentFrequency: "",
    effectiveFrom: "",
    reason: "",
    payrollNumber: "",
    leaveEntitlement: "",
    leaveAllowance: "",
    // Bank Details
    accountName: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    sortCode: "",
    // Tax & NI
    taxCode: "",
    niNumber: "",
    isUKCitizen: true,
    dvlaConsent: false,
    rightToWorkDeclaration: false,
    // Passport
    passportNumber: "",
    passportCountry: "",
    passportExpiryDate: "",
    passportDocument: "",
    // Driving Licence
    licenceType: "",
    licenceNumber: "",
    licenceCountry: "",
    licenceClass: "",
    licenceExpiryDate: "",
    penaltyPoints: "0",
    licenceDocument: "",
    // Visa
    visaNumber: "",
    visaExpiryDate: "",
    visaDocument: "",
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    emergencyContactEmail: "",
    // Address
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    city: "",
    postalCode: "",
    country: "",
  });
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isEmployeeUser = user?.role === 'employee';
  const MANAGER_ROLE_VALUES = ['manager', 'senior-manager'];

  const tabs = ["Basic Info", "Contact", "Employment", "Pay & Bank", "Sensitive Details", "Emergency Contact", "Address"];

  useEffect(() => {
    if (!id) {
      navigate('/employees');
      return;
    }
    loadEmployee();
    loadManagers();
  }, [id]);

  useEffect(() => {
    if (employeeUserId) {
      loadAnnualLeaveBalance(employeeUserId);
    }
  }, [employeeUserId]);

  const loadManagers = async () => {
    try {
      const response = await axios.get('/api/employees?status=Active');
      if (response.data.success) {
        const managerOnly = (response.data.data || []).filter((emp) => {
          const role = (emp?.role || '').toString().trim().toLowerCase();
          return emp._id !== id && MANAGER_ROLE_VALUES.includes(role);
        });
        setManagers(managerOnly);
      }
    } catch (err) {
      console.error('Error loading managers:', err);
    }
  };

  const loadAnnualLeaveBalance = async (userId) => {
    if (!userId) return;

    try {
      const response = await axios.get(`/api/leave/balances/current/${userId}`);
      if (response.data.success && response.data.data) {
        setAnnualLeaveAllowance(
          response.data.data.totalDays ||
          response.data.data.entitlementDays ||
          28
        );
      }
    } catch (err) {
      console.error('Error loading annual leave balance:', err);
    }
  };

  const loadEmployee = async () => {
    setEmployeeLoading(true);
    try {
      const response = await axios.get(`/api/employees/${id}`);
      
      if (response.data.success && response.data.data) {
        const emp = response.data.data;
        const normalizedStatus = (emp.status || '').toString().trim().toLowerCase();
        if (normalizedStatus === 'terminated' || emp.isActive === false) {
          navigate('/employees', { replace: true });
          return;
        }
        const resolvedUserId = emp.userId?._id || emp.userId || emp.profileUserId || emp.user?._id || emp.userId;

        if (resolvedUserId) {
          setEmployeeUserId(resolvedUserId);
        }

        setFormData({
          // Basic Info
          title: emp.title || "",
          firstName: emp.firstName || "",
          middleName: emp.middleName || "",
          lastName: emp.lastName || "",
          email: emp.email || "",
          phoneNumber: emp.workPhone || emp.phoneNumber || "",
          mobileNumber: emp.phone || emp.mobileNumber || "",
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
          gender: emp.gender || "",
          ethnicity: emp.ethnicity || "",
          employeeId: emp.employeeId || "",
          // Employment
          jobTitle: emp.jobTitle || "",
          department: emp.department || "",
          team: emp.team || "",
          // Support legacy/alternate field 'OrganisationName' used by onboarding
          officeLocation: emp.OrganisationName || emp.office || emp.officeLocation || "",
          workLocation: emp.workLocation || "",
          managerId: emp.managerId?._id || emp.managerId || "",
          status: emp.status || "Active",
          startDate: emp.startDate ? new Date(emp.startDate).toISOString().split('T')[0] : "",
          probationEndDate: emp.probationEndDate ? new Date(emp.probationEndDate).toISOString().split('T')[0] : "",
          employmentType: emp.employmentType || "Full-time",
          // Pay Details
          salary: emp.salary || "",
          rate: emp.rate || "",
          paymentFrequency: emp.paymentFrequency || emp.payrollCycle || "",
          effectiveFrom: emp.effectiveFrom ? new Date(emp.effectiveFrom).toISOString().split('T')[0] : "",
          reason: emp.reason || "",
          payrollNumber: emp.payrollNumber || "",
          leaveEntitlement: emp.leaveEntitlement !== undefined && emp.leaveEntitlement !== null ? String(emp.leaveEntitlement) : "",
          leaveAllowance: emp.leaveAllowance !== undefined && emp.leaveAllowance !== null ? String(emp.leaveAllowance) : "",
          // Bank Details
          accountName: emp.accountName || "",
          bankName: emp.bankName || "",
          bankBranch: emp.bankBranch || "",
          accountNumber: emp.accountNumber || "",
          sortCode: emp.sortCode || "",
          // Tax & NI
          taxCode: emp.taxCode || "",
          niNumber: emp.niNumber || emp.nationalInsuranceNumber || "",
          isUKCitizen: emp.isUKCitizen !== undefined ? Boolean(emp.isUKCitizen) : true,
          dvlaConsent: Boolean(emp.dvlaConsent),
          rightToWorkDeclaration: Boolean(emp.rightToWorkDeclaration),
          // Passport
          passportNumber: emp.passportNumber || "",
          passportCountry: emp.passportCountry || "",
          passportExpiryDate: emp.passportExpiryDate ? new Date(emp.passportExpiryDate).toISOString().split('T')[0] : "",
          passportDocument: emp.passportDocument || "",
          // Driving Licence
          licenceType: emp.licenceType || "",
          licenceNumber: emp.licenceNumber || "",
          licenceCountry: emp.licenceCountry || "",
          licenceClass: emp.licenceClass || "",
          licenceExpiryDate: emp.licenceExpiryDate ? new Date(emp.licenceExpiryDate).toISOString().split('T')[0] : "",
          penaltyPoints: emp.penaltyPoints !== undefined && emp.penaltyPoints !== null ? String(emp.penaltyPoints) : "0",
          licenceDocument: emp.licenceDocument || "",
          // Visa
          visaNumber: emp.visaNumber || "",
          visaExpiryDate: emp.visaExpiryDate ? new Date(emp.visaExpiryDate).toISOString().split('T')[0] : "",
          visaDocument: emp.visaDocument || "",
          // Emergency Contact
          emergencyContactName: emp.emergencyContactName || "",
          emergencyContactRelation: emp.emergencyContactRelation || "",
          emergencyContactPhone: emp.emergencyContactPhone || "",
          emergencyContactEmail: emp.emergencyContactEmail || "",
          // Address
          addressLine1: emp.address1 || emp.addressLine1 || "",
          addressLine2: emp.address2 || emp.addressLine2 || "",
          addressLine3: emp.address3 || emp.addressLine3 || "",
          city: emp.townCity || emp.city || "",
          postalCode: emp.postcode || emp.postalCode || "",
          country: emp.county || emp.country || "",
        });
      } else {
        error('Employee not found');
        navigate('/employees');
      }
    } catch (err) {
      console.error('Error loading employee:', err);
      error('Failed to load employee. Please try again.');
      navigate('/employees');
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const toIsoOrUndefined = (value) => (value ? new Date(value).toISOString() : undefined);

      // Map frontend field names to backend schema field names
      const { officeLocation, addressLine1, addressLine2, city, postalCode, country, phoneNumber, mobileNumber, ...restFormData } = formData;
      
      const employeeData = {
        ...restFormData,
        // Map office location
        office: officeLocation,
        // Map phone numbers (backend uses 'phone' and 'workPhone')
        phone: mobileNumber || phoneNumber,
        workPhone: phoneNumber,
        // Map address fields (backend uses address1/2/3, townCity, postcode, county)
        address1: addressLine1,
        address2: addressLine2,
        address3: formData.addressLine3,
        townCity: city,
        postcode: postalCode,
        county: country,
        // Handle dates
        dateOfBirth: toIsoOrUndefined(formData.dateOfBirth),
        startDate: toIsoOrUndefined(formData.startDate),
        probationEndDate: toIsoOrUndefined(formData.probationEndDate),
        effectiveFrom: toIsoOrUndefined(formData.effectiveFrom),
        passportExpiryDate: toIsoOrUndefined(formData.passportExpiryDate),
        licenceExpiryDate: toIsoOrUndefined(formData.licenceExpiryDate),
        visaExpiryDate: toIsoOrUndefined(formData.visaExpiryDate),
      };

      // Avoid sending empty values for enum/object-id fields that trigger Mongoose validation
      ['gender', 'workLocation', 'employmentType', 'status', 'managerId', 'team', 'role', 'licenceType'].forEach((key) => {
        if (employeeData[key] === '') delete employeeData[key];
      });

      // Do not overwrite existing date fields with empty values
      [
        'dateOfBirth',
        'startDate',
        'probationEndDate',
        'effectiveFrom',
        'passportExpiryDate',
        'licenceExpiryDate',
        'visaExpiryDate'
      ].forEach((key) => {
        if (employeeData[key] === undefined) delete employeeData[key];
      });

      const payload = isEmployeeUser
        ? {
            title: employeeData.title,
            firstName: employeeData.firstName,
            middleName: employeeData.middleName,
            lastName: employeeData.lastName,
            email: employeeData.email,
            phone: employeeData.phone,
            workPhone: employeeData.workPhone,
            emergencyContactName: employeeData.emergencyContactName,
            emergencyContactRelation: employeeData.emergencyContactRelation,
            emergencyContactPhone: employeeData.emergencyContactPhone,
            emergencyContactEmail: employeeData.emergencyContactEmail,
            address1: employeeData.address1,
            address2: employeeData.address2,
            address3: employeeData.address3,
            townCity: employeeData.townCity,
            postcode: employeeData.postcode,
            county: employeeData.county
          }
        : employeeData;
      
      const response = await axios.put(`/api/employees/${id}`, payload);
      
      // Update annual leave balance if changed
      if (!isEmployeeUser && response.data.success && annualLeaveAllowance !== 28) {
        try {
          const balanceUserId = employeeUserId || formData.employeeId || id;
          await axios.put(`/api/leave/admin/balance/${balanceUserId}`, {
            totalDays: annualLeaveAllowance
          });
        } catch (leaveErr) {
          console.error('Failed to update leave balance:', leaveErr);
        }
      }
      
      if (response.status === 200 && response.data.success) {
        success('Employee updated successfully!');

        const currentUserEmployeeId = user?.employeeHubId || user?.id;
        const isSelfEdit = currentUserEmployeeId && String(currentUserEmployeeId) === String(id);
        const updatedRole = (
          response.data?.data?.role ||
          payload.role ||
          formData.role ||
          user?.role ||
          ''
        ).toString().trim().toLowerCase();
        const previousRole = (user?.role || '').toString().trim().toLowerCase();

        // If the current user edited their own role, keep the existing navigation behaviour
        if (isSelfEdit && updatedRole && updatedRole !== previousRole) {
          updateUser({ role: updatedRole });

          if (updatedRole === 'employee') {
            navigate('/user-dashboard', { replace: true });
            return;
          }

          if (['manager', 'senior-manager', 'hr'].includes(updatedRole)) {
            navigate('/manager/dashboard', { replace: true });
            return;
          }

          if (['admin', 'super-admin'].includes(updatedRole)) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // Otherwise, do NOT redirect away (e.g. when changing manager). Refresh the data and remain on the edit page.
        await loadEmployee();
        return;
      } else if (response.status === 200) {
        success('Employee updated successfully!');
        await loadEmployee();
      } else {
        error(response.data.message || 'Failed to update employee');
      }
    } catch (err) {
      console.error("Failed to update employee:", err);
      console.error("Error response:", err.response?.data);
      if (Array.isArray(err.response?.data?.errors) && err.response.data.errors.length > 0) {
        error(err.response.data.errors.join(', '));
      }
      
      // Show detailed validation errors if available
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => e.message).join('\n');
        alert(`Validation errors:\n${errorMessages}`);
        error(`Validation errors:\n${errorMessages}`);
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to update employee. Please try again.';
        alert(`Error: ${errorMsg}\n\nFull error: ${JSON.stringify(err.response?.data, null, 2)}`);
        error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isEmployeeUser) {
      return;
    }
    setLoading(true);
    try {
      const response = await axios.delete(`/api/employees/${id}`);
      
      if (response.data.success) {
        const employeeName = `${formData.firstName} ${formData.lastName}`;
        success(`Employee '${employeeName}' has been deleted successfully`);
        navigate("/employees");
      } else {
        error(response.data.message || 'Failed to delete employee');
      }
    } catch (err) {
      console.error("Failed to delete employee:", err);
      error('Failed to delete employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/employee/${id}`);
  };

  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="lg:w-1/4 bg-white shadow p-3 sm:p-4">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Edit Employee</h2>
        <ul className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible space-x-2 lg:space-x-0 lg:space-y-2 pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <li
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer px-3 py-2 rounded whitespace-nowrap text-xs sm:text-sm ${
                activeTab === tab
                  ? "bg-green-600 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {tab}
            </li>
          ))}
        </ul>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white shadow p-3 sm:p-4 md:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{activeTab}</h3>
        {isEmployeeUser && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            You can edit only Name, Email, Phone, Emergency Contact, and Address details. Other fields are read-only.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          {activeTab === "Basic Info" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Title"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                <input
                  id="middleName"
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Middle Name"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  id="employeeId"
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="Employee ID"
                  className="border p-2 rounded w-full"
                  disabled={isEmployeeUser}
                />
              </div>
              <div>
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth || null}
                  onChange={(date) => handleChange({ target: { name: 'dateOfBirth', value: date ? date.format('YYYY-MM-DD') : '' } })}
                  disabled={isEmployeeUser}
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange({ target: { name: 'gender', value } })}
                >
                  <SelectTrigger className="w-full" disabled={isEmployeeUser}>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                <Select
                  value={formData.ethnicity || 'Unspecified'}
                  onValueChange={(value) => handleChange({ target: { name: 'ethnicity', value } })}
                >
                  <SelectTrigger className="w-full" disabled={isEmployeeUser}>
                    <SelectValue placeholder="Select Ethnicity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETHNICITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Contact */}
          {activeTab === "Contact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
              <div className="col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  id="mobileNumber"
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Employment */}
          {activeTab === "Employment" && (
            <fieldset disabled={isEmployeeUser} className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  id="jobTitle"
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="Job Title"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="workLocation" className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                <Select
                  value={formData.workLocation || 'On-site'}
                  onValueChange={(value) => handleChange({ target: { name: 'workLocation', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Work Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  id="department"
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Department"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <input
                  id="team"
                  type="text"
                  name="team"
                  value={formData.team}
                  onChange={handleChange}
                  placeholder="Team"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="officeLocation" className="block text-sm font-medium text-gray-700 mb-2">Organisation</label>
                <input
                  id="officeLocation"
                  type="text"
                  name="officeLocation"
                  value={formData.officeLocation}
                  onChange={handleChange}
                  placeholder="Organisation"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                <Select
                  value={formData.managerId || "none"}
                  onValueChange={(value) => handleChange({ target: { name: 'managerId', value: value === "none" ? "" : value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager._id} value={manager._id}>
                        {manager.firstName} {manager.lastName} - {manager.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange({ target: { name: 'status', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate || null}
                  onChange={(date) => handleChange({ target: { name: 'startDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                />
              </div>
              {!isEmployeeUser && (
              <div>
                <label htmlFor="annualLeaveAllowance" className="block text-sm font-medium text-gray-700 mb-2">Annual Leave Allowance (Days)</label>
                <input
                  id="annualLeaveAllowance"
                  type="number"
                  min="0"
                  max="60"
                  value={annualLeaveAllowance}
                  onChange={(e) => setAnnualLeaveAllowance(parseInt(e.target.value) || 0)}
                  placeholder="28"
                  className="border p-2 rounded w-full"
                />
              </div>
              )}
              <div>
                <DatePicker
                  label="Probation End Date"
                  value={formData.probationEndDate || null}
                  onChange={(date) => handleChange({ target: { name: 'probationEndDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                />
              </div>
              <div>
                <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) => handleChange({ target: { name: 'employmentType', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">Role / Authority Level</label>
                <Select
                  value={formData.role || 'employee'}
                  onValueChange={(value) => handleChange({ target: { name: 'role', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Determines approval permissions and system access level</p>
              </div>
            </fieldset>
          )}

          {/* Pay & Bank Details */}
          {activeTab === "Pay & Bank" && (
            <fieldset disabled={isEmployeeUser} className="space-y-8">
              {/* Pay Details Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Pay Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                    <input
                      id="salary"
                      type="text"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      placeholder="£0.00"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-2">Rate</label>
                    <input
                      id="rate"
                      type="text"
                      name="rate"
                      value={formData.rate}
                      onChange={handleChange}
                      placeholder="e.g., Hourly, Daily"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="paymentFrequency" className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency</label>
                    <Select
                      value={formData.paymentFrequency}
                      onValueChange={(value) => handleChange({ target: { name: 'paymentFrequency', value } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="payrollNumber" className="block text-sm font-medium text-gray-700 mb-2">Payroll Number</label>
                    <input
                      id="payrollNumber"
                      type="text"
                      name="payrollNumber"
                      value={formData.payrollNumber}
                      onChange={handleChange}
                      placeholder="Payroll Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="Effective From"
                      value={formData.effectiveFrom || null}
                      onChange={(date) => handleChange({ target: { name: 'effectiveFrom', value: date ? date.format('YYYY-MM-DD') : '' } })}
                    />
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <input
                      id="reason"
                      type="text"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      placeholder="Reason"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="leaveEntitlement" className="block text-sm font-medium text-gray-700 mb-2">Leave Entitlement</label>
                    <input
                      id="leaveEntitlement"
                      type="number"
                      name="leaveEntitlement"
                      value={formData.leaveEntitlement}
                      onChange={handleChange}
                      placeholder="Leave Entitlement"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="leaveAllowance" className="block text-sm font-medium text-gray-700 mb-2">Leave Allowance</label>
                    <input
                      id="leaveAllowance"
                      type="number"
                      name="leaveAllowance"
                      value={formData.leaveAllowance}
                      onChange={handleChange}
                      placeholder="Leave Allowance"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Bank Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                    <input
                      id="accountName"
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleChange}
                      placeholder="Account Name"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      id="bankName"
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      placeholder="Bank Name"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="bankBranch" className="block text-sm font-medium text-gray-700 mb-2">Bank Branch</label>
                    <input
                      id="bankBranch"
                      type="text"
                      name="bankBranch"
                      value={formData.bankBranch}
                      onChange={handleChange}
                      placeholder="Bank Branch"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      id="accountNumber"
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      placeholder="Account Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="sortCode" className="block text-sm font-medium text-gray-700 mb-2">Sort Code</label>
                    <input
                      id="sortCode"
                      type="text"
                      name="sortCode"
                      value={formData.sortCode}
                      onChange={handleChange}
                      placeholder="00-00-00"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          {/* Sensitive Details */}
          {activeTab === "Sensitive Details" && (
            <fieldset disabled={isEmployeeUser} className="space-y-8">
              {/* Tax & NI Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Tax & National Insurance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="taxCode" className="block text-sm font-medium text-gray-700 mb-2">Tax Code</label>
                    <input
                      id="taxCode"
                      type="text"
                      name="taxCode"
                      value={formData.taxCode}
                      onChange={handleChange}
                      placeholder="Tax Code"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="niNumber" className="block text-sm font-medium text-gray-700 mb-2">National Insurance Number</label>
                    <input
                      id="niNumber"
                      type="text"
                      name="niNumber"
                      value={formData.niNumber}
                      onChange={handleChange}
                      placeholder="NI Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="isUKCitizen" className="block text-sm font-medium text-gray-700 mb-2">UK Citizen</label>
                    <Select
                      value={formData.isUKCitizen ? 'yes' : 'no'}
                      onValueChange={(value) => handleChange({ target: { name: 'isUKCitizen', value: value === 'yes' } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Passport Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Passport Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                    <input
                      id="passportNumber"
                      type="text"
                      name="passportNumber"
                      value={formData.passportNumber}
                      onChange={handleChange}
                      placeholder="Passport Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="passportCountry" className="block text-sm font-medium text-gray-700 mb-2">Passport Country</label>
                    <input
                      id="passportCountry"
                      type="text"
                      name="passportCountry"
                      value={formData.passportCountry}
                      onChange={handleChange}
                      placeholder="Country"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="Passport Expiry Date"
                      value={formData.passportExpiryDate || null}
                      onChange={(date) => handleChange({ target: { name: 'passportExpiryDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="passportDocument" className="block text-sm font-medium text-gray-700 mb-2">Passport Document Reference</label>
                    <input
                      id="passportDocument"
                      type="text"
                      name="passportDocument"
                      value={formData.passportDocument}
                      onChange={handleChange}
                      placeholder="Document ID / reference"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Driving Licence Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Driving Licence</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="licenceType" className="block text-sm font-medium text-gray-700 mb-2">Driving Licence Type</label>
                    <Select
                      value={formData.licenceType || 'NA'}
                      onValueChange={(value) => handleChange({ target: { name: 'licenceType', value } })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Licence Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        <SelectItem value="Full UK Manual Licence">Full UK Manual Licence</SelectItem>
                        <SelectItem value="Full UK Automatic Licence">Full UK Automatic Licence</SelectItem>
                        <SelectItem value="Provisional Licence">Provisional Licence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="licenceNumber" className="block text-sm font-medium text-gray-700 mb-2">Licence Number</label>
                    <input
                      id="licenceNumber"
                      type="text"
                      name="licenceNumber"
                      value={formData.licenceNumber}
                      onChange={handleChange}
                      placeholder="Licence Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="licenceCountry" className="block text-sm font-medium text-gray-700 mb-2">Licence Country</label>
                    <input
                      id="licenceCountry"
                      type="text"
                      name="licenceCountry"
                      value={formData.licenceCountry}
                      onChange={handleChange}
                      placeholder="Country"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="licenceClass" className="block text-sm font-medium text-gray-700 mb-2">Licence Class</label>
                    <input
                      id="licenceClass"
                      type="text"
                      name="licenceClass"
                      value={formData.licenceClass}
                      onChange={handleChange}
                      placeholder="e.g., B, C, D"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="Licence Expiry Date"
                      value={formData.licenceExpiryDate || null}
                      onChange={(date) => handleChange({ target: { name: 'licenceExpiryDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                    />
                  </div>
                  <div>
                    <label htmlFor="penaltyPoints" className="block text-sm font-medium text-gray-700 mb-2">Penalty Points</label>
                    <input
                      id="penaltyPoints"
                      type="number"
                      min="0"
                      max="14"
                      name="penaltyPoints"
                      value={formData.penaltyPoints}
                      onChange={handleChange}
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="licenceDocument" className="block text-sm font-medium text-gray-700 mb-2">Driving Licence Document Reference</label>
                    <input
                      id="licenceDocument"
                      type="text"
                      name="licenceDocument"
                      value={formData.licenceDocument}
                      onChange={handleChange}
                      placeholder="Document ID / reference"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Visa Section */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Visa Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  <div>
                    <label htmlFor="visaNumber" className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
                    <input
                      id="visaNumber"
                      type="text"
                      name="visaNumber"
                      value={formData.visaNumber}
                      onChange={handleChange}
                      placeholder="Visa Number"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="Visa Expiry Date"
                      value={formData.visaExpiryDate || null}
                      onChange={(date) => handleChange({ target: { name: 'visaExpiryDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="visaDocument" className="block text-sm font-medium text-gray-700 mb-2">Visa Document Reference</label>
                    <input
                      id="visaDocument"
                      type="text"
                      name="visaDocument"
                      value={formData.visaDocument}
                      onChange={handleChange}
                      placeholder="Document ID / reference"
                      className="border p-2 rounded w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Compliance & Consent */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Compliance & Consent</h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="dvlaConsent"
                      checked={Boolean(formData.dvlaConsent)}
                      onChange={(e) => handleChange({ target: { name: 'dvlaConsent', value: e.target.checked } })}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">I authorise the company to check my driving licence record with DVLA</span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="rightToWorkDeclaration"
                      checked={Boolean(formData.rightToWorkDeclaration)}
                      onChange={(e) => handleChange({ target: { name: 'rightToWorkDeclaration', value: e.target.checked } })}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">I confirm that I have the legal right to work in the United Kingdom</span>
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          {/* Emergency Contact */}
          {activeTab === "Emergency Contact" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
              <div>
                <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  id="emergencyContactName"
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Contact Name"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="emergencyContactRelation" className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                <Select
                  value={formData.emergencyContactRelation || ''}
                  onValueChange={(value) => handleChange({ target: { name: 'emergencyContactRelation', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  id="emergencyContactPhone"
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="emergencyContactEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="emergencyContactEmail"
                  type="email"
                  name="emergencyContactEmail"
                  value={formData.emergencyContactEmail}
                  onChange={handleChange}
                  placeholder="Email"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Address */}
          {activeTab === "Address" && (
            <div className="space-y-3 sm:space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-2">
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  id="addressLine1"
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Address Line 1"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  id="addressLine2"
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Address Line 2"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="addressLine3" className="block text-sm font-medium text-gray-700 mb-1">Address Line 3</label>
                <input
                  id="addressLine3"
                  type="text"
                  name="addressLine3"
                  value={formData.addressLine3}
                  onChange={handleChange}
                  placeholder="Address Line 3"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  id="postalCode"
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="Postal Code"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  id="country"
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-4 sm:mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
            </div>

            {!isEmployeeUser && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                Delete Employee
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Delete Employee Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Employee"
        description="Are you sure you want to delete this employee? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete Employee"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
