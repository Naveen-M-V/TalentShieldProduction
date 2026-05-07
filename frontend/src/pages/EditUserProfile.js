import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProfiles } from "../context/ProfileContext";
import MultiJobRoleSelector from '../components/MultiJobRoleSelector';
import { useAlert } from "../components/AlertNotification";
import { DatePicker } from '../components/ui/date-picker';
import dayjs from 'dayjs';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function EditUserProfile() {
  console.log('EditUserProfile component loaded');
  
  const { success, error, warning } = useAlert();
  const [activeTab, setActiveTab] = useState("Profile Details");
  const [profileLoading, setProfileLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    
    // Profile Details
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    dateOfBirth: "",
    gender: "",
    jobRole: [],
    jobLevel: "",
    language: "English",
    company: "Vitrux Ltd",
    staffType: "",
    nationality: "",
    status: "",
    poc: "",
    startDate: "",
    
    // Emergency Contact
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    
    // Address
    address: {
      line1: "",
      line2: "",
      city: "",
      postCode: "",
      country: "",
    },
    
    // Extra Information
    externalSystemId: "",
    extThirdPartySystemId: "",
    nopsId: "",
    nopsID: "",
    insuranceNumber: "",
    circetUIN: "",
    circetSCID: "",
    morrisonsIDNumber: "",
    morrisonsUIN: "",
    bio: "",
    otherInformation: "",
  });
  
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProfileById, updateProfile, deleteProfile } = useProfiles();

  const tabs = ["Profile Details", "Employment Info", "System IDs", "Emergency Contact", "Profile Address", "Extra Information"];

  useEffect(() => {
    console.log('EditUserProfile useEffect triggered with id:', id);
    
    if (!id) {
      console.log('No ID provided, redirecting to profiles');
      navigate('/profiles');
      return;
    }

    async function loadProfile() {
      console.log('EditUserProfile mounted with ID:', id);
      setProfileLoading(true);
      try {
        console.log('Fetching profile from backend...');
        const profile = await fetchProfileById(id);
        console.log('Profile from backend:', profile);
        
        if (!profile) {
          console.error('Profile not found');
          error('Profile not found. Redirecting to profiles list.');
          navigate('/profiles');
          return;
        }
        
        // Populate form data with all fields
        setFormData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          mobile: profile.mobile || "",
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
          gender: profile.gender || "",
          jobRole: Array.isArray(profile.jobRole) ? profile.jobRole : (profile.jobRole ? [profile.jobRole] : []),
          jobLevel: profile.jobLevel || "",
          language: profile.language || "English",
          company: profile.company || "Vitrux Ltd",
          staffType: profile.staffType || "",
          nationality: profile.nationality || "",
          status: profile.status || "",
          poc: profile.poc || "",
          startDate: profile.startDate ? new Date(profile.startDate).toISOString().split('T')[0] : "",
          emergencyContact: {
            name: profile.emergencyContact?.name || "",
            relationship: profile.emergencyContact?.relationship || "",
            phone: profile.emergencyContact?.phone || "",
          },
          address: {
            line1: profile.address?.line1 || "",
            line2: profile.address?.line2 || "",
            city: profile.address?.city || "",
            postCode: profile.address?.postCode || "",
            country: profile.address?.country || "",
          },
          externalSystemId: profile.externalSystemId || "",
          extThirdPartySystemId: profile.extThirdPartySystemId || "",
          nopsId: profile.nopsId || profile.nopsID || "",
          nopsID: profile.nopsId || profile.nopsID || "",
          insuranceNumber: profile.insuranceNumber || "",
          circetUIN: profile.circetUIN || "",
          circetSCID: profile.circetSCID || "",
          morrisonsIDNumber: profile.morrisonsIDNumber || "",
          morrisonsUIN: profile.morrisonsUIN || "",
          bio: profile.bio || "",
          otherInformation: profile.otherInformation || "",
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        error(err.message === 'Profile not found' ? 
          'Profile not found. Redirecting to profiles page.' : 
          'Failed to load profile. Please try again or contact support.');
        navigate('/profiles');
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e, section = null) => {
    const { name, value } = e.target;
    
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
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
    setLoading(true);
    
    try {
      // Transform form data to match API expectations
      const profileData = {
        ...formData,
        // Ensure job roles are array
        jobRole: Array.isArray(formData.jobRole) ? formData.jobRole : [],
        // Convert date strings to proper format
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        // Ensure nested objects are properly structured
        address: {
          line1: formData.address?.line1 || '',
          line2: formData.address?.line2 || '',
          city: formData.address?.city || '',
          postCode: formData.address?.postCode || '',
          country: formData.address?.country || ''
        },
        emergencyContact: {
          name: formData.emergencyContact?.name || '',
          relationship: formData.emergencyContact?.relationship || '',
          phone: formData.emergencyContact?.phone || ''
        }
      };
      
      console.log('Submitting profile update:', profileData);
      await updateProfile(id, profileData);
      
      success('Profile updated successfully!');
      navigate(`/profiles/${id}`);
    } catch (err) {
      console.error("Failed to update profile:", err);
      error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
      try {
        const response = await deleteProfile(id);
        
        // Show detailed success message
        const certCount = response.details?.certificatesDeleted || 0;
        if (certCount > 0) {
          success(`Profile and ${certCount} associated certificate(s) deleted successfully!`);
        } else {
          success('Profile deleted successfully!');
        }
        
        navigate("/reporting/profiles");
      } catch (err) {
        console.error("Failed to delete profile:", err);
        error('Failed to delete profile. Please try again.');
      } finally {
        setLoading(false);
      }
  };

  const handleCancel = () => {
    navigate(`/profiles/${id}`);
  };

  // Show loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-1/4 bg-white shadow p-4">
        <h2 className="font-semibold mb-4">Edit Profile</h2>
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer px-3 py-2 rounded ${
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
      <div className="flex-1 bg-white shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{activeTab}</h3>

        <form onSubmit={handleSubmit}>
          {/* Profile Details */}
          {activeTab === "Profile Details" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
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
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth || null}
                  onChange={(date) => handleChange({ target: { name: 'dateOfBirth', value: date ? date.format('YYYY-MM-DD') : '' } })}
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange({ target: { name: 'gender', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label htmlFor="jobRole" className="block text-sm font-medium text-gray-700 mb-2">Job Roles (Select Multiple)</label>
                <MultiJobRoleSelector
                  name="jobRole"
                  value={formData.jobRole}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="jobLevel" className="block text-sm font-medium text-gray-700 mb-1">Job Level</label>
                <Select
                  value={formData.jobLevel}
                  onValueChange={(value) => handleChange({ target: { name: 'jobLevel', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Job Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operative">Operative</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Director">Director</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Associate">Associate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleChange({ target: { name: 'language', value } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="Polish">Polish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Company"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                <input
                  id="nationality"
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="e.g., British, American, Polish"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Employment Info */}
          {activeTab === "Employment Info" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="staffType" className="block text-sm font-medium text-gray-700 mb-2">Staff Type</label>
                <Select
                  value={formData.staffType}
                  onValueChange={(value) => handleChange({ target: { name: 'staffType', value } })}
                >
                  <SelectTrigger className="w-full">
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
                    <SelectItem value="Onboarded">Onboarded</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Dropped Out">Dropped Out</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="poc" className="block text-sm font-medium text-gray-700 mb-2">Point of Contact (POC)</label>
                <input
                  id="poc"
                  type="text"
                  name="poc"
                  value={formData.poc}
                  onChange={handleChange}
                  placeholder="Enter POC name"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate || null}
                  onChange={(date) => handleChange({ target: { name: 'startDate', value: date ? date.format('YYYY-MM-DD') : '' } })}
                />
              </div>
            </div>
          )}

          {/* System IDs */}
          {activeTab === "System IDs" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="circetUIN" className="block text-sm font-medium text-gray-700 mb-2">Circet UIN</label>
                <input
                  id="circetUIN"
                  type="text"
                  name="circetUIN"
                  value={formData.circetUIN}
                  onChange={handleChange}
                  placeholder="Enter Circet UIN"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="circetSCID" className="block text-sm font-medium text-gray-700 mb-2">Circet SCID</label>
                <input
                  id="circetSCID"
                  type="text"
                  name="circetSCID"
                  value={formData.circetSCID}
                  onChange={handleChange}
                  placeholder="Enter Circet SCID"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="morrisonsIDNumber" className="block text-sm font-medium text-gray-700 mb-1">Morrisons ID Number</label>
                <input
                  id="morrisonsIDNumber"
                  type="text"
                  name="morrisonsIDNumber"
                  value={formData.morrisonsIDNumber}
                  onChange={handleChange}
                  placeholder="Enter Morrisons ID Number"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="morrisonsUIN" className="block text-sm font-medium text-gray-700 mb-1">Morrisons UIN</label>
                <input
                  id="morrisonsUIN"
                  type="text"
                  name="morrisonsUIN"
                  value={formData.morrisonsUIN}
                  onChange={handleChange}
                  placeholder="Enter Morrisons UIN"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="nopsId" className="block text-sm font-medium text-gray-700 mb-1">NOPS ID</label>
                <input
                  id="nopsId"
                  type="text"
                  name="nopsId"
                  value={formData.nopsId || formData.nopsID}
                  onChange={(e) => {
                    handleChange(e);
                    setFormData(prev => ({ ...prev, nopsID: e.target.value }));
                  }}
                  placeholder="Enter NOPS ID"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="insuranceNumber" className="block text-sm font-medium text-gray-700 mb-1">Insurance Number</label>
                <input
                  id="insuranceNumber"
                  type="text"
                  name="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={handleChange}
                  placeholder="Insurance Number"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="externalSystemId" className="block text-sm font-medium text-gray-700 mb-1">External System ID</label>
                <input
                  id="externalSystemId"
                  type="text"
                  name="externalSystemId"
                  value={formData.externalSystemId}
                  onChange={handleChange}
                  placeholder="External System ID"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="extThirdPartySystemId" className="block text-sm font-medium text-gray-700 mb-1">Third Party System ID</label>
                <input
                  id="extThirdPartySystemId"
                  type="text"
                  name="extThirdPartySystemId"
                  value={formData.extThirdPartySystemId}
                  onChange={handleChange}
                  placeholder="Third Party System ID"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {activeTab === "Emergency Contact" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="emergencyName" className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  id="emergencyName"
                  type="text"
                  name="name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleChange(e, 'emergencyContact')}
                  placeholder="Contact Name"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                <input
                  id="relationship"
                  type="text"
                  name="relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleChange(e, 'emergencyContact')}
                  placeholder="Relationship"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  id="emergencyPhone"
                  type="tel"
                  name="phone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleChange(e, 'emergencyContact')}
                  placeholder="Phone Number"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Profile Address */}
          {activeTab === "Profile Address" && (
            <div className="space-y-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  id="addressLine1"
                  type="text"
                  name="line1"
                  value={formData.address.line1}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="Address Line 1"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  id="addressLine2"
                  type="text"
                  name="line2"
                  value={formData.address.line2}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="Address Line 2"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.address.city}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="City"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label htmlFor="postCode" className="block text-sm font-medium text-gray-700 mb-1">Post Code</label>
                <input
                  id="postCode"
                  type="text"
                  name="postCode"
                  value={formData.address.postCode}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="Post Code"
                  className="border p-2 rounded w-full"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  id="country"
                  type="text"
                  name="country"
                  value={formData.address.country}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="Country"
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          )}

          {/* Extra Information */}
          {activeTab === "Extra Information" && (
            <div className="space-y-4 flex flex-col">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">User Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="User Bio"
                  className="border p-2 rounded h-24 w-full"
                />
              </div>
              <div>
                <label htmlFor="otherInformation" className="block text-sm font-medium text-gray-700 mb-1">Other Information</label>
                <textarea
                  id="otherInformation"
                  name="otherInformation"
                  value={formData.otherInformation}
                  onChange={handleChange}
                  placeholder="Other Information"
                  className="border p-2 rounded h-24 w-full"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Profile"}
          </button>
        </div>
      </div>

      {/* Delete Profile Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Profile"
        description="Are you sure you want to delete this profile? This will also delete ALL certificates associated with this profile. This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete Profile"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
