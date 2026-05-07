// src/pages/EditCertificate.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCertificates } from "../context/CertificateContext";
import { useProfiles } from "../context/ProfileContext";
import { getCertificatesForJobRole, getAllJobRoles } from "../data/certificateJobRoleMapping";
import SearchableDropdown from "../components/SearchableDropdown";
import { DatePicker } from "../components/ui/date-picker";
import { buildApiUrl } from '../utils/apiConfig';
import { useAlert } from "../components/AlertNotification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function EditCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { certificates, updateCertificate } = useCertificates();
  const { profiles } = useProfiles();
  const { success, error } = useAlert();
  
  const [formData, setFormData] = useState({
    certificate: "",
    category: "",
    description: "",
    issueDate: "",
    expiryDate: "",
    profileName: "",
    approvalStatus: "",
    isInterim: "No",
    fileRequired: "",
    timeLogged: {
      days: "",
      hours: "",
      minutes: ""
    },
    supplier: "",
    totalCost: "",
    archived: ""
  });

  const [availableCertificates, setAvailableCertificates] = useState({ mandatory: [], optional: [] });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const cert = certificates.find(c => (c.id || c._id) === id || (c.id || c._id) === parseInt(id));
    if (cert) {
      console.log('Loading certificate data:', cert);
      // Format dates to YYYY-MM-DD for date inputs
      const formatDate = (dateString) => {
        if (!dateString) return "";
        
        try {
          // Check if date is in DD/MM/YYYY format (common for this app)
          if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              return `${year}-${month}-${day}`;
            }
          }
          
          // Try to create a date object from the string (ISO format)
          const date = new Date(dateString);
          
          // Check if it's a valid date
          if (isNaN(date.getTime())) {
            console.warn('Invalid date string received:', dateString);
            return "";
          }
          
          // Adjust for timezone to ensure consistent date
          const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
          const formattedDate = localDate.toISOString().split('T')[0];
          
          console.log('Formatting date:', {
            original: dateString,
            parsed: date.toISOString(),
            formatted: formattedDate
          });
          
          return formattedDate;
        } catch (error) {
          console.error('Error formatting date:', dateString, error);
          return "";
        }
      };

      setFormData({
        certificate: cert.certificate || "",
        category: cert.category || "Professional Development",
        description: cert.description || cert.certificate || "",
        issueDate: formatDate(cert.issueDate),
        expiryDate: formatDate(cert.expiryDate),
        profileName: cert.profileName || "",
        approvalStatus: cert.status || "",
        isInterim: cert.isInterim === true || cert.isInterim === "true" || cert.isInterim === "True" ? "Yes" : "No",
        fileRequired: cert.fileRequired || "",
        timeLogged: {
          days: cert.timeLogged?.days || "0",
          hours: cert.timeLogged?.hours || "0",
          minutes: cert.timeLogged?.minutes || "0"
        },
        supplier: cert.provider || cert.supplier || "",
        totalCost: cert.cost || cert.totalCost || "",
        archived: cert.archived || "Unarchived"
      });
    }
  }, [id, certificates]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(buildApiUrl('/suppliers'));
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
        console.log('Suppliers loaded:', data);
      } else {
        console.error('Failed to fetch suppliers:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleSupplierSearch = async (searchTerm) => {
    try {
      const response = await fetch(buildApiUrl(`/suppliers/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      } else {
        console.error('Failed to search suppliers:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
    }
  };

  const handleAddSupplier = async (supplierName) => {
    try {
      const response = await fetch(buildApiUrl('/suppliers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: supplierName }),
      });
      
      if (response.ok) {
        const newSupplier = await response.json();
        console.log('New supplier added:', newSupplier);
        // Update suppliers list
        fetchSuppliers();
        // Update form
        setFormData(prev => ({ ...prev, supplier: supplierName }));
      } else {
        console.error('Failed to add supplier:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('timeLogged.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        timeLogged: {
          ...prev.timeLogged,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Update certificate with new data - mapping to certificate page fields
    const formatDateForSubmit = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date for submission:', dateString);
          return null;
        }
        // Return ISO string for proper backend parsing
        return date.toISOString();
      } catch (error) {
        console.error('Error formatting date for submission:', dateString, error);
        return null;
      }
    };

    const updatedCert = {
      certificate: formData.certificate,
      category: formData.category, // Required field for backend validation
      description: formData.description,
      issueDate: formatDateForSubmit(formData.issueDate),
      expiryDate: formatDateForSubmit(formData.expiryDate),
      profileName: formData.profileName || "N/A", // This should come from form
      provider: formData.supplier,
      fileRequired: formData.fileRequired,
      active: "Yes", // Default active status
      status: formData.approvalStatus,
      cost: formData.totalCost,
      // Additional fields for backend
      approvalStatus: formData.approvalStatus,
      isInterim: formData.isInterim === "Yes",
      timeLogged: formData.timeLogged,
      supplier: formData.supplier,
      totalCost: formData.totalCost,
      archived: formData.archived
    };

    try {
      console.log('Attempting to update certificate with data:', updatedCert);
      await updateCertificate(id, updatedCert);
      success('Changes saved successfully!');
      navigate(`/viewcertificate/${id}`);
    } catch (err) {
      console.error('Failed to update certificate:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Failed to save changes. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = `Failed to save changes: ${err.response.data.message}`;
      }
      
      error(errorMessage);
      // Don't navigate on error - stay on edit page so user can try again
    }
  };

  const handleCancel = () => {
    navigate(`/viewcertificate/${id}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Edit Certificate</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white space-y-6">
        {/* Account */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Account</label>
          <div className="col-span-8">
            <input
              type="text"
              value="Vitrux Ltd"
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-50"
            />
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Name</label>
          <div className="col-span-10">
            <input
              type="text"
              name="certificate"
              value={formData.certificate}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Description</label>
          <div className="col-span-10">
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        {/* Issue Date */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Issue Date</label>
          <div className="col-span-10">
            <DatePicker
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              placeholder="Select issue date"
              className="w-full"
            />
          </div>
        </div>

        {/* Expiry Date */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Expiry Date</label>
          <div className="col-span-10">
            <DatePicker
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              placeholder="Select expiry date"
              className="w-full"
            />
          </div>
        </div>

        {/* Profile Name */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Profile Name</label>
          <div className="col-span-10">
            <input
              type="text"
              name="profileName"
              value={formData.profileName}
              onChange={handleChange}
              placeholder="Enter profile name"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Approval Status */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Approval Status</label>
          <div className="col-span-10">
            <Select
              value={formData.approvalStatus}
              onValueChange={(value) => handleChange({ target: { name: 'approvalStatus', value } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Is Interim */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Is Interim</label>
          <div className="col-span-10">
            <Select
              value={formData.isInterim}
              onValueChange={(value) => handleChange({ target: { name: 'isInterim', value } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* File Required */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">File Required</label>
          <div className="col-span-10">
            <Select
              value={formData.fileRequired}
              onValueChange={(value) => handleChange({ target: { name: 'fileRequired', value } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="True">True</SelectItem>
                <SelectItem value="False">False</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        
        {/* Supplier */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Supplier</label>
          <div className="col-span-10">
            <SearchableDropdown
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              options={suppliers}
              placeholder="Type to search suppliers or add new..."
              onSearch={handleSupplierSearch}
              onAddNew={handleAddSupplier}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can type to search existing suppliers or add a new one
            </p>
          </div>
        </div>

        {/* Total Cost */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Total Cost</label>
          <div className="col-span-10">
            <input
              type="text"
              name="totalCost"
              value={formData.totalCost}
              onChange={handleChange}
              placeholder="Enter total cost of the certificate"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Archived */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <label className="col-span-2 text-right font-medium">Archived</label>
          <div className="col-span-10">
            <Select
              value={formData.archived}
              onValueChange={(value) => handleChange({ target: { name: 'archived', value } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unarchived">Unarchived</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
