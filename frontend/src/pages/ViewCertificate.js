// src/pages/ViewCertificate.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCertificates } from '../context/CertificateContext';
import { formatDateDDMMYY } from '../utils/dateFormatter';
import { buildApiUrl } from "../utils/apiConfig";
import { useAlert } from "../components/AlertNotification";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ViewCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error, warning } = useAlert();
  const {
    certificates,
    deleteCertificate,
    updateCertificateWithFile,
    uploadCertificateFile,
  } = useCertificates();

  const [certificate, setCertificate] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteCertDialog, setShowDeleteCertDialog] = useState(false);
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);

  useEffect(() => {
    const cert = certificates.find(
      (c) => (c.id || c._id) === id || (c.id || c._id) === parseInt(id)
    );
    if (cert) {
      setCertificate(cert);
      setLoading(false);
    } else if (certificates.length > 0) {
      // If certificates are loaded but certificate not found, try fetching individual certificate
      fetchIndividualCertificate();
    }
  }, [id, certificates]);

  const fetchIndividualCertificate = async () => {
    try {
      setLoading(true);
      const url = buildApiUrl(`/certificates/${id}`);
      console.log('Fetching individual certificate from:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const cert = await response.json();
        console.log('Individual certificate fetched successfully:', cert);
        setCertificate(cert);
      } else {
        console.error('Failed to fetch certificate:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching individual certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return formatDateDDMMYY(date);
  };

  const handleDeleteCertificate = async () => {
    try {
      await deleteCertificate(certificate.id || certificate._id);
      navigate("/certificates");
    } catch (err) {
      console.error("Failed to delete certificate:", err);
      error("Failed to delete certificate. Please try again.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        warning("File size exceeds 10MB limit. Please select a smaller file.");
        e.target.value = "";
        return;
      }
      if (
        file.type === "application/pdf" ||
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/jpg"
      ) {
        setSelectedFile(file);
      } else {
        warning("Please select a PDF, JPEG, or PNG file only.");
        e.target.value = "";
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      warning("Please select a file first.");
      return;
    }
    const certificateId = certificate?.id || certificate?._id;
    if (!certificateId) {
      error("Certificate ID not found. Please refresh the page and try again.");
      return;
    }

    setUploading(true);
    try {
      const updatedCertificate = await uploadCertificateFile(
        certificateId,
        selectedFile
      );
      setCertificate(updatedCertificate);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("certificateFileInput");
      if (fileInput) fileInput.value = "";

      success("Certificate file updated successfully!");
    } catch (err) {
      console.error("Failed to upload certificate file:", err);
      error("Failed to upload certificate file. " + (err.message || "Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    setUploading(true);
      try {
        const certificateId = certificate.id || certificate._id;
        const deleteUrl = buildApiUrl(`/certificates/${certificateId}/file`);
        
        console.log('Deleting certificate file from:', deleteUrl);
        
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete file');
        }

        const data = await response.json();
        
        // Update the certificate state to remove file data
        setCertificate(prev => ({
          ...prev,
          certificateFile: null,
          fileData: null,
          fileSize: null,
          mimeType: null
        }));
        
        success("Certificate file deleted successfully!");
      } catch (err) {
        console.error("Failed to delete certificate file:", err);
        error("Failed to delete certificate file: " + (err.message || "Please try again."));
      } finally {
        setUploading(false);
      }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-4">Loading certificate...</h2>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Certificate not found</h2>
          <p className="text-gray-600 mb-4">The certificate you're looking for doesn't exist or has been deleted.</p>
          <Link to="/certificates" className="text-blue-600 hover:underline">
            Back to Certificate Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">View Certificate</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (certificate.profileName) {
                navigate("/profiles");
              } else {
                warning("Profile information not available");
              }
            }}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            View profile
          </button>
          <button
            onClick={() => navigate("/dashboard/createcertificate", { 
              state: { 
                profileId: certificate.profileId?._id || certificate.profileId,
                profile: certificate.profileId 
              } 
            })}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Add another certificate
          </button>
          <Link
            to={`/editcertificate/${certificate.id || certificate._id}`}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Edit certificate
          </Link>
          <button
            onClick={() => setShowDeleteCertDialog(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete certificate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Certificate Details */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">{certificate.certificate}</h2>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Certificate:</span>
                  <span className="font-medium">{certificate.certificate}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Issued:</span>
                  <span className="font-medium">{formatDate(certificate.issueDate)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Created On:</span>
                  <span className="font-medium">{formatDate(certificate.createdOn)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Last Updated:</span>
                  <span className="font-medium">{formatDate(certificate.updatedOn)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Updated by:</span>
                  <span className="font-medium">System Administrator</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Issue Date:</span>
                  <span className="font-medium">{formatDate(certificate.issueDate)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Expiry Date:</span>
                  <span className="font-medium">{formatDate(certificate.expiryDate)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Archived:</span>
                  <span className="font-medium">{certificate.archived || "No"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Approval Status:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      certificate.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : certificate.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {certificate.status}
                  </span>
                </div>
              </div>
            </div>

            {certificate.description && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600 text-sm">{certificate.description}</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium text-gray-800 mb-2">Provider Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium">{certificate.provider || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">£{certificate.cost || "0.00"}</span>
                </div>
              </div>
            </div>

            {certificate.profileName && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium text-gray-800 mb-2">Profile Information</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">VTID:</span>
                    <span className="font-medium">{certificate.profileId?.vtid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profile Name:</span>
                    <span className="font-medium">{certificate.profileName}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - File Upload/Actions */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {certificate.certificateFile ? (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    Current file:{" "}
                    {certificate.certificateFile?.originalname ||
                      certificate.certificate?.replace(/[^a-zA-Z0-9]/g, "_")}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Added: {formatDate(certificate.createdOn)}
                  </p>
                  <div className="flex gap-2 justify-center mb-4">
                    <button
                      onClick={() => {
                        const fileUrl = buildApiUrl(`/certificates/${certificate.id || certificate._id}/file`);
                        window.open(fileUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      View Certificate
                    </button>
                    <button
                      onClick={() => setShowDeleteFileDialog(true)}
                      disabled={uploading}
                      className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      {uploading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600 mb-4">No certificate file uploaded</p>
              )}

              <div className="mb-4">
                <input
                  id="certificateFileInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="certificateFileInput"
                  className="inline-block px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                >
                  Choose File (PDF, JPG, PNG)
                </label>
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-2">Selected: {selectedFile.name}</p>
                )}
              </div>

              {selectedFile && (
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading
                    ? "Uploading..."
                    : certificate.certificateFile
                    ? "Update File"
                    : "Upload File"}
                </button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-gray-800 mb-2">File Requirements</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Required:</span>
                  <span className="font-medium">{certificate.fileRequired || "Yes"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium">{certificate.active || "Yes"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          to="/certificates"
          className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          ← Back to Certificates
        </Link>
      </div>

      {/* Delete Certificate Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteCertDialog}
        onOpenChange={setShowDeleteCertDialog}
        title="Delete Certificate"
        description={`Are you sure you want to delete the certificate "${certificate?.certificate}"? This action cannot be undone.`}
        onConfirm={handleDeleteCertificate}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Delete File Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteFileDialog}
        onOpenChange={setShowDeleteFileDialog}
        title="Delete Certificate File"
        description="Are you sure you want to delete the certificate file? This action cannot be undone."
        onConfirm={handleDeleteFile}
        confirmText="Delete File"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
