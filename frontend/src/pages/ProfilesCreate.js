// src/pages/ProfilesCreate.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfiles } from "../context/ProfileContext";
import SearchableDropdown from "../components/SearchableDropdown";
import JobLevelDropdown from "../components/JobLevelDropdown";
import { DatePicker } from "../components/ui/date-picker";
import ProfilePictureUpload from "../components/ProfilePictureUpload";
import { getAllJobRoles } from "../data/certificateJobRoleMapping";
import { useAlert } from "../components/AlertNotification";
import { buildApiUrl } from "../utils/apiConfig";
import { validateTextOnly, validateNumberOnly, validatePhoneNumber, validateEmail, validateDateOfBirth, getMaxDOBDate } from "../utils/inputValidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function ProfilesCreate() {
  const { success, error } = useAlert();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    dob: "",
    company: "",
    jobTitle: [],
    jobLevel: "",
    mobile: "",
    language: "",
    startDate: "",
    staffType: "",
    poc: "",
    nationality: "",
    circetUIN: "",
    circetSCID: "",
    morrisonsIDNumber: "",
    morrisonsUIN: "",
    nopsID: "",
    status: "",
  });

  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [jobRoles, setJobRoles] = useState([]);
  const [jobLevels, setJobLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { addProfile, creating, uploadProfilePicture } = useProfiles();

  // Fetch job roles and levels on component mount
  useEffect(() => {
    fetchJobRoles();
    fetchJobLevels();
  }, []);

  // Use hardcoded job roles from certificateJobRoleMapping (93 roles)
  const fetchJobRoles = async () => {
    try {
      // Get the 93 hardcoded job roles from the mapping file
      const hardcodedRoles = getAllJobRoles();
      
      // Convert to the format expected by the component
      const formattedRoles = hardcodedRoles.map(roleName => ({
        name: roleName,
        _id: roleName, // Use role name as ID since we're not using database
        isActive: true
      }));
      
      // Sort roles alphabetically by name
      const sortedRoles = formattedRoles.sort((a, b) => a.name.localeCompare(b.name));
      
      setJobRoles(sortedRoles);
    } catch (error) {
      console.error('Error loading job roles:', error);
      setJobRoles([]);
    }
  };

  const fetchJobLevels = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(buildApiUrl('/job-levels'), {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job levels: ${response.status}`);
      }

      const data = await response.json();
      setJobLevels(data);
    } catch (error) {
      console.error('Error fetching job levels:', error);
      setJobLevels([]);
    } finally {
      setLoading(false);
    }
  };




  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleJobRoleChange = (jobRole) => {
    setFormData((prev) => {
      const currentJobRoles = prev.jobTitle || [];
      const isSelected = currentJobRoles.includes(jobRole);
      
      if (isSelected) {
        // Remove job role
        const updatedRoles = currentJobRoles.filter(role => role !== jobRole);
        return {
          ...prev,
          jobTitle: updatedRoles
        };
      } else {
        // Add job role
        const updatedRoles = [...currentJobRoles, jobRole];
        return {
          ...prev,
          jobTitle: updatedRoles
        };
      }
    });
  };


  const handleProfilePictureUpload = (file) => {
    setProfilePictureFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate date of birth if provided
    if (formData.dob) {
      const validation = validateDateOfBirth(formData.dob);
      if (!validation.isValid) {
        error(validation.message);
        return;
      }
    }
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      error('Please fill in all required fields: First Name, Last Name, and Email');
      return;
    }

    const newProfile = {
      role: formData.jobLevel || "User",
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      staffType: formData.staffType || "Direct",
      company: formData.company || "VitruX Ltd",
      jobTitle: Array.isArray(formData.jobTitle) ? formData.jobTitle : (formData.jobTitle ? [formData.jobTitle] : []),
      jobRole: Array.isArray(formData.jobTitle) ? formData.jobTitle : (formData.jobTitle ? [formData.jobTitle] : []),
      jobLevel: formData.jobLevel,
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile || "",
      dob: formData.dob || null,
      dateOfBirth: formData.dob || null,
      language: formData.language || "English",
      startDate: formData.startDate || null,
      poc: formData.poc || "",
      nationality: formData.nationality || "",
      circetUIN: formData.circetUIN || "",
      circetSCID: formData.circetSCID || "",
      morrisonsIDNumber: formData.morrisonsIDNumber || "",
      morrisonsUIN: formData.morrisonsUIN || "",
      nopsID: formData.nopsID || "",
      status: formData.status || "Onboarding",
      createdOn: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    try {
      const createdProfile = await addProfile(newProfile);
      
      if (profilePictureFile && createdProfile?._id) {
        try {
          setUploadingPicture(true);
          await uploadProfilePicture(createdProfile._id, profilePictureFile);
        } catch (uploadError) {
          console.error('Failed to upload profile picture:', uploadError);
        } finally {
          setUploadingPicture(false);
        }
      }
      
      success('Profile created successfully!');
      
      if (createdProfile && (createdProfile._id || createdProfile.id)) {
        navigate(`/profiles/${createdProfile._id || createdProfile.id}`);
      } else {
        // Fallback to profiles list
        navigate("/reporting/profiles");
      }
    } catch (err) {
      console.error('Failed to create profile:', err);
      console.error('Error details:', err.response?.data || err.message);
      console.log('Profile data that failed:', newProfile);
      
      // Show more specific error message
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      error(`Failed to create profile: ${errorMessage}`);
    }
  };

  const handleCancel = () => {
    navigate("/"); // Redirect to Dashboard on cancel
  };

  return (
    <div className="flex">
      {/* Main content */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-6">Profiles Create</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6 space-y-6 relative"
        >
          {/* Profile Picture Upload */}
          <div className="flex justify-center mb-6">
            <ProfilePictureUpload
              profilePicture={null}
              onUpload={handleProfilePictureUpload}
              firstName={formData.firstName}
              lastName={formData.lastName}
              uploading={uploadingPicture}
              size={120}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium">Account Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              placeholder="Account Email (required)"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              required
            />
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="firstName"
                placeholder="First Name (required)"
                value={formData.firstName}
                onChange={(e) => {
                  const validValue = validateTextOnly(e.target.value);
                  setFormData(prev => ({ ...prev, firstName: validValue }));
                }}
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name (required)"
                value={formData.lastName}
                onChange={(e) => {
                  const validValue = validateTextOnly(e.target.value);
                  setFormData(prev => ({ ...prev, lastName: validValue }));
                }}
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>
          </div>
          {/* Date of Birth & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Date of Birth</label>
              <DatePicker
                label="Date of birth"
                value={formData.dob}
                onChange={(date) => {
                  const dateValue = date ? date.format("DD/MM/YYYY") : "";
                  setFormData({ ...formData, dob: dateValue });
                  
                  // Validate date of birth when it changes
                  if (dateValue) {
                    const validation = validateDateOfBirth(dateValue);
                    if (!validation.isValid) {
                      setErrors(prev => ({ ...prev, dob: validation.message }));
                    } else {
                      setErrors(prev => ({ ...prev, dob: '' }));
                    }
                  } else {
                    // Clear error when field is cleared
                    setErrors(prev => ({ ...prev, dob: '' }));
                  }
                }}
                placeholder="dd/mm/yyyy"
                format="DD/MM/YYYY"
                className="mt-1 w-full h-[42px]"
                maxDate={getMaxDOBDate()}
              />
              {errors.dob && (
                <p className="text-red-500 text-sm mt-1">{errors.dob}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Company"
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
          </div>


          {/* Job Role & Job Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Job Roles</label>
              {loading ? (
                <div className="mt-1 block w-full border rounded p-2 bg-gray-50">
                  Loading job roles...
                </div>
              ) : (
                <>
                  {/* Searchable filter input */}
                  <input
                    type="text"
                    placeholder="Search job roles..."
                    className="w-full border rounded px-3 py-2 mb-3 text-sm"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase();
                      if (searchTerm) {
                        const filtered = getAllJobRoles().filter(role =>
                          role.toLowerCase().includes(searchTerm)
                        );
                        setJobRoles(filtered.map(role => ({ name: role, _id: role, isActive: true })));
                      } else {
                        // Reset to full list
                        const allRoles = getAllJobRoles();
                        setJobRoles(allRoles.map(role => ({ name: role, _id: role, isActive: true })));
                      }
                    }}
                  />
                  
                  {/* Checkbox grid */}
                  <div className="border rounded p-3 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-1 gap-2">
                      {jobRoles.map((role) => (
                        <label
                          key={role._id}
                          className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.jobTitle.includes(role.name)}
                            onChange={() => handleJobRoleChange(role.name)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Selected roles display */}
                  {formData.jobTitle.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Selected ({formData.jobTitle.length}):</div>
                      <div className="flex flex-wrap gap-1">
                        {formData.jobTitle.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                          >
                            {role}
                            <button
                              type="button"
                              onClick={() => handleJobRoleChange(role)}
                              className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-emerald-400 hover:bg-emerald-200 hover:text-emerald-600 focus:outline-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {jobRoles.length > 0 ? `${jobRoles.length} job roles available` : 'No job roles available'}. Select multiple roles using checkboxes.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium">Job Level</label>
              <JobLevelDropdown
                name="jobLevel"
                value={formData.jobLevel}
                onChange={handleChange}
                placeholder="Type to search job levels or add new..."
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can type to search existing job levels or add a new one
              </p>
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium">Mobile</label>
            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={(e) => {
                const validValue = validatePhoneNumber(e.target.value);
                setFormData(prev => ({ ...prev, mobile: validValue }));
              }}
              placeholder="Mobile number"
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-sm font-medium">Preferred Language</label>
            <Select
              value={formData.language}
              onValueChange={(value) => handleChange({ target: { name: 'language', value } })}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <DatePicker
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              placeholder="Select start date"
              className="mt-1"
            />
          </div>

          {/* Staff Type */}
          <div>
            <label className="block text-sm font-medium">Staff Type <span className="text-red-500">*</span></label>
            <Select
              value={formData.staffType}
              onValueChange={(value) => handleChange({ target: { name: 'staffType', value } })}
              required
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select Staff Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Contractor">Contractor</SelectItem>
                <SelectItem value="Agency">Agency</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* POC */}
          <div>
            <label className="block text-sm font-medium">POC (Point of Contact)</label>
            <input
              type="text"
              name="poc"
              value={formData.poc}
              onChange={handleChange}
              placeholder="Point of Contact"
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium">Nationality</label>
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={(e) => {
                const validValue = validateTextOnly(e.target.value);
                setFormData(prev => ({ ...prev, nationality: validValue }));
              }}
              placeholder="Nationality"
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          {/* Circet UIN & SCID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Circet UIN</label>
              <input
                type="text"
                name="circetUIN"
                value={formData.circetUIN}
                onChange={(e) => {
                  const validValue = validateNumberOnly(e.target.value);
                  setFormData(prev => ({ ...prev, circetUIN: validValue }));
                }}
                placeholder="Circet UIN (numbers only)"
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Circet SCID</label>
              <input
                type="text"
                name="circetSCID"
                value={formData.circetSCID}
                onChange={(e) => {
                  const validValue = validateNumberOnly(e.target.value);
                  setFormData(prev => ({ ...prev, circetSCID: validValue }));
                }}
                placeholder="Circet SCID (numbers only)"
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
          </div>

          {/* Morrisons ID & UIN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Morrisons ID Number</label>
              <input
                type="text"
                name="morrisonsIDNumber"
                value={formData.morrisonsIDNumber}
                onChange={handleChange}
                placeholder="Morrisons ID Number"
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Morrisons UIN</label>
              <input
                type="text"
                name="morrisonsUIN"
                value={formData.morrisonsUIN}
                onChange={handleChange}
                placeholder="Morrisons UIN"
                className="mt-1 block w-full border rounded p-2"
              />
            </div>
          </div>

          {/* NOPS ID */}
          <div>
            <label className="block text-sm font-medium">NOPS ID</label>
            <input
              type="text"
              name="nopsID"
              value={formData.nopsID}
              onChange={handleChange}
              placeholder="NOPS ID"
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium">Status <span className="text-red-500">*</span></label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange({ target: { name: 'status', value } })}
              required
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Onboarded">Onboarded</SelectItem>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
                <SelectItem value="Dropped Out">Dropped Out</SelectItem>
                <SelectItem value="Left">Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creating Profile...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
